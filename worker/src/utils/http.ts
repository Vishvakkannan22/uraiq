import { badRequest } from './errors'

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers ?? {}),
    },
  })
}

export function noContent(): Response {
  return new Response(null, { status: 204 })
}

/**
 * Parse a JSON body, or fail with a 400 the client can act on.
 *
 * A malformed body is a client bug, not a server error, and letting
 * `request.json()` throw raw would surface it as a 500.
 */
export async function readJson<T>(request: Request): Promise<T> {
  const type = request.headers.get('Content-Type') ?? ''
  if (!type.includes('application/json')) {
    throw badRequest('Expected a JSON body')
  }
  /* Parsed outside the try so the validity check below cannot have its own
     HttpError swallowed by the catch that is there for malformed JSON. */
  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    throw badRequest('Expected a JSON body')
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw badRequest('Expected a JSON object')
  }
  return parsed as T
}

/** First client IP from the Cloudflare edge, used to key unauthenticated limits. */
export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  )
}
