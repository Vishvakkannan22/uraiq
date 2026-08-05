import type { Db } from './client'
import { CONVERSATION_LIST_LIMIT } from '../config'

/** One row of the conversation list: the conversation, my counters, the peer. */
export interface ConversationListRow {
  id: string
  last_message_id: string | null
  last_message_at: number | null
  updated_at: number
  unread_count: number
  archived: number
  muted_until: number | null
  peer_id: string
}

/**
 * The whole list in one query.
 *
 * The self-join on conversation_members pulls the peer's id in the same row as
 * my own counters, so a 200-conversation list is one D1 round trip rather than
 * one plus N. Only the last-message bodies need a second, batched lookup.
 */
export function listForUser(db: Db, userId: string) {
  return db.all<ConversationListRow>(
    'conversations.list',
    db
      .prepare(
        `SELECT c.id, c.last_message_id, c.last_message_at, c.updated_at,
                m.unread_count, m.archived, m.muted_until,
                peer.user_id AS peer_id
           FROM conversation_members m
           JOIN conversations c ON c.id = m.conversation_id
           JOIN conversation_members peer
                ON peer.conversation_id = c.id AND peer.user_id != m.user_id
          WHERE m.user_id = ?1
          ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC
          LIMIT ?2`
      )
      .bind(userId, CONVERSATION_LIST_LIMIT)
  )
}

export function findByDirectKey(db: Db, directKey: string) {
  return db.first<{ id: string }>(
    'conversations.findByDirectKey',
    db.prepare('SELECT id FROM conversations WHERE direct_key = ?1').bind(directKey)
  )
}

export interface MemberViewRow {
  last_message_id: string | null
  last_message_at: number | null
  updated_at: number
  unread_count: number
  archived: number
  muted_until: number | null
}

export function findForMember(db: Db, conversationId: string, userId: string) {
  return db.first<MemberViewRow>(
    'conversations.findForMember',
    db
      .prepare(
        `SELECT c.last_message_id, c.last_message_at, c.updated_at,
                m.unread_count, m.archived, m.muted_until
           FROM conversations c
           JOIN conversation_members m
                ON m.conversation_id = c.id AND m.user_id = ?2
          WHERE c.id = ?1`
      )
      .bind(conversationId, userId)
  )
}

export function isMember(db: Db, conversationId: string, userId: string) {
  return db.first<{ one: number }>(
    'conversations.isMember',
    db
      .prepare(
        'SELECT 1 AS one FROM conversation_members WHERE conversation_id = ?1 AND user_id = ?2'
      )
      .bind(conversationId, userId)
  )
}

export function findPeerId(db: Db, conversationId: string, userId: string) {
  return db.first<{ user_id: string }>(
    'conversations.findPeer',
    db
      .prepare(
        'SELECT user_id FROM conversation_members WHERE conversation_id = ?1 AND user_id != ?2'
      )
      .bind(conversationId, userId)
  )
}

/**
 * Create a direct conversation and both memberships in one batch.
 *
 * The conflict target repeats the index predicate on purpose:
 * `idx_conversations_direct_key` is a PARTIAL unique index
 * (`WHERE direct_key IS NOT NULL`), and SQLite will not match a bare
 * `ON CONFLICT (direct_key)` against a partial index — it fails at runtime with
 * "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint".
 *
 * Two people opening the same thread at once therefore converge on one row
 * instead of racing. The caller re-reads by `direct_key` afterwards rather than
 * trusting the id it generated, because the other insert may have won.
 */
export function createDirect(
  db: Db,
  args: { id: string; directKey: string; creatorId: string; peerId: string; now: number }
) {
  return db.batch('conversations.create', [
    db
      .prepare(
        `INSERT INTO conversations (id, direct_key, created_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?4)
         ON CONFLICT (direct_key) WHERE direct_key IS NOT NULL DO NOTHING`
      )
      .bind(args.id, args.directKey, args.creatorId, args.now),
    db
      .prepare(
        `INSERT INTO conversation_members (conversation_id, user_id, joined_at)
         VALUES (?1, ?2, ?3) ON CONFLICT DO NOTHING`
      )
      .bind(args.id, args.creatorId, args.now),
    db
      .prepare(
        `INSERT INTO conversation_members (conversation_id, user_id, joined_at)
         VALUES (?1, ?2, ?3) ON CONFLICT DO NOTHING`
      )
      .bind(args.id, args.peerId, args.now),
  ])
}
