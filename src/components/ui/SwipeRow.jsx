import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { spring } from '../../lib/motion'

const OPEN_X = -152
const TRIGGER = -64

/**
 * A row that slides aside to reveal actions behind it.
 *
 * `drag="x"` is deliberate rather than a pointer handler: Framer sets
 * `touch-action: pan-y` for a single-axis drag, so the list underneath keeps
 * scrolling vertically while this only claims horizontal movement. A manual
 * handler would have to reimplement that arbitration badly.
 *
 * The action tray scales and fades with the drag rather than just sitting
 * there, so the row feels like it's uncovering something instead of exposing
 * a static layer.
 */
export default function SwipeRow({ children, actions }) {
  const x = useMotionValue(0)
  const revealed = useTransform(x, [OPEN_X, TRIGGER / 2, 0], [1, 0.35, 0])
  const trayScale = useTransform(x, [OPEN_X, 0], [1, 0.82])

  const settle = (to) => animate(x, to, spring)

  return (
    <div className="swipe-row">
      <motion.div className="swipe-row__tray" style={{ opacity: revealed, scale: trayScale }}>
        {actions({ close: () => settle(0) })}
      </motion.div>

      <motion.div
        className="swipe-row__front"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: OPEN_X, right: 0 }}
        dragElastic={{ left: 0.06, right: 0 }}
        dragMomentum={false}
        onDragEnd={(_, info) => settle(info.offset.x < TRIGGER || info.velocity.x < -420 ? OPEN_X : 0)}
      >
        {children}
      </motion.div>
    </div>
  )
}
