import { useEffect, useRef, useState } from 'react'

/**
 * 'up' | 'down', from whichever scroll container the user is actually
 * touching right now.
 *
 * There is no single scrollable element to attach to — every screen owns its
 * own `.scroll` div (see globals.css), not `window`. A capture-phase listener
 * on `document` sidesteps that: `scroll` events on an inner element don't
 * bubble, but capture-phase listeners see them on the way down regardless of
 * whether they'd ever bubble back up, so one listener here covers every
 * screen's scroller without each one needing to report in.
 *
 * Shared by both navs — TabBar uses it today to duck out of the way while
 * reading; NavRail doesn't currently hide on scroll, but the hook doesn't
 * know or care which nav is asking.
 */
export function useScrollDirection() {
  const [direction, setDirection] = useState('up')
  const lastY = useRef(0)
  const lastTarget = useRef(null)

  useEffect(() => {
    function onScroll(e) {
      const el = e.target
      const y = el === document ? window.scrollY : el.scrollTop ?? 0

      /* A route change hands the next page's scroller a fresh scrollTop —
         often 0 — which reads as a huge upward jump against the previous
         page's position. That's a navigation, not a scroll gesture, so the
         first event from a new target just resets the baseline instead of
         computing a delta from it. */
      if (lastTarget.current !== el) {
        lastTarget.current = el
        lastY.current = y
        return
      }

      const delta = y - lastY.current
      /* A few px of noise (momentum scroll, trackpad jitter) shouldn't flip
         the direction back and forth. */
      if (Math.abs(delta) < 6) return
      setDirection(delta > 0 ? 'down' : 'up')
      lastY.current = y
    }

    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  return direction
}
