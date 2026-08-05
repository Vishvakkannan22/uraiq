import type { RequestContext } from '../types'
import { json, readJson } from '../utils/http'
import { validate } from '../utils/validate'
import { createLogger } from '../utils/logger'
import { moderate } from '../services/moderation.service'
import { requireAuth } from '../middleware/requireAuth'
import { enforceRateLimit } from '../middleware/rateLimit'
import { MAX_MESSAGE_LENGTH, RATE_LIMITS } from '../config'

/**
 * POST /agents/moderate  { text }
 *
 * The pre-send check the composer calls while the user is still typing.
 *
 * Deliberately the same classifier the send path uses, so what a user is warned
 * about and what is actually refused can never diverge — a warning that does
 * not match the enforcement teaches people to ignore warnings.
 *
 * Rate limited more generously than sending, because this fires on a debounce
 * while typing rather than once per message.
 */
export async function checkText(ctx: RequestContext): Promise<Response> {
  const auth = requireAuth(ctx)
  await enforceRateLimit(ctx.env, 'moderate', auth.userId, RATE_LIMITS.moderate)

  const raw = await readJson<Record<string, unknown>>(ctx.request)
  const v = validate(raw)
  const text = v.string('text', { min: 0, max: MAX_MESSAGE_LENGTH, required: false })
  v.finish()

  const logger = createLogger(ctx.env, { requestId: ctx.requestId, route: 'agents.moderate' })
  return json(await moderate(ctx.env, text, logger))
}
