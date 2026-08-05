export const ease = [0.16, 1, 0.3, 1]

export const spring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }
export const springSoft = { type: 'spring', stiffness: 260, damping: 30 }
export const springSnap = { type: 'spring', stiffness: 620, damping: 38 }
/* Overshoots slightly — for things that should feel like they land. */
export const springPop = { type: 'spring', stiffness: 500, damping: 24, mass: 0.7 }

export const press = { scale: 0.96 }

export const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.28, ease },
}

export const popIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.94 },
  transition: springSnap,
}

/* ---- Lists -------------------------------------------------
   Rows arrive on a spring rather than a duration, so a long list
   still settles quickly instead of dragging out the tail. */
export const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
}

export const listItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
}

/* ---- Bento -------------------------------------------------
   Tiles scale up as they fade in, which reads as the grid
   assembling rather than a list scrolling into place. */
export const bentoStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
}

export const bentoItem = {
  hidden: { opacity: 0, y: 16, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: springPop },
}

/* ---- Route transitions -------------------------------------
   Sections slide along the tab-bar axis: move right through the bar and
   the screen pushes in from the right, move left and it comes from the
   left. Direction carries the sense of place that a crossfade throws away.

   The exit is a short duration and the entrance a spring on purpose — a
   symmetric pair reads as sluggish, since you spend the exit waiting. */
export function sectionSwipe(dir, reduced) {
  const dx = reduced ? 0 : 44
  return {
    initial: { x: dir * dx, opacity: 0 },
    animate: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 460, damping: 40, mass: 0.7 },
    },
    exit: {
      x: dir * -dx * 0.6,
      opacity: 0,
      transition: { duration: 0.13, ease },
    },
  }
}

/* ---- Message send ------------------------------------------
   The bubble launches from the composer: small, low and slightly
   forward, then springs up into place in the thread. */
export const messageIn = {
  initial: { opacity: 0, y: 18, scale: 0.86 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: springPop,
}
