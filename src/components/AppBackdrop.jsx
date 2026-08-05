import { motion, useReducedMotion } from 'framer-motion'

/**
 * Premium 3D bubble field behind the whole app.
 *
 * Each bubble is a single element carrying four stacked gradients — key
 * highlight, rim light, colour body, and a contact shadow — which is what
 * separates a glass sphere from a flat circle. Depth is faked honestly:
 * `far` bubbles are blurred and low-contrast, `near` ones are sharp and
 * drift further, so the field parallaxes as it moves.
 *
 * Grain sits on top. Gradients this large band on 8-bit displays and a few
 * percent of noise is the standard fix; it also keeps the whole thing from
 * reading as flat vector fill.
 *
 * Kept deliberately quiet: this is product chrome, not a showcase. It should
 * register as depth behind a white card, never compete with it.
 */
const BUBBLES = [
  { size: 300, top: '-8%', left: '-6%', depth: 'far', hue: '232, 121, 249', drift: [0, 22, 0], rise: [0, -16, 0], t: 34 },
  { size: 420, top: '54%', left: '62%', depth: 'far', hue: '99, 102, 241', drift: [0, 26, 0], rise: [0, 18, 0], t: 42 },
  { size: 190, top: '18%', left: '74%', depth: 'mid', hue: '168, 85, 247', drift: [0, -18, 0], rise: [0, 20, 0], t: 30 },
  { size: 240, top: '78%', left: '2%', depth: 'mid', hue: '192, 132, 252', drift: [0, -16, 0], rise: [0, -14, 0], t: 37 },
  { size: 110, top: '36%', left: '14%', depth: 'near', hue: '216, 180, 254', drift: [0, 14, 0], rise: [0, -20, 0], t: 26 },
]

export default function AppBackdrop() {
  const reduced = useReducedMotion()

  return (
    <div className="app-bg" aria-hidden="true">
      {BUBBLES.map((b, i) => (
        <motion.span
          key={i}
          className={`bubble-3d bubble-3d--${b.depth}`}
          style={{ width: b.size, height: b.size, top: b.top, left: b.left, '--hue': b.hue }}
          animate={reduced ? undefined : { x: b.drift, y: b.rise }}
          transition={{ duration: b.t, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <span className="app-bg__grain" />
    </div>
  )
}
