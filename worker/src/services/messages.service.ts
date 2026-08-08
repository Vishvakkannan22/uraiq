import type { Env, MessageDTO, MessageRow, ModerationResult } from '../types'
import type { Db } from '../db/client'
import type { Logger } from '../utils/logger'
import * as messages from '../db/messages.repo'
import * as receipts from '../db/receipts.repo'
import * as conversationsRepo from '../db/conversations.repo'
import { badRequest, forbidden, notFound } from '../utils/errors'
import { ulid } from '../utils/ids'
import { MAX_MESSAGE_LENGTH } from '../config'
import { assertMember } from './conversations.service'
import { moderate } from './moderation.service'
import { broadcast, notifyInbox } from './realtime.service'
import { findPeerId } from '../db/conversations.repo'

/**
 * Row -> DTO.
 *
 * `attachments` is always empty and `kind` always 'text' in this milestone.
 * Both are present so the client's rendering path does not have to change when
 * media lands — the field appears, the shape does not.
 */
export function toMessageDTO(row: MessageRow): MessageDTO {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    kind: 'text',
    /* A deleted message keeps its row so replies and ordering survive, but the
       body never leaves the database again. */
    body: row.deleted_at ? null : row.body,
    replyToId: row.reply_to_id,
    attachments: [],
    moderationState: row.moderation_state,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    clientId: row.client_id,
  }
}

export interface MessagePage {
  messages: MessageDTO[]
  nextCursor: string | null
  peerLastReadMessageId: string | null
  peerLastReadAt: number | null
}

export async function listPage(
  db: Db,
  conversationId: string,
  userId: string,
  limit: number,
  before: string | null
): Promise<MessagePage> {
  await assertMember(db, conversationId, userId)

  /* My own clear-chat boundary has to be known before the page query runs —
     it is a bind parameter, not something to reconcile after the fact — so it
     goes in the same parallel batch as the peer's read cursor rather than
     after it. */
  const [clearedRow, peerCursor] = await Promise.all([
    conversationsRepo.getClearedCursor(db, conversationId, userId),
    receipts.findPeerCursor(db, conversationId, userId),
  ])

  const rows = await messages.listPage(
    db,
    conversationId,
    limit,
    before,
    clearedRow?.cleared_before_id ?? null
  )

  return {
    /* Query is newest-first so the cursor is the oldest row; the client renders
       oldest-first, so reverse here rather than in the component. */
    messages: rows.map(toMessageDTO).reverse(),
    nextCursor: rows.length === limit ? rows[rows.length - 1].id : null,
    peerLastReadMessageId: peerCursor?.last_read_message_id ?? null,
    peerLastReadAt: peerCursor?.last_read_at ?? null,
  }
}

export type SendResult =
  | { status: 'blocked'; moderation: ModerationResult }
  | { status: 'sent'; message: MessageDTO; moderation: ModerationResult | null; duplicate: boolean }

/**
 * Send a message.
 *
 * Moderation runs *before* persistence. A blocked message is never written and
 * never delivered — the sender gets the verdict and suggested rewrites instead.
 * That ordering is the product: moderating after the write would mean the
 * recipient's socket has already seen it.
 */
