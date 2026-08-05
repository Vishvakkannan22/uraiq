/**
 * Backend configuration.
 *
 * Target: Cloudflare Workers (HTTP) + Durable Objects (WebSocket), JWT bearer.
 *
 * `VITE_API_URL` is the single switch. Leave it unset and every module in this
 * folder falls back to the local mocks, so the app keeps running before the
 * backend is reachable and during offline development. Set it and the same
 * call sites hit the real Worker with no component changes.
 */

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/** Derived rather than configured, so the two can never drift apart. */
export const WS_URL =
  import.meta.env.VITE_WS_URL || API_URL.replace(/^http/, 'ws')

export const LIVE = Boolean(API_URL)

/**
 * Generous on purpose. A timeout is never retried (see client.js), so this is
 * the single deadline a request gets — and cutting it short turns a slow-but-
 * working server into a failed request. 15s was too tight against a cold local
 * `wrangler dev`, which routinely takes longer than that on first hit.
 */
export const REQUEST_TIMEOUT = 30000
export const RETRY_ATTEMPTS = 2

/** Workers cold-start; the first attempt backs off further than later ones.
 *  Jitter is added at the call site so simultaneous failures do not retry in
 *  lockstep. */
export const RETRY_BACKOFF = [400, 1200]

export const TOKEN_KEY = 'uraiq.token'
export const REFRESH_KEY = 'uraiq.refresh'
/* The signed-in profile, cached so a reload knows whose messages are "mine"
   before /auth/me comes back. Not a credential — the token is the credential. */
export const USER_KEY = 'uraiq.user'
