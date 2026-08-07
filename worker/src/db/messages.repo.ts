import type { MessageRow } from '../types'
import type { Db } from './client'
import { placeholders } from './client'

/**
 * Keyset pagination on the ULID primary key.
 *
 * `WHERE id < ?cursor ORDER BY id DESC` walks one index in both directions, so
 * page 500 costs the same as page 1. An OFFSET query would re-scan every
 * skipped row and get slower as a conversation grows.
 *
 * `clearedBefore` is the viewer's own "clear chat" boundary, not a pagination
 * cursor: it excludes messages at or before the point they cleared, so a
 * cleared history stays hidden from them specifically no matter how far back
 * they page — while the other participant's query has no such bound and sees
 * everything, because the same rows are never touched for their side.
 */
export function listPage(
  db: Db,
  conversationId: string,
  limit: number,
  before: string | null,
  clearedBefore: string | null
) {
  const conditions = ['conversation_id = ?1']
  const binds: unknown[] = [conversationId]

  if (before) {
    binds.push(before)
    conditions.push(`id < ?${binds.length}`)
  }
  if (clearedBefore) {
    binds.push(clearedBefore)
    conditions.push(`id > ?${binds.length}`)
  }
  binds.push(limit)

  const sql = `SELECT * FROM messages WHERE ${conditions.join(' AND ')} ORDER BY id DESC LIMIT ?${binds.length}`
  return db.all<MessageRow>('messages.listPage', db.prepare(sql).bind(...binds))
}

export function findById(db: Db, messageId: string) {
  return db.first<MessageRow>(
    'messages.findById',
    db.prepare('SELECT * FROM messages WHERE id = ?1').bind(messageId)
  )
}

export function findInConversation(db: Db, messageId: string, conversationId: string) {
  return db.first<MessageRow>(
    'messages.findInConversation',
    db
      .prepare('SELECT * FROM messages WHERE id = ?1 AND conversation_id = ?2')
      .bind(messageId, conversationId)
  )
}

export function findMany(db: Db, ids: string[]) {
  if (ids.length === 0) return Promise.resolve([])
  return db.all<MessageRow>(
    'messages.findMany',
    db.prepare(`SELECT * FROM messages WHERE id IN (${placeholders(ids.length)})`).bind(...ids)
  )
}

/** Idempotency: a retried send returns the original row instead of a duplicate. */
export function findByClientId(db: Db, senderId: string, clientId: string) {
  return db.first<MessageRow>(
    'messages.findByClientId',
    db
      .prepare('SELECT * FROM messages WHERE sender_id = ?1 AND client_id = ?2')
      .bind(senderId, clientId)
  )
}

/**
 * Insert the message, move the conversation to the top, bump the recipient's
 * unread counter — atomically, so a failure cannot leave a message that the
 * list will never surface.
 *
 * Only the recipient's counter moves: the sender has by definition read it.
 */
export function insert(
  db: Db,
  m: {
    id: string
    conversationId: string
    senderId: string
    body: string
    replyToId: string | null
    clientId: string | null
    moderationState: MessageRow['moderation_state']
    moderationStandard: string | null
    now: number
  }
) {
  return db.batch('messages.insert', [
    db
      .prepare(
        `INSERT INTO messages
           (id, conversation_id, sender_id, body, reply_to_id, client_id,
            moderation_state, moderation_standard, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
      )
      .bind(
        m.id,
        m.conversationId,
        m.senderId,
        m.body,
        m.replyToId,
        m.clientId,
        m.moderationState,
        m.moderationStandard,
        m.now
      ),
    db
      .prepare(
        `UPDATE conversations
            SET last_message_id = ?1, last_message_at = ?2, updated_at = ?2
          WHERE id = ?3`
      )
      .bind(m.id, m.now, m.conversationId),
    db
      .prepare(
        `UPDATE conversation_members SET unread_count = unread_count + 1
          WHERE conversation_id = ?1 AND user_id != ?2`
      )
      .bind(m.conversationId, m.senderId),
  ])
}

export function update(
  db: Db,
  messageId: string,
  body: string,
  editedAt: number,
  moderationState: MessageRow['moderation_state'],
  moderationStandard: string | null
) {
  return db.run(
    'messages.update',
    db
      .prepare(
        `UPDATE messages
            SET body = ?1, edited_at = ?2, moderation_state = ?3, moderation_standard = ?4
          WHERE id = ?5`
      )
      .bind(body, editedAt, moderationState, moderationStandard, messageId)
  )
}

/**
 * Soft delete. The row anchors replies and read cursors, so it stays; the body
 * is cleared and never leaves the database again.
 */
export function softDelete(db: Db, messageId: string, at: number) {
  return db.run(
    'messages.softDelete',
    db.prepare('UPDATE messages SET deleted_at = ?1, body = NULL WHERE id = ?2').bind(at, messageId)
  )
}

/**
 * Stamp delivery once, when the recipient's socket first receives the message.
 *
 * `WHERE delivered_at IS NULL` makes this idempotent: a reconnect that replays
 * the acknowledgement cannot move the timestamp forward, so "delivered at"
 * means the first delivery rather than the most recent.
 */
export function markDelivered(db: Db, messageIds: string[], at: number) {
  if (messageIds.length === 0) return Promise.resolve([] as D1Result[])
  return db.batch('messages.markDelivered', [
    db
      .prepare(
        `UPDATE messages SET delivered_at = ?1
          WHERE delivered_at IS NULL AND id IN (${placeholders(messageIds.length, 1)})`
      )
      .bind(at, ...messageIds),
  ])
}

/**
 * Undelivered incoming messages, used when a socket connects to catch up on
 * anything that arrived while the recipient was offline.
 */
export function findUndelivered(db: Db, conversationId: string, recipientId: string) {
  return db.all<{ id: string }>(
    'messages.findUndelivered',
    db
      .prepare(
        `SELECT id FROM messages
          WHERE conversation_id = ?1 AND sender_id != ?2
            AND delivered_at IS NULL AND deleted_at IS NULL
          ORDER BY id DESC LIMIT 200`
      )
      .bind(conversationId, recipientId)
  )
}
