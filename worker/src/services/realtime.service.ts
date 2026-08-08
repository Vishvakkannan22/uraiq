import type { Env } from '../types'
import type { ServerEvent } from '../ws/protocol'
import type { Logger } from '../utils/logger'

/**
 * Fan-out from the REST layer into a conversation's Durable Object.
 *
 * Every conversation maps to one DO by name, so `idFromName(conversationId)`
 * always reaches the same object regardless of which colo served the request.
 * That object owns the socket set — the REST handler never holds a socket.
 *
 * Broadcasts are best-effort by design. A message is durable the moment its D1
 * write commits; the socket push is an optimisation over the client's next
 * fetch. Failing a send because the fan-out failed would turn a cosmetic
 * problem into a lost message, so this logs and swallows.
 */
export async function broadcast(
  env: Env,
  conversationId: string,
  event: ServerEvent,
  logger?: Logger
): Promise<void> {
  try {
    const stub = env.CONVERSATION.get(env.CONVERSATION.idFromName(conversationId))
    await stub.fetch('https://conversation/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  } catch (err) {
    logger?.error('broadcast failed', err, { conversationId, event: event.type })
  }
}

/**
 * Fan-out from the REST layer into a user's inbox Durable Object — one per
 * recipient, independent of which conversation (if any) they have open.
 *
 * This is what makes "delivered" happen without the recipient opening the
 * specific thread a message landed in: their inbox socket is live wherever
 * they are in the app, receives the push, and acks it back. Same best-effort
 * contract as `broadcast` — the write already committed, this is optimisation.
 */
export async function notifyInbox(
  env: Env,
  userId: string,
  event: ServerEvent,
  logger?: Logger
): Promise<void> {
  try {
    const stub = env.INBOX.get(env.INBOX.idFromName(userId))
    await stub.fetch('https://inbox/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  } catch (err) {
    logger?.error('inbox notify failed', err, { userId, event: event.type })
  }
}

/**
 * TODO(push-notifications): when a message is sent and the recipient has no
 * live socket anywhere — the conversation room *and* the inbox both miss them
 * — they should get a native push.
 *
 * Not implemented because it needs a provider decision (Web Push / APNs / FCM)
 * and a device-token table, and because the queue that would have carried the
 * job is not part of this milestone's resources. Everything needed is already
 * available at the call site in messages.service.ts: conversationId, messageId
 * and the recipient's id.
 */
