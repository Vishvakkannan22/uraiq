/**
 * Every display-facing timestamp in the app funnels through here, formatted in
 * one fixed zone: India Standard Time (UTC+5:30) — regardless of the device's
 * own timezone, locale, or system clock configuration.
 *
 * Every timestamp already stored anywhere (message createdAt, presence
 * lastSeenAt, read receipts, conversation updatedAt) is a UTC epoch
 * millisecond count from `Date.now()`, which is timezone-agnostic by
 * construction — one universal instant. The bug this file fixes was entirely
 * in DISPLAY: `toLocaleTimeString()` / `toLocaleDateString()` with no explicit
 * `timeZone` format using whichever zone the runtime happens to be configured
 * with — the OS on a phone, the container running the dev server — which is
 * only IST by coincidence. Two people viewing the same message on devices set
 * to different zones would each see a different clock time for it, and the
 * "Today" / "Yesterday" boundary would land on the wrong side of midnight IST
 * for anyone whose device isn't already set to it. That is what made
 * timestamps look "wrong" or "random": they were correct for some other
 * timezone, just not the one the product is meant to run in.
 */

export const IST_TIME_ZONE = 'Asia/Kolkata'

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})
const weekdayShortFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  weekday: 'short',
})
const weekdayLongFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  weekday: 'long',
})
const shortDateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  day: 'numeric',
  month: 'short',
})
const longDateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  day: 'numeric',
  month: 'long',
})
/* en-CA is the trick for a plain yyyy-mm-dd — the one built-in locale whose
   default date format is already sortable and unambiguous. */
const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** "9:41 AM" — the IST clock time, no matter where this code executes. */
export function timeLabel(ts) {
  return timeFormatter.format(ts)
}

/** The IST calendar date of an instant, as a sortable "2026-08-06" key. */
export function istDateKey(ts) {
  return isoDateFormatter.format(ts)
}

/**
 * Whole IST calendar days between two instants (b minus a).
 *
 * Each side is parsed as if its IST date key were UTC midnight. The absolute
 * instant that produces is meaningless on its own, but the difference between
 * two such instants is exactly a day count — a normal calendar subtraction,
 * done in a timezone-neutral way so it can't be thrown off by DST or by the
 * runtime's own zone.
 */
export function istDaysBetween(aTs, bTs) {
  const a = Date.parse(`${istDateKey(aTs)}T00:00:00Z`)
  const b = Date.parse(`${istDateKey(bTs)}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

/** Calendar days since `ts`, in IST. 0 = today, 1 = yesterday. */
export function istDaysAgo(ts) {
  return istDaysBetween(ts, Date.now())
}

/** Compact stamp for a list row: time today, weekday this week, date beyond. */
export function listTimeLabel(ts) {
  if (!ts) return ''
  const days = istDaysAgo(ts)
  if (days <= 0) return timeLabel(ts)
  if (days === 1) return 'Yesterday'
  if (days < 7) return weekdayShortFormatter.format(ts)
  return shortDateFormatter.format(ts)
}

/** Full label for a day divider inside a thread. */
export function dayLabel(ts) {
  const days = istDaysAgo(ts)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return weekdayLongFormatter.format(ts)
  return longDateFormatter.format(ts)
}

/**
 * "Last seen", accurate at every distance.
 *
 * Under an hour this is pure elapsed time — a subtraction of two instants,
 * needing no timezone at all, so "5 minutes ago" said 5 minutes after the
 * fact is exactly that regardless of where either side's clock thinks it is.
 * Past an hour it switches to calendar boundaries in IST (today / yesterday /
 * a weekday / a date) rather than a rolling hour count, because that is what
 * "yesterday" actually means to a reader, and it keeps this consistent with
 * every other day label in the app instead of drifting oddly near midnight.
 *
 * The "just now" cutoff is 2 minutes, not 1: presence is a KV entry with a
 * 90-second TTL refreshed by a ~25s heartbeat, so `lastSeenAt` itself carries
 * up to that much imprecision. Saying "just now" up to 1 minute would claim a
 * precision the underlying data doesn't have.
 */
export function lastSeenLabel(lastSeenAt) {
  if (!lastSeenAt) return 'Offline'

  const minutes = Math.floor((Date.now() - lastSeenAt) / 60_000)
  if (minutes < 2) return 'Last seen just now'
  if (minutes < 60) return `Last seen ${minutes}m ago`

  const days = istDaysAgo(lastSeenAt)
  const at = timeLabel(lastSeenAt)
  if (days <= 0) return `Last seen today at ${at}`
  if (days === 1) return `Last seen yesterday at ${at}`
  if (days < 7) return `Last seen ${weekdayLongFormatter.format(lastSeenAt)} at ${at}`
  return `Last seen ${shortDateFormatter.format(lastSeenAt)}`
}
