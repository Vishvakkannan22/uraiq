import { useEffect, useState } from 'react'

/**
 * True once the given scroll container has moved past `threshold`.
 * Drives the condensing header — the bar only tightens and lifts once
 * there is actually content underneath it to lift away from.
 *
 * Reads are rAF-throttled and the listener is passive, so this never
 * blocks or thrashes layout during a scroll.
 */
export function useScrolled(ref, threshold = 8) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let frame = 0
    const read = () => {
      frame = 0
      setScrolled(el.scrollTop > threshold)
    }
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(read)
    }

    read()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ref, threshold])

  return scrolled
}
