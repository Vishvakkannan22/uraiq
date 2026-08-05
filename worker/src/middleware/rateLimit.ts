import type { Env } from '../types'
import type { RateLimitRule } from '../config'
import { tooManyRequests } from '../utils/errors'

/**
 * Fixed-window rate limiting on KV.
 *
 * Honest about what this is and is not:
 *
 * - KV is eventually consistent, so two Workers in different colos can both
 *   read a stale count and both allow a request. The effective ceiling is
 *   therefore *approximately* the configured limit, not exactly it. That is the
 *   right trade for abuse control, where the goal is to stop a script hammering
 *   an endpoint, not to enforce a billing quota.
 * - A fixed window allows a burst across the boundary: a client can spend the
 *   whole budget at the end of one window and again at the start of the next.
 *   A sliding window would need a read-modify-write per request, which KV
 *   cannot do atomically.
 *
 * If either of those becomes a real problem, the fix is a Durable Object per
 * limit key — strongly consistent, single-threaded, and exactly the shape this
 * function already has. Deliberately not doing that yet: it puts a DO round
 * trip in front of every login.
 */

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetSeconds: number
}

export async function checkRateLimit(
  env: Env,
  scope: string,
  identity: string,
  rule: RateLimitRule
): Promise<RateLimitResult> {
  const window = Math.floor(Date.now() / 1000 / rule.windowSeconds)
  const key = `rl:${scope}:${identity}:${window}`
  const resetSeconds = (window + 1) * rule.windowSeconds - Math.floor(Date.now() / 1000)

  const current = Number((await env.KV.get(key)) ?? '0')
  if (current >= rule.limit) {
    return { allowed: false, remaining: 0, resetSeconds }
  }

  /* TTL covers the rest of this window plus a minute of slack, so the key
     cannot expire while the window is still open. KV's floor is 60s. */
  await env.KV.put(key, String(current + 1), {
    expirationTtl: Math.max(60, resetSeconds + 60),
  })

  return { allowed: true, remaining: rule.limit - current - 1, resetSeconds }
}

/** Throws a 429 carrying Retry-After when the budget is spent. */
export async function enforceRateLimit(
  env: Env,
  scope: string,
  identity: string,
  rule: RateLimitRule,
  message?: string
): Promise<void> {
  const result = await checkRateLimit(env, scope, identity, rule)
  if (!result.allowed) {
    throw tooManyRequests(message ?? 'Too many requests. Try again shortly.', result.resetSeconds)
  }
}
