import type { AuthContext, RequestContext } from '../types'
import { unauthorized } from '../utils/errors'

/**
 * Narrow `ctx.auth` from `AuthContext | null` to `AuthContext`.
 *
 * The router already refuses unauthenticated requests to protected routes, so
 * by the time a handler runs `auth` is populated. TypeScript cannot know that,
 * and the alternative — `ctx.auth!` in every handler — would silently become
 * wrong the day a route's `auth` flag is flipped. This makes that mistake a
 * 401 instead of a crash on undefined.
 */
export function requireAuth(ctx: RequestContext): AuthContext {
  if (!ctx.auth) throw unauthorized()
  return ctx.auth
}
