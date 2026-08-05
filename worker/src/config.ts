/**
 * Every tunable in one place.
 *
 * These are constants rather than `vars` because changing one is a code change
 * that wants review — a rate limit or a page size edited in the dashboard is a
 * production change with no diff and no rollback.
 */

/* ------------------------------------------------------------------ auth */

/** OWASP 2023 floor for PBKDF2-SHA256. Stored per row so it can be raised. */
export const PBKDF2_ITERATIONS = 210_000

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 200
export const MIN_NAME_LENGTH = 2
export const MAX_NAME_LENGTH = 60
export const MAX_BIO_LENGTH = 280
export const MAX_HANDLE_LENGTH = 24

export const DEFAULT_ACCESS_TTL_SECONDS = 900
export const DEFAULT_REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30

/* -------------------------------------------------------------- messages */

export const MESSAGE_PAGE_SIZE = 50
export const MESSAGE_PAGE_MAX = 100
export const MAX_MESSAGE_LENGTH = 8_000
export const CONVERSATION_LIST_LIMIT = 200

/* ------------------------------------------------------------- searching */

/** Below this a prefix search matches most of the table. */
export const MIN_SEARCH_LENGTH = 2
export const SEARCH_LIMIT = 20

/* ------------------------------------------------------------------- KV */

/** Presence, refreshed by the socket heartbeat. Longer than the heartbeat. */
export const PRESENCE_TTL_SECONDS = 90
/** Last-seen outlives the online flag, because the UI falls back to it. */
export const LAST_SEEN_TTL_SECONDS = 60 * 60 * 24 * 7
export const PROFILE_CACHE_TTL_SECONDS = 300
/** Verified access tokens. Must never exceed the token's own lifetime. */
export const SESSION_CACHE_TTL_SECONDS = 300

/* --------------------------------------------------------- rate limiting
   Fixed windows. Authenticated routes are keyed by user id, so one noisy
   client cannot spend another's budget.

   Unauthenticated routes have no user to key on, and keying them purely by IP
   is coarser than it looks: a university, an office, or a mobile carrier
   behind CGNAT is ONE address for thousands of people. A tight per-IP signup
   limit does not stop a determined attacker (who rotates addresses) and does
   lock out a whole campus — which, for a product whose test accounts are
   @campus.edu, is the wrong way round.

   So: per-IP limits here are set to catch crude hammering, not to be the
   primary control, and login is additionally keyed by the email being tried so
   credential-stuffing one account is throttled without affecting anyone else
   on the same network.

   TODO before launch: put Cloudflare Turnstile in front of signup. That is the
   control that actually distinguishes a human from a script; a per-IP counter
   is a speed bump. */

export interface RateLimitRule {
  limit: number
  windowSeconds: number
}

export const RATE_LIMITS = {
  /** Per email address — protects one account from credential stuffing. */
  loginPerAccount: { limit: 10, windowSeconds: 300 },
  /** Per IP — loose, because a shared address is many real people. */
  loginPerIp: { limit: 100, windowSeconds: 300 },
  signup: { limit: 20, windowSeconds: 3600 },
  refresh: { limit: 60, windowSeconds: 300 },
  sendMessage: { limit: 60, windowSeconds: 60 },
  moderate: { limit: 120, windowSeconds: 60 },
  search: { limit: 40, windowSeconds: 60 },
  write: { limit: 120, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>

/* --------------------------------------------------------------- retry */

export const D1_RETRY_ATTEMPTS = 3
export const D1_RETRY_BASE_MS = 40

/* ----------------------------------------------------------- websocket */

/** A socket silent for longer than this is assumed dead by the client. */
export const HEARTBEAT_INTERVAL_MS = 25_000
