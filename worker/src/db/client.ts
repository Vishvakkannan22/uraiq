import type { Env } from '../types'
import type { Logger } from '../utils/logger'
import { withRetry } from '../utils/retry'

/**
 * Thin wrappers over D1.
 *
 * Two jobs: attach retry to the reads that are safe to repeat, and give every
 * query a label so a slow or failing statement is identifiable in the logs
 * without reproducing it locally. Repositories call these; nothing else talks
 * to `env.DB` except the auth token functions, which are their own unit.
 */

export interface Db {
  first<T>(label: string, statement: D1PreparedStatement): Promise<T | null>
  all<T>(label: string, statement: D1PreparedStatement): Promise<T[]>
  run(label: string, statement: D1PreparedStatement): Promise<D1Result>
  batch(label: string, statements: D1PreparedStatement[]): Promise<D1Result[]>
  prepare(sql: string): D1PreparedStatement
}

export function createDb(env: Env, logger: Logger): Db {
  return {
    prepare: (sql) => env.DB.prepare(sql),

    /* Reads retry: repeating a SELECT is always safe. */
    first: <T>(label: string, statement: D1PreparedStatement) =>
      withRetry(() => statement.first<T>(), { label, logger }),

    all: <T>(label: string, statement: D1PreparedStatement) =>
      withRetry(async () => (await statement.all<T>()).results ?? [], { label, logger }),

    /* Writes do not retry here. A caller that knows its statement is idempotent
       — `ON CONFLICT DO NOTHING`, or an UPDATE that sets an absolute value —
       can wrap it in withRetry itself. Retrying blindly would duplicate rows. */
    run: async (label, statement) => {
      try {
        return await statement.run()
      } catch (err) {
        logger.error('write failed', err, { label })
        throw err
      }
    },

    batch: async (label, statements) => {
      try {
        return await env.DB.batch(statements)
      } catch (err) {
        logger.error('batch failed', err, { label, statements: statements.length })
        throw err
      }
    },
  }
}

/** `?1, ?2, ?3` for an IN clause of `count` items. */
export function placeholders(count: number, offset = 0): string {
  return Array.from({ length: count }, (_, i) => `?${i + 1 + offset}`).join(',')
}
