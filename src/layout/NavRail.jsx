import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { spring, springPop, springSnap, listStagger, listItem } from '../lib/motion'
import { railGroups } from './navItems'
import AppMark from '../components/brand/AppMark'
import Avatar from '../components/ui/Avatar'
import { useMe } from '../lib/useMe'
import { useUnreadCount } from '../lib/unread'
import { notifications as notificationSeed } from '../data/mockData'

/* The brand gradient (--grad) has no CSS-`color` form, so it cannot be handed
   to an SVG icon's `stroke: currentColor` the way a flat brand colour can.
   AiMark.jsx already solves this the only way SVG allows: a shared
   <linearGradient> def referenced via `stroke: url(#id)`. Same technique here,
   with the stops --grad is built from in tokens.css. */
const GRADIENT_ID = 'rail-active-grad'

function Badge({ count, reduced, className, style }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          className={className}
          initial={reduced ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={springPop}
          style={style}
        >
          {count > 9 ? '9+' : count}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

export default function NavRail() {
  const me = useMe()
  /* Live, not mock data — see lib/unread.js. */
  const unread = useUnreadCount()
  /* TODO(milestone 2): there is no notifications endpoint yet, so this counts
     the same local seed the Activity screen renders. Consistent with what the
     user actually sees there rather than a second invented number. */
  const activityCount = notificationSeed.filter((n) => n.unread).length
  const reduced = useReducedMotion()
  const [hoveredKey, setHoveredKey] = useState(null)

  const badgeFor = (key) =>
    key === 'messages' ? unread : key === 'notifications' ? activityCount : 0

  return (
    <motion.nav
      className="rail"
      aria-label="Primary"
      initial={reduced ? false : { x: -14, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={spring}
    >
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E9B6FF" />
            <stop offset="46%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
        </defs>
      </svg>

      <div className="rail__brand">
        <AppMark size={32} radius={10} />
      </div>

      {railGroups.map((group, groupIndex) => (
        <motion.div
          key={group.id}
          className={`rail__group ${group.foot ? 'rail__group--foot' : ''}`}
          variants={listStagger}
          initial={reduced ? false : 'hidden'}
          animate="show"
        >
          {/* A hairline between bands rather than extra whitespace: at this
              width, spacing alone is ambiguous — it reads as an accident
              before it reads as a grouping. */}
          {groupIndex > 0 && <span className="rail__divider" aria-hidden />}

          {group.items.map(({ key, label, to, icon: Icon, center, state }) => {
            const badge = badgeFor(key)

            return (
              <motion.div key={key} variants={listItem} className="rail__slot">
                <NavLink
                  to={to}
                  state={state}
                  aria-label={label}
                  className={({ isActive }) =>
                    `rail__item ${isActive ? 'rail__item--active' : ''}`
                  }
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey((k) => (k === key ? null : k))}
                  onFocus={() => setHoveredKey(key)}
                  onBlur={() => setHoveredKey((k) => (k === key ? null : k))}
                >
                  {({ isActive }) =>
                    /* Chats keeps the raised brand-filled dock it has on
                       mobile, so the product's primary destination reads the
                       same on both platforms. */
                    center ? (
                      <motion.span
                        className="rail__dock"
                        animate={{ scale: isActive ? 1.06 : 1 }}
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.92 }}
                        transition={spring}
                      >
                        <Icon size={20} strokeWidth={2.2} />
                        <Badge count={badge} reduced={reduced} className="badge rail__dockBadge" />
                      </motion.span>
                    ) : (
                      <>
                        {isActive && (
                          <motion.span layoutId="rail-glow" transition={spring} className="rail__glow" />
                        )}
                        <motion.span
                          animate={{ scale: isActive ? 1.1 : 1 }}
                          whileHover={{ scale: 1.16, x: 1 }}
                          whileTap={{ scale: 0.9 }}
                          transition={springPop}
                          style={{ position: 'relative', display: 'block' }}
                        >
                          {key === 'profile' ? (
                            <Avatar
                              initials={me?.initials ?? ''}
                              gradient={me?.avatarGradient}
                              size={22}
                              style={isActive ? { boxShadow: '0 0 0 2px var(--brand-400)' } : undefined}
                            />
                          ) : (
                            <Icon
                              size={21}
                              strokeWidth={isActive ? 2.3 : 1.8}
                              /* Gradient stroke replaces the flat --brand-700
                                 the CSS class would otherwise apply. */
                              style={isActive ? { stroke: `url(#${GRADIENT_ID})` } : undefined}
                            />
                          )}
                          <Badge
                            count={badge}
                            reduced={reduced}
                            className="badge rail__badge"
                          />
                        </motion.span>
                      </>
                    )
                  }
                </NavLink>

                {/* Icon-only rail, so the label lives in a tooltip. Anchored to
                    the slot, not the rail, so it opens beside its own icon. */}
                <AnimatePresence>
                  {hoveredKey === key && (
                    <motion.span
                      className="rail__tooltip"
                      role="tooltip"
                      initial={reduced ? false : { opacity: 0, x: -6, y: '-50%' }}
                      animate={{ opacity: 1, x: 0, y: '-50%' }}
                      exit={{ opacity: 0, x: -6, y: '-50%' }}
                      transition={springSnap}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>
      ))}
    </motion.nav>
  )
}
