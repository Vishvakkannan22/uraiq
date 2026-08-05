import type { Env } from '../types'

/**
 * Structured logging.
 *
 * Workers Logs indexes JSON, so one object per line is searchable by field
 * (`requestId`, `userId`, `route`) where an interpolated string is not. Every
 * log carries the request id, which is the only way to reassemble one request's
 * lines out of a busy production stream.
 *
 * Never log a password, token, refresh token, or message body. Message bodies
 * are user content in a product whose entire promise is that conversations are
 * private; `redact` exists so a body can be referenced without being recorded.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const
export type Level = keyof typeof LEVELS

export interface LogFields {
  [key: string]: unknown
}

export class Logger {
  private threshold: number

  constructor(
    private base: LogFields,
    level: string = 'info'
  ) {
    this.threshold = LEVELS[level as Level] ?? LEVELS.info
  }

  /** A child logger that carries extra fields on every subsequent line. */
  child(fields: LogFields): Logger {
    const next = new Logger({ ...this.base, ...fields })
    next.threshold = this.threshold
    return next
  }

  debug(message: string, fields?: LogFields) { this.write('debug', message, fields) }
  info(message: string, fields?: LogFields) { this.write('info', message, fields) }
  warn(message: string, fields?: LogFields) { this.write('warn', message, fields) }

  error(message: string, err?: unknown, fields?: LogFields) {
    this.write('error', message, {
      ...fields,
      error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
    })
  }

  private write(level: Level, message: string, fields?: LogFields) {
    if (LEVELS[level] < this.threshold) return
    const line = JSON.stringify({
      level,
      message,
      time: new Date().toISOString(),
      ...this.base,
      ...fields,
    })
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }
}

export function createLogger(env: Env, fields: LogFields): Logger {
  return new Logger(fields, env.LOG_LEVEL ?? 'info')
}

/** Length and a hash prefix — enough to correlate, useless to a reader. */
export function redact(value: string | null | undefined): string {
  if (!value) return '<empty>'
  return `<${value.length} chars>`
}
