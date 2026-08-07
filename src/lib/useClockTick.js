import { useEffect, useState } from 'react'

/**
 * Forces a periodic re-render for components whose displayed text depends on
 * elapsed time rather than on any prop actually changing.
 *
 * "Last seen 5 minutes ago" is only correct at the instant it's computed.
 * Nothing about `lastSeenAt` changes as the minutes pass, so with no other
 * state update forcing a re-render, the label would freeze at whatever age it
 * had during the last unrelated render — a socket event, a scroll, anything —
 * and quietly go stale until one happened to occur. This is what made "last
 * seen" and chat-list timestamps look wrong even when the underlying data was
 * correct: the number on screen was accurate for whenever it was last drawn,
 * not for now.
 */
export function useClockTick(intervalMs = 30_000) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return tick
}
