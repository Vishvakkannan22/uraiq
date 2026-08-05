import type { Db } from './client'

/**
 * Read cursors, one row per (conversation, member).
 *
 * A cursor rather than a per-message receipt table: in a 1:1 thread "read up to
 * here" is all the information there is, and it turns an unbounded write per
 * message into one upsert per read event.
 */

export interface ReadReceiptRow {
  conversation_id: string
  user_id: string
  last_read_message_id: string
  last_read_at: number
}

/**
 * Advance the cursor and zero the unread counter.
 *
 * The `WHERE excluded.last_read_message_id > read_receipts.last_read_message_id`
 * guard on the upsert is what stops an out-of-order or replayed request walking
 * the cursor backwards and un-reading messages. It works because ULIDs sort
 * lexicographically by creation time.
 */
export function markRead(
  db: Db,
  conversationId: string,
  userId: string,
  lastReadMessageId: string,
  at: number
) {
  return db.batch('receipts.markRead', [
    db
      .prepare(
        `INSERT INTO read_receipts
           (conversation_id, user_id, last_read_message_id, last_read_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (conversation_id, user_id)
         DO UPDATE SET last_read_message_id = ?3, last_read_at = ?4
          WHERE excluded.last_read_message_id > read_receipts.last_read_message_id`
      )
      .bind(conversationId, userId, lastReadMessageId, at),
    db
      .prepare(
        `UPDATE conversation_members SET unread_count = 0
          WHERE conversation_id = ?1 AND user_id = ?2`
      )
      .bind(conversationId, userId),
  ])
}

/** The other member's cursor — what the sender needs to render read ticks. */
export function findPeerCursor(db: Db, conversationId: string, userId: string) {
  return db.first<ReadReceiptRow>(
    'receipts.findPeerCursor',
    db
      .prepare(
        `SELECT * FROM read_receipts
          WHERE conversation_id = ?1 AND user_id != ?2
          LIMIT 1`
      )
      .bind(conversationId, userId)
  )
}
