/**
 * The one error type every layer throws.
 *
 * Services throw these; the top-level handler in index.ts turns them into
 * responses. Nothing below that layer builds a Response for a failure, which is
 * what keeps error shape consistent across forty-odd call sites.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: unknown = null
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new HttpError(400, 'bad_request', msg, details ?? null)

export const unauthorized = (msg = 'Sign in required') =>
  new HttpError(401, 'unauthenticated', msg)

export const forbidden = (msg = 'Not allowed') => new HttpError(403, 'forbidden', msg)

export const notFound = (msg = 'Not found') => new HttpError(404, 'not_found', msg)

export const conflict = (msg: string) => new HttpError(409, 'conflict', msg)

export const tooManyRequests = (msg = 'Too many requests', retryAfterSeconds?: number) =>
  new HttpError(429, 'rate_limited', msg, retryAfterSeconds ? { retryAfterSeconds } : null)

export const serviceUnavailable = (msg = 'Temporarily unavailable') =>
  new HttpError(503, 'unavailable', msg)
