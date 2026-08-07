import type { RequestContext } from '../types'
import { json, readJson } from '../utils/http'
import { validate } from '../utils/validate'
import { createDb } from '../db/client'
import { createLogger } from '../utils/logger'
import * as conversationsService from '../services/conversations.service'
import { requireAuth } from '../middleware/requireAuth'
import { enforceRateLimit } from '../middleware/rateLimit'
import { RATE_LIMITS } from '../config'

/** GET /conversations */
export async function listConversations(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'conversations.list' })
  const db = createDb(ctx.env, logger)
  return json({ conversations: await conversationsService.list(ctx.env, db, auth.userId) })
}

/** POST /conversations  { peerId } — idempotent. */
export async function createConversation(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  await enforceRateLimit(ctx.env, 'write', auth.userId, RATE_LIMITS.write)

  const body = await readJson<Record<string, unknown>>(ctx.request)
  const v = validate(body)
  const peerId = v.id('peerId')
  v.finish()

  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'conversations.create' })
  const db = createDb(ctx.env, logger)

  const { conversation, created } = await conversationsService.createDirect(
    ctx.env,
    db,
    auth.userId,
    peerId,
    logger
  )

  /* 200 when it already existed, 201 when this call made it — the client can
     tell "opened" from "started" without a second request. */
  return json({ conversation }, { status: created ? 201 : 200 })
}

/** GET /conversations/:id */
export async function getConversation(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'conversations.get' })
  const db = createDb(ctx.env, logger)

  return json({
    conversation: await conversationsService.getOne(ctx.env, db, ctx.params.id, auth.userId),
  })
}

/**
 * POST /conversations/:id/clear
 *
 * Removes this user's view of the history so far. The other participant's
 * copy — and the messages themselves — are unaffected; see
 * conversations.service.clearChat for why a cursor rather than a delete.
 */
export async function clearChat(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  await enforceRateLimit(ctx.env, 'write', auth.userId, RATE_LIMITS.write)

  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'conversations.clear' })
  const db = createDb(ctx.env, logger)

  const { clearedAt } = await conversationsService.clearChat(db, ctx.params.id, auth.userId, logger)
  return json({ ok: true, clearedAt })
}