export async function send(
  env: Env,
  db: Db,
  ctx: ExecutionContext,
  args: {
    conversationId: string
    senderId: string
    body: string
    replyToId: string | null
    clientId: string | null
  },
  logger: Logger
): Promise<SendResult> {
  const { conversationId, senderId } = args
  await assertMember(db, conversationId, senderId)

  const text = args.body.trim()
  if (!text) throw badRequest('Message is empty')
  if (text.length > MAX_MESSAGE_LENGTH) throw badRequest('Message is too long')

  /* Idempotency first, before moderation: a retry after a flaky response must
     return the original message rather than re-running the classifier and
     possibly reaching a different verdict on the same text. */
  if (args.clientId) {
    const existing = await messages.findByClientId(db, senderId, args.clientId)
    if (existing) {
      return { status: 'sent', message: toMessageDTO(existing), moderation: null, duplicate: true }
    }
  }

  if (args.replyToId) {
    const parent = await messages.findInConversation(db, args.replyToId, conversationId)
    /* A reply pointing outside this conversation would leak that a message
       exists elsewhere, and renders as a dangling quote. */
    if (!parent) throw badRequest('Cannot reply to that message')
  }

  const verdict = await moderate(env, text, logger)

  if (verdict.severity === 'blocked') {
    logger.info('message blocked', { conversationId, standard: verdict.standard })
    return { status: 'blocked', moderation: verdict }
  }

  const id = ulid()
  const now = Date.now()

  await messages.insert(db, {
    id,
    conversationId,
    senderId,
    body: text,
    replyToId: args.replyToId,
    clientId: args.clientId,
    moderationState: verdict.severity === 'guidance' ? 'flagged' : 'clear',
    moderationStandard: verdict.standard,
    now,
  })

  const row = await messages.findById(db, id)
  if (!row) throw notFound('Message could not be saved')
  const dto = toMessageDTO(row)

  /* Fan-out must not sit on the sender's response — the message is durable the
     moment the write above committed. */
  ctx.waitUntil(broadcast(env, conversationId, { type: 'message', message: dto }, logger))

  /* The conversation room only reaches a socket that has *this* thread open.
     The recipient's inbox reaches them wherever they are in the app, which is
     what lets "delivered" fire without them opening this specific chat. */
  const peer = await findPeerId(db, conversationId, senderId)
  if (peer) {
    ctx.waitUntil(
      notifyInbox(env, peer.user_id, { type: 'message', message: dto }, logger)
    )
  }

  logger.info('message sent', {
    conversationId,
    messageId: id,
    flagged: verdict.severity === 'guidance',
  })

  return {
    status: 'sent',
    message: dto,
    moderation: verdict.severity === 'guidance' ? verdict : null,
    duplicate: false,
  }
}

export type EditResult =
  | { status: 'blocked'; moderation: ModerationResult }
  | { status: 'sent'; message: MessageDTO }

/**
 * An edit is a new delivery, so it goes through moderation exactly as a send
 * does. Skipping it would make editing a trivial bypass: send something
 * innocuous, then edit it into what you actually meant.
 */
export async function edit(
  env: Env,
  db: Db,
  ctx: ExecutionContext,
  args: { conversationId: string; messageId: string; userId: string; body: string },
  logger: Logger
): Promise<EditResult> {
  const row = await messages.findInConversation(db, args.messageId, args.conversationId)
  if (!row) throw notFound('Message not found')
  if (row.sender_id !== args.userId) throw forbidden('You can only edit your own messages')
  if (row.deleted_at) throw badRequest('That message was deleted')

  const text = args.body.trim()
  if (!text) throw badRequest('Message is empty')
  if (text.length > MAX_MESSAGE_LENGTH) throw badRequest('Message is too long')

  const verdict = await moderate(env, text, logger)
  if (verdict.severity === 'blocked') {
    return { status: 'blocked', moderation: verdict }
  }

  await messages.update(
    db,
    args.messageId,
    text,
    Date.now(),
    verdict.severity === 'guidance' ? 'flagged' : 'clear',
    verdict.standard
  )

  const updated = await messages.findById(db, args.messageId)
  if (!updated) throw notFound('Message not found')
  const dto = toMessageDTO(updated)

  ctx.waitUntil(
    broadcast(env, args.conversationId, { type: 'message.updated', message: dto }, logger)
  )
  return { status: 'sent', message: dto }
}

export async function remove(
  env: Env,
  db: Db,
  ctx: ExecutionContext,
  args: { conversationId: string; messageId: string; userId: string },
  logger: Logger
): Promise<void> {
  const row = await messages.findInConversation(db, args.messageId, args.conversationId)
  if (!row) throw notFound('Message not found')
  if (row.sender_id !== args.userId) throw forbidden('You can only delete your own messages')

  await messages.softDelete(db, args.messageId, Date.now())

  ctx.waitUntil(
    broadcast(
      env,
      args.conversationId,
      { type: 'message.deleted', messageId: args.messageId },
      logger
    )
  )
  logger.info('message deleted', { conversationId: args.conversationId, messageId: args.messageId })
}

