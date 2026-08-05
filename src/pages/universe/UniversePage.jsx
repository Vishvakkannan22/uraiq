import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, List } from 'lucide-react'
import AiMark from '../../components/brand/AiMark'
import Avatar from '../../components/ui/Avatar'
import Sheet from '../../components/ui/Sheet'
import { spring } from '../../lib/motion'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { useChatList } from '../../lib/chat/useChatList'
import { useMe } from '../../lib/useMe'
/* Communities are out of scope for this milestone and still read from the
   local seed; the orbits themselves are real conversations. */
import { communities } from '../../data/mockData'

/* Closeness decides the orbit. Unread weighs most, because the thing you
   haven't answered is the thing that should be nearest. */
function closeness(chat) {
  return (chat.unread || 0) * 3 + (chat.pinned ? 2 : 0) + (chat.online ? 2 : 0) + (chat.typing ? 2 : 0)
}

const RING_FRACTIONS = [0.22, 0.34, 0.46]

function Planet({ chat, x, y, size, delay, reduced, onOpen }) {
  const hot = chat.unread > 0
  const live = chat.typing || chat.online

  return (
    <motion.div
      className="planet"
      style={{ left: x, top: y, width: size, height: size }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...spring, delay }}
    >
      <motion.div
        animate={reduced ? undefined : { y: [0, -7, 0], x: [0, 4, 0] }}
        transition={{ duration: 7 + (size % 5), repeat: Infinity, ease: 'easeInOut', delay }}
        style={{ width: '100%', height: '100%' }}
      >
        <button
          className={`planet__body ${hot ? 'planet__body--hot' : ''}`}
          style={{ background: chat.gradient }}
          onClick={() => onOpen(chat)}
          aria-label={`${chat.name}${chat.unread ? `, ${chat.unread} unread` : ''}`}
        >
          <span className="planet__initials">{chat.initials}</span>
          {hot && <span className="planet__badge tnum">{chat.unread > 9 ? '9+' : chat.unread}</span>}
        </button>

        {/* Unanswered messages travel inward, toward you. */}
        {hot && !reduced && (
          <span className="planet__stream" aria-hidden>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="planet__photon"
                animate={{ x: [0, -x + 0], y: [0, -y + 0], opacity: [0, 1, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.85, ease: 'easeIn' }}
              />
            ))}
          </span>
        )}

        {live && <span className="planet__halo" aria-hidden />}
        <span className="planet__name truncate">{chat.name.split(' ')[0]}</span>
      </motion.div>
    </motion.div>
  )
}

export default function UniversePage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()
  const stageRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [aiOpen, setAiOpen] = useState(false)
  const { chats } = useChatList()
  const me = useMe()

  /* Radii come from the pane, not the viewport — this lives inside a split
     layout, so vmin would be wrong on desktop. */
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const min = Math.min(size.w, size.h)
  const cx = size.w / 2
  const cy = size.h / 2

  const ranked = [...chats].sort((a, b) => closeness(b) - closeness(a))
  const rings = [ranked.slice(0, 3), ranked.slice(3, 7), ranked.slice(7)]

  return (
    <div className="col grow universe-page" style={{ minWidth: 0, minHeight: 0 }}>
      <header className="header">
        {!isDesktop && (
          <Link to="/chats" className="iconbtn" aria-label="Back" style={{ marginLeft: -8 }}>
            <ChevronLeft size={22} />
          </Link>
        )}
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="header__title">Universe</div>
          <div className="header__sub">Unread orbits closest</div>
        </div>
        <div className="header__actions">
          <Link to="/chats" className="iconbtn" aria-label="Back to list">
            <List size={19} />
          </Link>
        </div>
      </header>

      <div ref={stageRef} className="universe">
        {/* Communities sit furthest out, as soft fields rather than objects. */}
        {min > 0 &&
          communities.slice(0, 4).map((c, i) => {
            const a = (i / 4) * Math.PI * 2 + 0.6
            return (
              <span
                key={c.id}
                className="galaxy"
                style={{
                  left: cx + Math.cos(a) * min * 0.62,
                  top: cy + Math.sin(a) * min * 0.62,
                  width: min * 0.34,
                  height: min * 0.34,
                  background: c.gradient,
                }}
                aria-hidden
              />
            )
          })}

        {min > 0 &&
          RING_FRACTIONS.map((f, i) => (
            <motion.span
              key={i}
              className="orbit-ring"
              style={{ width: min * f * 2, height: min * f * 2, left: cx, top: cy }}
              animate={reduced ? undefined : { rotate: 360 }}
              transition={{ duration: 90 + i * 40, repeat: Infinity, ease: 'linear' }}
              aria-hidden
            />
          ))}

        {min > 0 &&
          rings.map((group, ri) =>
            group.map((chat, i) => {
              const r = min * RING_FRACTIONS[ri]
              const a = (i / Math.max(group.length, 1)) * Math.PI * 2 + ri * 0.8
              const planetSize = ri === 0 ? 62 : ri === 1 ? 52 : 44
              return (
                <Planet
                  key={chat.id}
                  chat={chat}
                  x={cx + Math.cos(a) * r - planetSize / 2}
                  y={cy + Math.sin(a) * r - planetSize / 2}
                  size={planetSize}
                  delay={0.05 * (ri * 3 + i)}
                  reduced={reduced}
                  onOpen={(c) => navigate(`/chats/${c.id}`)}
                />
              )
            })
          )}

        {min > 0 && (
          <motion.div
            className="core"
            style={{ left: cx, top: cy }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
          >
            <span className="core__pulse" aria-hidden />
            <Avatar initials={me?.initials ?? ''} gradient={me?.avatarGradient} size={56} />
          </motion.div>
        )}

        {/* The assistant idles beside you rather than in a toolbar. */}
        {min > 0 && (
          <motion.button
            className="ai-orb"
            style={{ left: cx + min * 0.1, top: cy + min * 0.12 }}
            animate={reduced ? undefined : { y: [0, -10, 0], x: [0, 6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setAiOpen(true)}
            aria-label="Open assistant"
          >
            <AiMark size={18} />
          </motion.button>
        )}
      </div>

      <Sheet open={aiOpen} onClose={() => setAiOpen(false)} desktop={isDesktop}>
        <h3 style={{ fontSize: 'var(--fs-17)', marginBottom: 'var(--s1)' }}>Assistant</h3>
        <p style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)', marginBottom: 'var(--s4)' }}>
          Runs on-device. Ask about anything in view.
        </p>
        <div className="col" style={{ gap: 'var(--s2)' }}>
          {['Who am I overdue to reply to?', 'Summarise today across all chats', 'Which threads went quiet this week?'].map((p) => (
            <button key={p} className="chip chip--ai" style={{ height: 42, justifyContent: 'flex-start', width: '100%' }}>
              {p}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
