import { D1_RETRY_ATTEMPTS, D1_RETRY_BASE_MS } from '../config'
import type { Logger } from './logger'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Retry only what is worth retrying.
 *
 * D1 occasionally returns a transient storage error under contention, and a
 * single retry clears it. A constraint violation or a syntax error never
 * clears, so retrying those just multiplies the latency of a request that was
 * always going to fail — and, for a non-idempotent statement, risks applying
 * the write twice.
 */
export function isTransient(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const message = err.message.toLowerCase()

  /* Never retry a rejected write. UNIQUE, FOREIGN KEY and CHECK failures are
     deterministic — the second attempt fails identically. */
  if (
    message.includes('unique') ||
    message.includes('constraint') ||
    message.includes('foreign key') ||
    message.includes('syntax')
  ) {
    return false
  }

  return (
    message.includes('network') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('temporarily') ||
    message.includes('overloaded') ||
    message.includes('storage error') ||
    message.includes('internal error')
  )
}

/**
 * Run `operation`, retrying transient failures with exponential backoff.
 *
 * Only wrap operations that are safe to run twice: reads always, and writes
 * only where a repeat is a no-op (`ON CONFLICT DO NOTHING`, or an idempotent
 * update). Never wrap a bare INSERT that would duplicate a row.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { attempts?: number; label?: string; logger?: Logger } = {}
): Promise<T> {
  const attempts = options.attempts ?? D1_RETRY_ATTEMPTS
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation()
    } catch (err) {
      lastError = err
      if (!isTransient(err) || attempt === attempts - 1) throw err

      const wait = D1_RETRY_BASE_MS * 2 ** attempt
      options.logger?.warn('retrying transient failure', {
        label: options.label,
        attempt: attempt + 1,
        waitMs: wait,
        reason: err instanceof Error ? err.message : String(err),
      })
      await sleep(wait)
    }
  }

  throw lastError
}
