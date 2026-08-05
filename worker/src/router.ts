import type { RequestContext } from './types'

type Handler = (ctx: RequestContext) => Promise<Response> | Response

interface Route {
  method: string
  segments: string[]
  handler: Handler
  auth: boolean
}

/**
 * A ~70-line router rather than a dependency.
 *
 * Routes match on pre-split segments, so a request does no regex work and no
 * allocation beyond one split. `:name` captures a segment. Static segments are
 * compared before dynamic ones within a route, and routes are tried in
 * registration order — so register `/users/search` before `/users/:handle`, or
 * the literal path is swallowed by the parameter.
 */
export class Router {
  private routes: Route[] = []

  private add(method: string, pattern: string, handler: Handler, auth: boolean) {
    this.routes.push({
      method,
      segments: pattern.split('/').filter(Boolean),
      handler,
      auth,
    })
    return this
  }

  get(pattern: string, handler: Handler, auth = true) { return this.add('GET', pattern, handler, auth) }
  post(pattern: string, handler: Handler, auth = true) { return this.add('POST', pattern, handler, auth) }
  patch(pattern: string, handler: Handler, auth = true) { return this.add('PATCH', pattern, handler, auth) }
  delete(pattern: string, handler: Handler, auth = true) { return this.add('DELETE', pattern, handler, auth) }

  match(method: string, pathname: string): { route: Route; params: Record<string, string> } | null {
    const parts = pathname.split('/').filter(Boolean)

    for (const route of this.routes) {
      if (route.method !== method) continue
      if (route.segments.length !== parts.length) continue

      const params: Record<string, string> = {}
      let ok = true

      for (let i = 0; i < route.segments.length; i++) {
        const segment = route.segments[i]
        if (segment.startsWith(':')) {
          params[segment.slice(1)] = decodeURIComponent(parts[i])
          continue
        }
        if (segment !== parts[i]) {
          ok = false
          break
        }
      }

      if (ok) return { route, params }
    }

    return null
  }

  /** Every registered path, for the / index response. */
  describe(): string[] {
    return this.routes.map((r) => `${r.method} /${r.segments.join('/')}`)
  }
}
