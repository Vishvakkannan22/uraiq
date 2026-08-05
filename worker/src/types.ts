/// <reference types="@cloudflare/workers-types" />

/**
 * Every binding and variable the Worker can see.
 *
 * R2 and Queues are deliberately absent: media sharing is a later milestone,
 * and the notification fan-out that would have used a queue is a documented
 * TODO in services/realtime.service.ts rather than a binding that fails to
 * deploy. Adding either back is a wrangler.jsonc entry plus a field here.
 */
export interface Env {
  DB: D1Database
  KV: KVNamespace
  CONVERSATION: DurableObjectNamespace
  /* Optional so the Worker still boots if the binding is removed; the
     moderation service falls back to its rule net. */
  AI?: Ai

  JWT_SECRET: string
  ALLOWED_ORIGINS: string
  ACCESS_TTL_SECONDS: string
  REFRESH_TTL_SECONDS: string
  LOG_LEVEL?: string
}

/* ----------------------------------------------------------------- rows
   Database shapes. Snake_case, exactly as D1 returns them. Never sent to a
   client — see the DTOs below. */

export interface UserRow {
  id: string
  email: string
  email_norm: string
  password_hash: string
  password_salt: string
  password_iter: number
  status: 'active' | 'suspended' | 'deleted'
  created_at: number
  updated_at: number
}

export interface ProfileRow {
  user_id: string
  handle: string
  handle_norm: string
  display_name: string
  bio: string | null
  avatar_gradient: string
  initials: string
  last_seen_at: number | null
}

export interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  body: string | null
  reply_to_id: string | null
  client_id: string | null
  moderation_state: 'clear' | 'flagged' | 'blocked'
  moderation_standard: string | null
  delivered_at: number | null
  created_at: number
  edited_at: number | null
  deleted_at: number | null
}

export interface ConversationRow {
  id: string
  direct_key: string
  created_by: string
  last_message_id: string | null
  last_message_at: number | null
  created_at: number
  updated_at: number
}

export interface MemberRow {
  conversation_id: string
  user_id: string
  unread_count: number
  archived: number
  muted_until: number | null
  joined_at: number
}

/* ----------------------------------------------------------------- DTOs
   The shapes the client actually receives. Kept separate from the rows so a
   column rename never becomes a breaking API change. */

export interface PublicUser {
  id: string
  handle: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  avatarGradient: string
  initials: string
  lastSeenAt: number | null
  online: boolean
}

export interface MessageDTO {
  id: string
  conversationId: string
  senderId: string
  kind: 'text'
  body: string | null
  replyToId: string | null
  attachments: never[]
  moderationState: MessageRow['moderation_state']
  deliveredAt: number | null
  createdAt: number
  editedAt: number | null
  deletedAt: number | null
  clientId: string | null
}

export interface ConversationDTO {
  id: string
  type: 'direct'
  peer: PublicUser
  lastMessage: MessageDTO | null
  unreadCount: number
  muted: boolean
  archived: boolean
  updatedAt: number
}

/* ----------------------------------------------------------- moderation */

export type Severity = 'clear' | 'guidance' | 'blocked'

export interface ModerationResult {
  severity: Severity
  standard: string | null
  reason: string | null
  suggestions: string[]
}

/* ------------------------------------------------------ request context */

export interface AuthContext {
  userId: string
}

export interface RequestContext {
  env: Env
  ctx: ExecutionContext
  request: Request
  url: URL
  params: Record<string, string>
  /* Null on public routes. `requireAuth` narrows this for everything else, so
     a handler that reaches for `auth.userId` after it has run is safe. */
  auth: AuthContext | null
  requestId: string
}
