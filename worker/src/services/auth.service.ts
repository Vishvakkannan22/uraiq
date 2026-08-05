import type { Env, PublicUser } from '../types'
import type { Db } from '../db/client'
import type { Logger } from '../utils/logger'
import * as users from '../db/users.repo'
import { hashPassword, verifyPassword } from '../auth/password'
import { issueSession, findRefreshToken, revokeRefreshToken } from '../auth/tokens'
import { initialsFrom, ulid } from '../utils/ids'
import { conflict, unauthorized } from '../utils/errors'
import { MAX_HANDLE_LENGTH } from '../config'
import { cacheProfile, toPublicUser } from './presence.service'

export interface SessionResponse {
  token: string
  refreshToken: string
  expiresIn: number
  user: PublicUser
}

export async function signup(
  env: Env,
  db: Db,
  input: { email: string; emailNorm: string; password: string; displayName: string; handle?: string },
  logger: Logger
): Promise<SessionResponse> {
  if (await users.emailExists(db, input.emailNorm)) {
    throw conflict('That email is already registered')
  }

  const handle = deriveHandle(input.handle ?? input.email.split('@')[0])
  /* Collisions are common on email-derived handles, so suffix rather than
     reject — a signup failing because someone else has a similar address is a
     bad first experience. */
  const taken = await users.handleExists(db, handle.toLowerCase())
  const finalHandle = taken ? `${handle}${Math.floor(Math.random() * 9000 + 1000)}` : handle

  const { hash, salt, iterations } = await hashPassword(input.password)
  const userId = ulid()
  const now = Date.now()

  await users.insertUserAndProfile(db, {
    id: userId,
    email: input.email,
    emailNorm: input.emailNorm,
    hash,
    salt,
    iterations,
    handle: finalHandle,
    displayName: input.displayName,
    initials: initialsFrom(input.displayName),
    now,
  })

  logger.info('signup', { userId, handle: finalHandle })
  return withProfile(env, db, userId)
}

export async function login(
  env: Env,
  db: Db,
  emailNorm: string,
  password: string,
  logger: Logger
): Promise<SessionResponse> {
  const user = await users.findUserByEmail(db, emailNorm)

  /* Same error and roughly the same work whether the account exists or not, so
     this endpoint is not a user-enumeration oracle. The throwaway hash costs
     one PBKDF2 run and is the entire point. */
  if (!user || user.status !== 'active') {
    await hashPassword(password)
    logger.info('login rejected', { reason: 'no such active account' })
    throw unauthorized('Email or password is incorrect')
  }

  const ok = await verifyPassword(password, user.password_hash, user.password_salt, user.password_iter)
  if (!ok) {
    logger.info('login rejected', { userId: user.id, reason: 'bad password' })
    throw unauthorized('Email or password is incorrect')
  }

  logger.info('login', { userId: user.id })
  return withProfile(env, db, user.id)
}

/**
 * Exchange a refresh token for a new pair.
 *
 * Rotation on every use: the presented token is revoked before a new one is
 * issued, so replaying an old token fails — and that failure is the signal that
 * it leaked.
 */
export async function refresh(
  env: Env,
  db: Db,
  refreshToken: string,
  logger: Logger
): Promise<SessionResponse> {
  const row = await findRefreshToken(env, refreshToken)

  if (!row || row.revoked_at || row.expires_at < Date.now()) {
    logger.info('refresh rejected', {
      found: Boolean(row),
      revoked: Boolean(row?.revoked_at),
      expired: row ? row.expires_at < Date.now() : null,
    })
    throw unauthorized('Session expired')
  }

  await revokeRefreshToken(env, row.id)
  return withProfile(env, db, row.user_id)
}

export async function currentUser(env: Env, db: Db, userId: string): Promise<PublicUser> {
  const profile = await users.findActiveProfile(db, userId)
  if (!profile) throw unauthorized()
  await cacheProfile(env, profile)
  return toPublicUser(env, profile)
}

async function withProfile(env: Env, db: Db, userId: string): Promise<SessionResponse> {
  const session = await issueSession(env, userId)
  const profile = await users.findProfile(db, userId)
  if (!profile) throw unauthorized()
  await cacheProfile(env, profile)
  return { ...session, user: await toPublicUser(env, profile) }
}

/** Strip anything that is not handle-safe, then bound the length. */
function deriveHandle(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, MAX_HANDLE_LENGTH)
  return cleaned.length >= 2 ? cleaned : `user${Math.floor(Math.random() * 900000 + 100000)}`
}
