import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { spring, springPop, springSnap } from '../lib/motion'
import { navItems } from './navItems'
import Avatar from '../components/ui/Avatar'
import { useMe } from '../lib/useMe'
import { useUnreadCount } from '../lib/unread'
import { useScrollDirection } from '../lib/useScrollDirection'

export default function TabBar() {
  /* The signed-in user's own avatar. Null for the moment between mount and
     /auth/me returning, which Avatar renders as an empty gradient chip. */
  const me = useMe()
  /* Live, not mock data — see lib/unread.js for how this stays in sync with
     messages arriving in real time. */
  const unread = useUnreadCount()
  const reduced = useReducedMotion()
  const scrollDirection = useScrollDirection()
  /* Reduced-motion users get a static, always-visible dock — the whole
     point of hiding it is a large motion cue, which is exactly what that
     preference asks this app not to do. */
  const hidden = !reduced && scrollDirection === 'down'

  return (
    <motion.nav
      className="tabbar"
      animate={{ y: hidden ? '110%' : '0%' }}
      transition={spring}
    >
      {navItems.map(({ key, label, to, icon: Icon, center }) => {
        const badge = key === 'messages' ? unread : 0
        return (
          <NavLink
            key={key}
            to={to}
            className={({ isActive }) =>
              ['tabbar__item', isActive && 'tabbar__item--active', center && 'tabbar__item--center']
                .filter(Boolean)
                .join(' ')
            }
          >
            {({ isActive }) =>
              center ? (
                /* The docked centre slot: always brand-filled, so it reads as the
                   app's primary action whether or not it's the current tab. */
                <>
                  <motion.span
                    className="tabbar__dock"
                    animate={{ scale: isActive ? 1.06 : 1, y: isActive ? -2 : 0 }}
                    whileHover={{ scale: 1.12, y: -4 }}
                    whileTap={{ scale: 0.92, y: 0 }}
                    transition={spring}
                  >
                    <Icon size={22} strokeWidth={2.2} />
                    {/* A one-shot glow ring, replayed via `key` every time this
                       slot becomes the active tab — opacity/scale only, never
                       box-shadow, so the existing static --e-brand glow (in
                       components.css) is what's actually casting light; this
                       is the animated ring on top of it. */}
                    <AnimatePresence>
                      {isActive && !reduced && (
                        <motion.span
                          key="pulse"
                          className="tabbar__dockPulse"
                          initial={{ opacity: 0.7, scale: 0.7 }}
                          animate={{ opacity: 0, scale: 1.8 }}
                          transition={{ duration: 0.55, ease: 'easeOut' }}
                          aria-hidden
                        />
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {badge > 0 && (
                        <motion.span
                          key={badge}
                          className="badge tabbar__dockBadge"
                          initial={reduced ? false : { scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={springSnap}
                        >
                          {badge > 9 ? '9+' : badge}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.span>
                  <motion.span animate={{ opacity: isActive ? 1 : 0.7 }} transition={springSnap}>
                    {label}
                  </motion.span>
                </>
              ) : (
                /* Whole-tab press feedback replaces the old CSS
                   `.tabbar__item:active { transform: scale(0.94) }` — a
                   spring instead of a fixed-duration transition. */
                <motion.span
                  whileTap={{ scale: 0.94 }}
                  transition={springSnap}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: '100%' }}
                >
                  <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 46, height: 28 }}>
                    {isActive && (
                      <motion.span
                        layoutId="tab-pill"
                        transition={spring}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 'var(--r-full)',
                          background: 'var(--brand-100)',
                          boxShadow: 'inset 0 0 0 1px var(--brand-200)',
                        }}
                      />
                    )}
                    {/* Active icon lifts and scales up — a "raised tab" rather
                       than just a recolored one. */}
                    <motion.span
                      animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -4 : 0 }}
                      whileHover={{ scale: 1.18, y: -5 }}
                      transition={springPop}
                      style={{ position: 'relative', display: 'block' }}
                    >
                      {key === 'profile' ? (
                        <Avatar initials={me?.initials ?? ''} gradient={me?.avatarGradient} size={21} />
                      ) : (
                        <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8} />
                      )}
                      <AnimatePresence>
                        {badge > 0 && (
                          <motion.span
                            key={badge}
                            className="badge badge--dot"
                            initial={reduced ? false : { scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={springPop}
                            style={{ position: 'absolute', top: -1, right: -3, border: '2px solid var(--surface)' }}
                          />
                        )}
                      </AnimatePresence>
                    </motion.span>
                  </span>
                  {/* Active label reads full-strength; inactive ones recede
                     rather than compete with it. */}
                  <motion.span animate={{ opacity: isActive ? 1 : 0.55 }} transition={springSnap}>
                    {label}
                  </motion.span>
                </motion.span>
              )
            }
          </NavLink>
        )
      })}
    </motion.nav>
  )
}
