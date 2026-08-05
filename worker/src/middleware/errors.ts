import { HttpError } from '../utils/errors'
import { json } from '../utils/http'
import type { Logger } from '../utils/logger'

/**
 * The single place a thrown error becomes a Response.
 *
 * Two rules:
 *
 * 1. An `HttpError` is intentional — its message was written to be read by a
 *    user, so it is passed through.
 * 2. Anything else is a bug. It is logged in full and answered with a generic
 *    500, because a raw exception message can carry SQL, table names, or
 *    fragments of another user's data.
 *
 * The request id goes out on every response, including errors, so a user can
 * quote it and it can be found in the logs.
 */
export function toErrorResponse(err: unknown, logger: Logger, requestId: string): Response {
  if (err instanceof HttpError) {
    /* 4xx is the client's problem and is normal traffic; 5xx is ours. */
    if (err.status >= 500) {
      logger.error('request failed', err, { status: err.status, code: err.code })
    } else {
      logger.info('request rejected', { status: err.status, code: err.code, reason: err.message })
    }

    const headers: Record<string, string> = { 'X-Request-Id': requestId }
    const retryAfter = (err.details as { retryAfterSeconds?: number } | null)?.retryAfterSeconds
    if (retryAfter) headers['Retry-After'] = String(retryAfter)

    return json(
      { error: { code: err.code, message: err.message, details: err.details, requestId } },
      { status: err.status, headers }
    )
  }

  logger.error('unhandled exception', err)
  return json(
    { error: { code: 'internal', message: 'Something went wrong', requestId } },
    { status: 500, headers: { 'X-Request-Id': requestId } }
  )
}
