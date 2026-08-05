/// <reference types="@cloudflare/workers-types" />
import type { Env } from '../types'
import type { ClientEvent, PresenceEntry, ServerEvent } from './protocol'
import { decode, encode } from './protocol'
import { resolveToken } from '../auth/session'
import { createDb } from '../db/client'
import { createLogger } from '../utils/logger'
import { markOffline, markOnline } from '../services/presence.service'
import { markDelivered, pendingDelivery } from '../services/messages.service'
import * as conversations from '../db/conversations.repo'
import * as receipts from '../db/receipts.repo'

interface SocketAttachment {
  userId: string
  conversationId: string
}

/**
 * One Durable Object per conversation: the single point of coordination for
 * sockets, typing, presence, delivery and read receipts in that thread.
 *
 * Uses the WebSocket Hibernation API (`acceptWebSocket` plus the `webSocket*`
 * handlers) rather than holding sockets in memory with `addEventListener`.
 * Hibernated sockets survive the object being evicted, so an idle room costs
 * nothing while a conversation nobody has closed stays connected. The per-socket
 * identity rides in the serialized attachment, so it is still there when the
 * object wakes with no memory of the handshake.
 */
export class ConversationRoom implements DurableObject {
  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    /* Server-to-object broadcast from the REST layer after a write. Reachable
       only through the DO binding, never from the internet. */
    if (url.pathname.endsWith('/broadcast')) {
      const event = (await request.json()) as ServerEvent
      this.broadcast(event)
      return new Response(null, { status: 204 })
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 })
    }

    /* Browsers cannot set headers on a WebSocket handshake, so the JWT arrives
       as a subprotocol: "bearer, <token>". A query string would end up in
       access logs and proxy history. */
    const protocols = request.headers.get('Sec-WebSocket-Protocol') ?? ''
    const token = protocols.split(',').map((p) => p.trim())[1]
    const auth = token ? await resolveToken(this.env, token) : null
    if (!auth) return new Response('Unauthorized', { status: 401 })

    const conversationId = url.searchParams.get('c') ?? ''
    const logger = createLogger(this.env, { component: 'ConversationRoom', conversationId })
    const db = createDb(this.env, logger)

    const member = await conversations.isMember(db, conversationId, auth.userId)
    if (!member) return new Response('Forbidden', { status: 403 })

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.state.acceptWebSocket(server)
    server.serializeAttachment({ userId: auth.userId, conversationId } satisfies SocketAttachment)

    await markOnline(this.env, auth.userId)
    this.broadcastExcept(server, {
      type: 'presence',
      userId: auth.userId,
      online: true,
      lastSeenAt: Date.now(),
    })

    /* Anything that arrived while this user was away is delivered the moment
       they reconnect — that is what makes "delivered" survive being offline
       rather than only working for people who were already watching. */
    const pending = await pendingDelivery(db, conversationId, auth.userId)
    if (pending.length > 0) {
      const result = await markDelivered(
        this.env,
        db,
        conversationId,
        auth.userId,
        pending,
        logger
      )
      if (result) {
        this.broadcastExcept(server, {
          type: 'delivered',
          messageIds: result.messageIds,
          deliveredAt: result.deliveredAt,
        })
      }
    }

    const peerCursor = await receipts.findPeerCursor(db, conversationId, auth.userId)

    server.send(
      encode({
        type: 'ready',
        conversationId,
        presence: this.currentPresence(auth.userId),
        peer: null,
      })
    )

    /* Replay the peer's read cursor so a freshly opened thread renders correct
       read ticks without waiting for the peer to read something new. */
    if (peerCursor) {
      server.send(
        encode({
          type: 'read',
          userId: peerCursor.user_id,
          lastReadMessageId: peerCursor.last_read_message_id,
          readAt: peerCursor.last_read_at,
        })
      )
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
      /* Must echo one offered protocol back, or the browser rejects the
         connection with no useful error. */
      headers: { 'Sec-WebSocket-Protocol': 'bearer' },
    })
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== 'string') return

    const event = decode(raw)
    if (!event) return

    const attachment = ws.deserializeAttachment() as SocketAttachment | null
    if (!attachment?.userId) return
    const { userId, conversationId } = attachment

    switch (event.type) {
      case 'ping':
        ws.send(encode({ type: 'pong', t: Number(event.t) || Date.now() }))
        /* Piggyback the presence refresh on the heartbeat the client already
           sends, rather than running a second timer that would wake the
           object on its own schedule. */
        await markOnline(this.env, userId)
        break

      case 'typing':
        this.broadcastExcept(ws, { type: 'typing', userId, typing: Boolean(event.typing) })
        break

      case 'read': {
        if (typeof event.lastReadMessageId !== 'string') return
        /* The DO only relays; the durable write happens on POST /read. Relaying
           here as well means the tick updates immediately instead of waiting
           for the HTTP round trip. */
        this.broadcastExcept(ws, {
          type: 'read',
          userId,
          lastReadMessageId: event.lastReadMessageId,
          readAt: Date.now(),
        })
        break
      }

      case 'delivered': {
        if (!Array.isArray(event.messageIds) || event.messageIds.length === 0) return
        const logger = createLogger(this.env, { component: 'ConversationRoom', conversationId })
        const db = createDb(this.env, logger)
        const result = await markDelivered(
          this.env,
          db,
          conversationId,
          userId,
          event.messageIds.slice(0, 200),
          logger
        )
        /* Tell the *sender*, not the acknowledging client. */
        if (result) {
          this.broadcastExcept(ws, {
            type: 'delivered',
            messageIds: result.messageIds,
            deliveredAt: result.deliveredAt,
          })
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
    const { userId } = attachment

    /* Only mark offline once the user's *last* socket in this room is gone —
       otherwise closing a second tab reports them as away while they are still
       reading in the first. */
    const stillHere = this.state
      .getWebSockets()
      .some((s) => s !== ws && (s.deserializeAttachment() as SocketAttachment | null)?.userId === userId)

    if (!stillHere) {
      await markOffline(this.env, userId)
      this.broadcast({ type: 'presence', userId, online: false, lastSeenAt: Date.now() })
    }
  }

  /** Everyone currently connected, deduplicated across a user's tabs. */
  private currentPresence(excludeUserId?: string): PresenceEntry[] {
    const seen = new Set<string>()
    const out: PresenceEntry[] = []

    for (const ws of this.state.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as SocketAttachment | null
      const userId = attachment?.userId
      if (!userId || userId === excludeUserId || seen.has(userId)) continue
      seen.add(userId)
      out.push({ userId, online: true, lastSeenAt: Date.now() })
    }

    return out
  }

  private broadcast(event: ServerEvent): void {
    const payload = encode(event)
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(payload)
      } catch {
        /* One dead socket is not worth failing the whole broadcast for; the
           close handler will clean it up. */
      }
    }
  }

  private broadcastExcept(exclude: WebSocket, event: ServerEvent): void {
    const payload = encode(event)
    for (const ws of this.state.getWebSockets()) {
      if (ws === exclude) continue
      try {
        ws.send(payload)
      } catch {
        /* ignore */
      }
    }
  }
}
