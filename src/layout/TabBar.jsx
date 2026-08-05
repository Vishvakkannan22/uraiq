import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { spring } from '../lib/motion'
import { navItems } from './navItems'
import Avatar from '../components/ui/Avatar'
import { useMe } from '../lib/useMe'

export default function TabBar() {
  /* The signed-in user's own avatar. Null for the moment between mount and
     /auth/me returning, which Avatar renders as an empty gradient chip. */
  const me = useMe()

  return (
    <nav className="tabbar">
      {navItems.map(({ key, label, to, icon: Icon, badge, center }) => (
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
                  transition={spring}
                >
                  <Icon size={22} strokeWidth={2.2} />
                  {badge > 0 && (
                    <span className="badge tabbar__dockBadge">{badge > 9 ? '9+' : badge}</span>
                  )}
                </motion.span>
                <span>{label}</span>
              </>
            ) : (
              <>
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
                      }}
                    />
                  )}
                  <motion.span
                    animate={{ scale: isActive ? 1.06 : 1 }}
                    transition={spring}
                    style={{ position: 'relative', display: 'block' }}
                  >
                    {key === 'profile' ? (
                      <Avatar initials={me?.initials ?? ''} gradient={me?.avatarGradient} size={21} />
                    ) : (
                      <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8} />
                    )}
                    {badge > 0 && (
                      <span
                        className="badge badge--dot"
                        style={{ position: 'absolute', top: -1, right: -3, border: '2px solid var(--surface)' }}
                      />
                    )}
                  </motion.span>
                </span>
                <span>{label}</span>
              </>
            )
          }
        </NavLink>
      ))}
    </nav>
  )
}
