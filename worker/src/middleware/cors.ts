import type { Env } from '../types'

/**
 * Exact-origin CORS.
 *
 * No wildcard: the client sends an Authorization header, and a browser rejects
 * `*` on a credentialed request anyway. An unlisted origin gets the first
 * allowed origin echoed back, which the browser then refuses — the request
 * fails at the client rather than being quietly permitted.
 */
export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  const ok = allowed.includes(origin)

  return {
    'Access-Control-Allow-Origin': ok ? origin : (allowed[0] ?? ''),
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'X-Request-Id, Retry-After',
    'Access-Control-Max-Age': '86400',
    /* Without this a cache could serve one origin's CORS headers to another. */
    Vary: 'Origin',
  }
}

export function withCors(response: Response, cors: Record<string, string>): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(cors)) headers.set(key, value)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
