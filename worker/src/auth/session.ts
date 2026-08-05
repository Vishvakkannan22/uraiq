import type { AuthContext, Env } from '../types'
import { SESSION_CACHE_TTL_SECONDS } from '../config'
import { verifyJwt } from './jwt'
import { sha256 } from './password'

/**
 * Resolve the caller from an Authorization header.
 *
 * The KV session cache stores the *result* of a successful verification keyed
 * by a hash of the token, which turns a repeated PBKDF2-free-but-still-HMAC
 * verify into a single KV read. That is a small win on its own; the reason it
 * exists is that it gives us a place to force-invalidate a session (see
 * `revokeSession`) without adding a read to the uncached path.
 *
 * Tradeoff, stated plainly: an access token remains valid until it expires,
 * even after logout, unless it is explicitly revoked here. Access tokens live
 * 15 minutes. Refresh tokens are revoked immediately on logout, so the worst
 * case is a signed-out client that can still read for the remainder of one
 * access-token lifetime. The alternative — a KV lookup on every request — makes
 * every authenticated call pay for a case that is rare.
 */

const sessionKey = (tokenHash: string) => `session:${tokenHash}`
const revokedKey = (tokenHash: string) => `revoked:${tokenHash}`

export async function resolveAuth(env: Env, request: Request): Promise<AuthContext | null> {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null

  const token = header.slice(7).trim()
  if (!token) return null

  return resolveToken(env, token)
}

/**
 * Shared by the HTTP path and the WebSocket handshake, which cannot send an
 * Authorization header and passes the token as a subprotocol instead.
 */
export async function resolveToken(env: Env, token: string): Promise<AuthContext | null> {
  const tokenHash = await sha256(token)

  const [cached, revoked] = await Promise.all([
    env.KV.get(sessionKey(tokenHash)),
    env.KV.get(revokedKey(tokenHash)),
  ])
  if (revoked) return null
  if (cached) return { userId: cached }

  const payload = await verifyJwt(token, env.JWT_SECRET)
  if (!payload) return null

  /* Never cache past the token's own expiry: a cache entry that outlives the
     token would silently extend the session. */
  const remaining = Math.floor((payload.exp * 1000 - Date.now()) / 1000)
  const ttl = Math.min(SESSION_CACHE_TTL_SECONDS, remaining)
  /* KV rejects a TTL below 60s, and an entry that short is not worth a write. */
  if (ttl >= 60) {
    await env.KV.put(sessionKey(tokenHash), payload.sub, { expirationTtl: ttl })
  }

  return { userId: payload.sub }
}

/**
 * Invalidate one access token immediately.
 *
 * Called on logout with the presented token. The tombstone outlives the maximum
 * access-token lifetime so it cannot expire before the token it is blocking.
 */
export async function revokeSession(env: Env, token: string, accessTtlSeconds: number) {
  const tokenHash = await sha256(token)
  await Promise.all([
    env.KV.delete(sessionKey(tokenHash)),
    env.KV.put(revokedKey(tokenHash), '1', {
      expirationTtl: Math.max(60, accessTtlSeconds + 60),
    }),
  ])
}
