const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford base32
const TIME_LEN = 10
const RANDOM_LEN = 16

/**
 * ULID: 48-bit timestamp + 80 bits of randomness, base32.
 *
 * Chosen over UUIDv4 because it sorts lexicographically by creation time. That
 * is what lets message pagination be `WHERE id < ?cursor ORDER BY id DESC`
 * against one index, with no secondary timestamp column and no OFFSET — the
 * difference between constant-time paging and a scan that degrades as a
 * conversation grows.
 *
 * The same property is reused for read receipts: comparing a message id to the
 * peer's read cursor is a string comparison, not a lookup.
 */
export function ulid(seedTime = Date.now()): string {
  let time = seedTime
  let out = ''

  for (let i = TIME_LEN - 1; i >= 0; i--) {
    out = ENCODING[time % 32] + out
    time = Math.floor(time / 32)
  }

  const bytes = crypto.getRandomValues(new Uint8Array(RANDOM_LEN))
  for (let i = 0; i < RANDOM_LEN; i++) out += ENCODING[bytes[i] % 32]

  return out
}

/** A ULID is 26 Crockford base32 characters and nothing else. */
export function isUlid(value: string): boolean {
  return value.length === 26 && [...value].every((c) => ENCODING.includes(c))
}

/**
 * Sorted pair key, so both participants resolve to the same conversation no
 * matter who opens it first. This is what makes conversation creation
 * idempotent under a race rather than producing two threads.
 */
export function directKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Correlation id for one request's log lines. */
export function requestId(): string {
  return crypto.randomUUID()
}
