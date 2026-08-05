import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { spring } from '../lib/motion'
import { navItems } from './navItems'
import AppMark from '../components/brand/AppMark'
import Avatar from '../components/ui/Avatar'
import { useMe } from '../lib/useMe'

export default function NavRail() {
  const me = useMe()

  return (
    <nav className="rail">
      <div style={{ marginBottom: 'var(--s5)', filter: 'drop-shadow(0 4px 12px rgba(20,184,166,.4))' }}>
        <AppMark size={34} radius={11} />
      </div>

      {navItems.map(({ key, label, to, icon: Icon, badge }) => (
        <NavLink
          key={key}
          to={to}
          className={({ isActive }) => `rail__item ${isActive ? 'rail__item--active' : ''}`}
        >
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="rail-glow" transition={spring} className="rail__glow" />}
              <span style={{ position: 'relative', display: 'block' }}>
                {key === 'profile' ? (
                  <Avatar
                    initials={me?.initials ?? ''}
                    gradient={me?.avatarGradient}
                    size={22}
                    style={isActive ? { boxShadow: '0 0 0 2px var(--brand-400)' } : undefined}
                  />
                ) : (
                  <Icon size={22} strokeWidth={isActive ? 2.3 : 1.8} />
                )}
                {badge > 0 && (
                  <span
                    className="badge"
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -7,
                      height: 16,
                      minWidth: 16,
                      fontSize: 9.5,
                      border: '2px solid var(--surface)',
                    }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
