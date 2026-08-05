import type { ConversationDTO, Env, MessageRow, ProfileRow } from '../types'
import type { Db } from '../db/client'
import type { Logger } from '../utils/logger'
import * as conversations from '../db/conversations.repo'
import * as messages from '../db/messages.repo'
import * as users from '../db/users.repo'
import { badRequest, forbidden, notFound } from '../utils/errors'
import { directKey, ulid } from '../utils/ids'
import { toMessageDTO } from './messages.service'
import { toPublicUser } from './presence.service'

export async function list(env: Env, db: Db, userId: string): Promise<ConversationDTO[]> {
  const rows = await conversations.listForUser(db, userId)
  if (rows.length === 0) return []

  const peerIds = [...new Set(rows.map((r) => r.peer_id))]
  const lastIds = rows.map((r) => r.last_message_id).filter((id): id is string => Boolean(id))

  /* Two batched lookups for the whole page rather than two per row. */
  const [profiles, lastMessages] = await Promise.all([
    users.findProfiles(db, peerIds),
    messages.findMany(db, lastIds),
  ])

  const profileById = new Map(profiles.map((p) => [p.user_id, p]))
  const messageById = new Map(lastMessages.map((m) => [m.id, m]))

  /* Peer deleted: skip rather than render a row with no name or avatar. */
  const visible = rows
    .map((row) => ({ row, profile: profileById.get(row.peer_id) }))
    .filter((entry): entry is { row: typeof rows[number]; profile: ProfileRow } =>
      Boolean(entry.profile)
    )

  /* Resolved in parallel. `toPublicUser` does a KV read for presence, and
     awaiting it inside the loop made a 50-conversation list 50 sequential
     round trips — the list got linearly slower with every conversation the
     user had, which is exactly backwards. */
  const peers = await Promise.all(visible.map(({ profile }) => toPublicUser(env, profile)))

  return visible.map(({ row }, index) => {
    const last = row.last_message_id ? messageById.get(row.last_message_id) : null
    return {
      id: row.id,
      type: 'direct',
      peer: peers[index],
      lastMessage: last ? toMessageDTO(last) : null,
      unreadCount: row.unread_count,
      muted: Boolean(row.muted_until && row.muted_until > Date.now()),
      archived: Boolean(row.archived),
      updatedAt: row.last_message_at ?? row.updated_at,
    }
  })
}

/**
 * Idempotent create.
 *
 * The unique index on `direct_key` means two people opening the same thread at
 * the same moment converge on one row. The insert is followed by a re-read
 * rather than trusting the generated id, because a concurrent insert may have
 * won the conflict and the canonical row is then the other one.
 */
export async function createDirect(
  env: Env,
  db: Db,
  userId: string,
  peerId: string,
  logger: Logger
): Promise<{ conversation: ConversationDTO; created: boolean }> {
  if (peerId === userId) throw badRequest('You cannot start a conversation with yourself')

  const peer = await users.findActiveProfile(db, peerId)
  if (!peer) throw notFound('That account does not exist')

  const key = directKey(userId, peerId)

  const existing = await conversations.findByDirectKey(db, key)
  if (existing) {
    return { conversation: await hydrate(env, db, existing.id, userId, peer), created: false }
  }

  await conversations.createDirect(db, {
    id: ulid(),
    directKey: key,
    creatorId: userId,
    peerId,
    now: Date.now(),
  })

  const row = await conversations.findByDirectKey(db, key)
  if (!row) throw notFound('Could not open that conversation')

  logger.info('conversation created', { conversationId: row.id, peerId })
  return { conversation: await hydrate(env, db, row.id, userId, peer), created: true }
}

export async function getOne(
  env: Env,
  db: Db,
  conversationId: string,
  userId: string
): Promise<ConversationDTO> {
  /* Membership and peer lookup are independent, so they go together. The
     membership check still gates everything — the peer id is simply already in
     hand by the time it passes, rather than costing another round trip. */
  const [member, peerId] = await Promise.all([
    conversations.isMember(db, conversationId, userId),
    conversations.findPeerId(db, conversationId, userId),
  ])

  if (!member) throw forbidden('Not a member of this conversation')
  if (!peerId) throw notFound()

  const peer = await users.findProfile(db, peerId.user_id)
  if (!peer) throw notFound('That account no longer exists')

  return hydrate(env, db, conversationId, userId, peer)
}

/** Membership is the authorisation check for every conversation-scoped route. */
export async function assertMember(db: Db, conversationId: string, userId: string): Promise<void> {
  const member = await conversations.isMember(db, conversationId, userId)
  if (!member) throw forbidden('Not a member of this conversation')
}

async function hydrate(
  env: Env,
  db: Db,
  conversationId: string,
  userId: string,
  peer: ProfileRow
): Promise<ConversationDTO> {
  /* The member row (D1) and the peer's presence (KV) are unrelated lookups. */
  const [view, publicPeer] = await Promise.all([
    conversations.findForMember(db, conversationId, userId),
    toPublicUser(env, peer),
  ])

  /* This one genuinely depends on the row above — the id comes from it. */
  let lastMessage: MessageRow | null = null
  if (view?.last_message_id) {
    lastMessage = await messages.findById(db, view.last_message_id)
  }

  return {
    id: conversationId,
    type: 'direct',
    peer: publicPeer,
    lastMessage: lastMessage ? toMessageDTO(lastMessage) : null,
    unreadCount: view?.unread_count ?? 0,
    muted: Boolean(view?.muted_until && view.muted_until > Date.now()),
    archived: Boolean(view?.archived),
    updatedAt: view?.last_message_at ?? view?.updated_at ?? Date.now(),
  }
}
