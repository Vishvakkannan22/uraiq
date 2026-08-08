/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../types'
import type { ClientEvent, ServerEvent } from './protocol'
import { decode, encode } from './protocol'
import { resolveToken } from '../auth/session'
import { createDb } from '../db/client'
import { createLogger } from '../utils/logger'
import { markOffline, markOnline } from '../services/presence.service'
import { markDelivered, markDeliveredForUser } from '../services/messages.service'
import { broadcast } from '../services/realtime.service'

interface SocketAttachment {
  userId: string
}

/**
 * One Durable Object per *user* — every device/tab they have open, regardless
 * of which conversation (if any) is on screen.
 *
 * `ConversationRoom` alone cannot make "delivered" work without opening a
 * thread: a socket only exists there while that specific thread is mounted,
 * so a message landing while the recipient is on the chat list, or inside a
 * different conversation, has nobody to deliver it to. This object is that
 * missing always-on channel — it exists purely to know "is this user's app
 * reachable right now", and to turn a `message` push into a `delivered` stamp
 * without the recipient ever opening the thread it belongs to.
 *
 * It does not carry conversation history or typing/read state — those still
 * belong to `ConversationRoom`, which is broadcast to afterwards so an open
 * sender-side thread updates live too.
 */
export class UserInbox implements DurableObject {
  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    /* Server-to-object push from the REST layer after a send — see
       realtime.service.notifyInbox. Reachable only through the DO binding. */
    if (url.pathname.endsWith('/notify')) {
      const event = (await request.json()) as ServerEvent
      this.broadcast(event)
      return new Response(null, { status: 204 })
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 })
    }

    /* Same subprotocol handshake as ConversationRoom — see that file for why
       the token cannot travel as a header or a query string. */
    const protocols = request.headers.get('Sec-WebSocket-Protocol') ?? ''
    const token = protocols.split(',').map((p) => p.trim())[1]
    const auth = token ? await resolveToken(this.env, token) : null
    if (!auth) return new Response('Unauthorized', { status: 401 })

    /* The object is addressed by the userId in the URL — routing has to know
       which DO to reach before a token can be decoded. Verify the token
       actually belongs to that user, or anyone could listen on anyone else's
       inbox just by guessing an id. */
    const requestedUserId = url.searchParams.get('u') ?? ''
    if (auth.userId !== requestedUserId) return new Response('Forbidden', { status: 403 })

    const logger = createLogger(this.env, { component: 'UserInbox', userId: auth.userId })
    const db = createDb(this.env, logger)

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.state.acceptWebSocket(server)
    server.serializeAttachment({ userId: auth.userId } satisfies SocketAttachment)

    await markOnline(this.env, auth.userId)

    /* Catch up on everything that arrived while this user had no live socket
       anywhere — the inbox equivalent of ConversationRoom's connect-time
       catch-up, but spanning every conversation instead of just one. */
    const groups = await markDeliveredForUser(db, auth.userId, logger)
    for (const group of groups) {
      await broadcast(
        this.env,
        group.conversationId,
        { type: 'delivered', messageIds: group.messageIds, deliveredAt: group.deliveredAt },
        logger
      )
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: { 'Sec-WebSocket-Protocol': 'bearer' },
    })
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== 'string') return

    const event = decode(raw)
    if (!event) return

    const attachment = ws.deserializeAttachment() as SocketAttachment | null
    if (!attachment?.userId) return
    const { userId } = attachment

    switch (event.type) {
      case 'ping':
        ws.send(encode({ type: 'pong', t: Number(event.t) || Date.now() }))
        await markOnline(this.env, userId)
        break

      case 'delivered': {
        /* Unlike ConversationRoom, this socket is not scoped to one
           conversation, so the client must say which one a given ack belongs
           to. A push with no conversationId cannot be resolved to a room to
           relay into, so it is dropped rather than guessed at. */
        if (!isDeliveredEvent(event) || !event.conversationId) return
        if (event.messageIds.length === 0) return

        const logger = createLogger(this.env, { component: 'UserInbox', userId })
        const db = createDb(this.env, logger)
        const result = await markDelivered(
          this.env,
          db,
          event.conversationId,
          userId,
          event.messageIds.slice(0, 200),
          logger
        )
        if (result) {
          await broadcast(
            this.env,
            event.conversationId,
            { type: 'delivered', messageIds: result.messageIds, deliveredAt: result.deliveredAt },
            logger
          )
        }
        break
      }

      default:
        break
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleGone(ws)
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleGone(ws)
  }

  private async handleGone(ws: WebSocket): Promise<void> {
    const attachment = ws.deserializeAttachment() as SocketAttachment | null
    if (!attachment?.userId) return

    /* Every socket in this object belongs to the same user by construction —
       unlike ConversationRoom, there is no "still here under a different
       identity" case to filter for. */
    const stillHere = this.state.getWebSockets().some((s) => s !== ws)
    if (!stillHere) {
      await markOffline(this.env, attachment.userId)
    }
  }

  private broadcast(event: ServerEvent): void {
    const payload = encode(event)
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(payload)
      } catch {
        /* One dead socket is not worth failing the whole push for; the close
           handler will clean it up. */
      }
    }
  }
}

function isDeliveredEvent(
  event: ClientEvent
): event is Extract<ClientEvent, { type: 'delivered' }> {
  return event.type === 'delivered'
}
