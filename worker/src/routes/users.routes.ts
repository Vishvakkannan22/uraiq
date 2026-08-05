import type { RequestContext } from '../types'
import { json, readJson } from '../utils/http'
import { validate } from '../utils/validate'
import { createDb } from '../db/client'
import { createLogger } from '../utils/logger'
import * as usersService from '../services/users.service'
import { requireAuth } from '../middleware/requireAuth'
import { enforceRateLimit } from '../middleware/rateLimit'
import { MAX_BIO_LENGTH, MAX_NAME_LENGTH, MIN_NAME_LENGTH, RATE_LIMITS } from '../config'

/** GET /users/search?q= */
export async function searchUsers(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  await enforceRateLimit(ctx.env, 'search', auth.userId, RATE_LIMITS.search)

  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'users.search' })
  const db = createDb(ctx.env, logger)

  const query = ctx.url.searchParams.get('q') ?? ''
  return json({ users: await usersService.search(ctx.env, db, query, auth.userId) })
}

/** GET /users/:handle */
export async function getUser(ctx: RequestContext): Promise<Response> {
  requireAuth(ctx)
  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'users.get' })
  const db = createDb(ctx.env, logger)
  return json({ user: await usersService.getByHandle(ctx.env, db, ctx.params.handle) })
}

/** PATCH /users/me  { displayName?, bio?, avatarGradient? } */
export async function updateProfile(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  await enforceRateLimit(ctx.env, 'write', auth.userId, RATE_LIMITS.write)

  const body = await readJson<Record<string, unknown>>(ctx.request)
  const v = validate(body)
  /* Every field is optional, but a field that IS present must be valid — a
     blank display name would otherwise wipe the profile name. */
  const displayName =
    body.displayName === undefined
      ? undefined
      : v.string('displayName', { min: MIN_NAME_LENGTH, max: MAX_NAME_LENGTH })
  const bio = v.optionalString('bio', MAX_BIO_LENGTH)
  const avatarGradient = v.optionalString('avatarGradient', 120)
  v.finish()

  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'users.update' })
  const db = createDb(ctx.env, logger)

  return json({
    user: await usersService.updateProfile(ctx.env, db, auth.userId, {
      displayName,
      bio,
      avatarGradient,
    }),
  })
}
