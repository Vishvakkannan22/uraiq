import type { Env } from '../types'
import { DEFAULT_ACCESS_TTL_SECONDS, DEFAULT_REFRESH_TTL_SECONDS } from '../config'
import { ulid } from '../utils/ids'
import { signJwt } from './jwt'
import { newOpaqueToken, sha256 } from './password'

/**
 * Access + refresh token issuance and rotation.
 *
 * The refresh token is opaque and only its SHA-256 is stored, so a dump of the
 * refresh_tokens table cannot be replayed as a session. It rotates on every
 * use: presenting an already-rotated token fails, which is the signal that it
 * leaked.
 *
 * This is what keeps a user signed in across app restarts — the refresh token
 * lives 30 days in localStorage and buys a fresh 15-minute access token
 * whenever the client sees a 401.
 */

export interface IssuedSession {
  token: string
  refreshToken: string
  expiresIn: number
}

export function accessTtl(env: Env): number {
  return Number(env.ACCESS_TTL_SECONDS) || DEFAULT_ACCESS_TTL_SECONDS
}

export function refreshTtl(env: Env): number {
  return Number(env.REFRESH_TTL_SECONDS) || DEFAULT_REFRESH_TTL_SECONDS
}

export async function issueSession(env: Env, userId: string): Promise<IssuedSession> {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const ttl = accessTtl(env)

  const token = await signJwt({ sub: userId, iat: nowSeconds, exp: nowSeconds + ttl }, env.JWT_SECRET)

  const refreshToken = newOpaqueToken()
  await env.DB.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  )
    .bind(
      ulid(),
      userId,
      await sha256(refreshToken),
      Date.now() + refreshTtl(env) * 1000,
      Date.now()
    )
    .run()

  return { token, refreshToken, expiresIn: ttl }
}

export interface RefreshRow {
  id: string
  user_id: string
  expires_at: number
  revoked_at: number | null
}

export async function findRefreshToken(env: Env, refreshToken: string): Promise<RefreshRow | null> {
  return env.DB.prepare(
    `SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ?1`
  )
    .bind(await sha256(refreshToken))
    .first<RefreshRow>()
}

export async function revokeRefreshToken(env: Env, id: string): Promise<void> {
  await env.DB.prepare('UPDATE refresh_tokens SET revoked_at = ?1 WHERE id = ?2')
    .bind(Date.now(), id)
    .run()
}

export async function revokeRefreshTokenByValue(env: Env, refreshToken: string): Promise<void> {
  await env.DB.prepare('UPDATE refresh_tokens SET revoked_at = ?1 WHERE token_hash = ?2')
    .bind(Date.now(), await sha256(refreshToken))
    .run()
}

/** Every session for a user — used when logout arrives without a token. */
export async function revokeAllForUser(env: Env, userId: string): Promise<void> {
  await env.DB.prepare(
    'UPDATE refresh_tokens SET revoked_at = ?1 WHERE user_id = ?2 AND revoked_at IS NULL'
  )
    .bind(Date.now(), userId)
    .run()
}
