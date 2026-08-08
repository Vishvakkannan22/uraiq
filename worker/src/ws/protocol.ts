import type { MessageDTO, PublicUser } from '../types'

/**
 * The WebSocket wire protocol, shared by the Durable Object and the client.
 *
 * Every event carries a `type` and nothing else is implied by position, so a
 * new event can be added without breaking a client that does not know it —
 * clients switch on `type` and ignore the default case.
 *
 * The matching client implementation is src/lib/realtime/socket.js.
 */

/* ------------------------------------------------------- server -> client */

export type ServerEvent =
  /** First frame after a successful handshake. */
  | { type: 'ready'; conversationId: string; presence: PresenceEntry[]; peer: PublicUser | null }
  | { type: 'message'; message: MessageDTO }
  | { type: 'message.updated'; message: MessageDTO }
  | { type: 'message.deleted'; messageId: string }
  | { type: 'typing'; userId: string; typing: boolean }
  | { type: 'presence'; userId: string; online: boolean; lastSeenAt: number | null }
  /** The peer's device received these; not the same as having read them. */
  | { type: 'delivered'; messageIds: string[]; deliveredAt: number }
  | { type: 'read'; userId: string; lastReadMessageId: string; readAt: number }
  | { type: 'pong'; t: number }
  | { type: 'error'; code: string; message: string }

export interface PresenceEntry {
  userId: string
  online: boolean
  lastSeenAt: number | null
}

/* ------------------------------------------------------- client -> server */

export type ClientEvent =
  | { type: 'ping'; t?: number }
  | { type: 'typing'; typing: boolean }
  | { type: 'read'; lastReadMessageId: string }
  /**
   * Acknowledge receipt of specific messages, which stamps delivered_at.
   * `conversationId` is optional on a ConversationRoom socket — the room
   * already knows which conversation it is — but required on the inbox
   * socket, which spans every conversation a user is in and needs to be told
   * which Durable Object to relay the resulting `delivered` event to.
   */
  | { type: 'delivered'; messageIds: string[]; conversationId?: string }

export function encode(event: ServerEvent): string {
  return JSON.stringify(event)
}

export function decode(raw: string): ClientEvent | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof (parsed as { type?: unknown }).type !== 'string') return null
    return parsed as ClientEvent
  } catch {
    return null
  }
}