export async function markRead(
  env: Env,
  db: Db,
  ctx: ExecutionContext,
  args: { conversationId: string; userId: string; lastReadMessageId: string },
  logger: Logger
): Promise<{ readAt: number }> {
  await assertMember(db, args.conversationId, args.userId)

  /* Verify the message is actually in this conversation before advancing the
     cursor: an arbitrary id would move it to a position with no meaning, and
     because the cursor only ever moves forward, that is not recoverable. */
  const target = await messages.findInConversation(db, args.lastReadMessageId, args.conversationId)
  if (!target) throw badRequest('That message is not in this conversation')

  const readAt = Date.now()
  await receipts.markRead(db, args.conversationId, args.userId, args.lastReadMessageId, readAt)

  ctx.waitUntil(
    broadcast(
      env,
      args.conversationId,
      { type: 'read', userId: args.userId, lastReadMessageId: args.lastReadMessageId, readAt },
      logger
    )
  )

  return { readAt }
}

/**
 * Stamp delivery for messages the recipient's device has acknowledged.
 *
 * Called from the Durable Object when a socket reports receipt, and on connect
 * for anything that arrived while they were away. Delivered is distinct from
 * read: it means the device has the message, not that a human saw it.
 */
export async function markDelivered(
  env: Env,
  db: Db,
  conversationId: string,
  recipientId: string,
  messageIds: string[],
  logger: Logger
): Promise<{ messageIds: string[]; deliveredAt: number } | null> {
  if (messageIds.length === 0) return null

  /* Only ever stamp messages sent *to* this user. Without this filter a client
     could mark its own outgoing messages delivered and fake a read state. */
  const rows = await messages.findMany(db, messageIds)
  const deliverable = rows
    .filter((r) => r.conversation_id === conversationId && r.sender_id !== recipientId && !r.delivered_at)
    .map((r) => r.id)

  if (deliverable.length === 0) return null

  const deliveredAt = Date.now()
  await messages.markDelivered(db, deliverable, deliveredAt)
  logger.debug('messages delivered', { conversationId, count: deliverable.length })

  return { messageIds: deliverable, deliveredAt }
}

/** Everything sent to this user in this conversation that is not yet stamped. */
export async function pendingDelivery(
  db: Db,
  conversationId: string,
  recipientId: string
): Promise<string[]> {
  const rows = await messages.findUndelivered(db, conversationId, recipientId)
  return rows.map((r) => r.id)
}

/**
 * Stamp delivery for every undelivered message addressed to this user, across
 * every conversation they are in — the inbox socket's connect-time catch-up.
 *
 * Grouped by conversation because that is the unit the caller broadcasts in:
 * each sender's open thread (if any) needs its own `delivered` event on its
 * own Durable Object.
 */
export async function markDeliveredForUser(
  db: Db,
  userId: string,
  logger: Logger
): Promise<{ conversationId: string; messageIds: string[]; deliveredAt: number }[]> {
  const rows = await messages.findUndeliveredForUser(db, userId)
  if (rows.length === 0) return []

  const deliveredAt = Date.now()
  await messages.markDelivered(
    db,
    rows.map((r) => r.id),
    deliveredAt
  )
  logger.debug('messages delivered (inbox catch-up)', { userId, count: rows.length })

  const byConversation = new Map<string, string[]>()
  for (const r of rows) {
    const list = byConversation.get(r.conversation_id)
    if (list) list.push(r.id)
    else byConversation.set(r.conversation_id, [r.id])
  }

  return [...byConversation].map(([conversationId, messageIds]) => ({
    conversationId,
    messageIds,
    deliveredAt,
  }))
}
