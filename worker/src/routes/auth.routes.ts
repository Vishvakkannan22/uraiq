import type { RequestContext } from '../types'
import { json, noContent, readJson, clientIp } from '../utils/http'
import { validate } from '../utils/validate'
import { createDb } from '../db/client'
import { createLogger } from '../utils/logger'
import * as authService from '../services/auth.service'
import { revokeAllForUser, revokeRefreshTokenByValue, accessTtl } from '../auth/tokens'
import { revokeSession } from '../auth/session'
import { enforceRateLimit } from '../middleware/rateLimit'
import { requireAuth } from '../middleware/requireAuth'
import { RATE_LIMITS, MAX_NAME_LENGTH, MIN_NAME_LENGTH, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '../config'

/** POST /auth/signup  { email, password, name, handle? } */
export async function signup(ctx: RequestContext): Promise<Response> {
  /* Keyed by IP because there is no user yet. This is the only thing between a
     script and an unbounded number of accounts. */
  await enforceRateLimit(ctx.env, 'signup', clientIp(ctx.request), RATE_LIMITS.signup,
    'Too many sign-up attempts. Try again later.')

  const body = await readJson<Record<string, unknown>>(ctx.request)
  const v = validate(body)
  const email = v.email('email')
  const password = v.password('password', { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH })
  const name = v.string('name', { min: MIN_NAME_LENGTH, max: MAX_NAME_LENGTH })
  const handle = v.optionalString('handle', 24)
  v.finish()

  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'auth.signup' })
  const db = createDb(ctx.env, logger)

  const rawEmail = String(body.email).trim()
  const session = await authService.signup(
    ctx.env,
    db,
    { email: rawEmail, emailNorm: email, password, displayName: name, handle },
    logger
  )

  return json(session, { status: 201 })
}

/** POST /auth/login  { email, password } */
export async function login(ctx: RequestContext): Promise<Response> {
  /* Loose per-IP ceiling to stop raw hammering. Intentionally generous — a
     campus or office is one address for thousands of people. */
  await enforceRateLimit(ctx.env, 'login-ip', clientIp(ctx.request), RATE_LIMITS.loginPerIp,
    'Too many sign-in attempts from this network. Try again shortly.')

  const body = await readJson<Record<string, unknown>>(ctx.request)
  const v = validate(body)
  const email = v.email('email')
  const password = v.password('password', { min: 1, max: MAX_PASSWORD_LENGTH })
  v.finish()

  /* The real control: tight, and keyed by the account being attacked. Applied
     after validation but before any database lookup, so it reveals nothing
     about whether the address exists. */
  await enforceRateLimit(ctx.env, 'login-account', email, RATE_LIMITS.loginPerAccount,
    'Too many sign-in attempts for this account. Try again in a few minutes.')

  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'auth.login' })
  const db = createDb(ctx.env, logger)

  return json(await authService.login(ctx.env, db, email, password, logger))
}

/** POST /auth/refresh  { refreshToken } */
export async function refresh(ctx: RequestContext): Promise<Response> {
  await enforceRateLimit(ctx.env, 'refresh', clientIp(ctx.request), RATE_LIMITS.refresh)

  const body = await readJson<Record<string, unknown>>(ctx.request)
  const v = validate(body)
  const refreshToken = v.string('refreshToken', { min: 10, max: 200 })
  v.finish()

  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'auth.refresh' })
  const db = createDb(ctx.env, logger)

  return json(await authService.refresh(ctx.env, db, refreshToken, logger))
}

/**
 * POST /auth/logout  { refreshToken? }
 *
 * Revokes the refresh token so the session cannot be renewed, and tombstones
 * the presented access token so it stops working immediately rather than at
 * its natural expiry.
 */
export async function logout(ctx: RequestContext): Promise<Response> {
  const body = await readJson<{ refreshToken?: string }>(ctx.request).catch(() => ({}) as { refreshToken?: string })

  if (body.refreshToken) {
    await revokeRefreshTokenByValue(ctx.env, body.refreshToken)
  } else if (ctx.auth) {
    /* No token supplied — revoke every session for this user rather than
       leaving them signed in somewhere they believe they have left. */
    await revokeAllForUser(ctx.env, ctx.auth.userId)
  }

  const header = ctx.request.headers.get('Authorization')
  if (header?.startsWith('Bearer ')) {
    await revokeSession(ctx.env, header.slice(7).trim(), accessTtl(ctx.env))
  }

  return noContent()
}

/** GET /auth/me */
export async function me(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'auth.me' })
  const db = createDb(ctx.env, logger)
  return json({ user: await authService.currentUser(ctx.env, db, auth.userId) })
}
