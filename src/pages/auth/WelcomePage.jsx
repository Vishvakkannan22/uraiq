import { Navigate, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import AppBackdrop from '../../components/AppBackdrop'
import AppMark from '../../components/brand/AppMark'
import Wordmark from '../../components/brand/Wordmark'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { useAuth } from '../../lib/auth'
import { ease } from '../../lib/motion'

const RINGS = [180, 260, 340]
const DOTS = [
  { ring: 0, angle: -35 },
  { ring: 1, angle: 165 },
  { ring: 2, angle: 100 },
]

/**
 * A phone-native welcome screen used both before sign-in and immediately after
 * sign-in. The post-sign-in route gives the user a deliberate hand-off into
 * the app instead of dropping them straight into a busy feed.
 *
 * Onboarding splashes are a phone-native pattern — a wide desktop viewport
 * has room to show the real sign-in card immediately and gains nothing from
 * an interstitial, so this redirects straight past itself there. Same for
 * anyone already signed in: this screen only ever makes sense once, before
 * the first login.
 */
export default function WelcomePage({ afterSignIn = false }) {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const { authed } = useAuth()
  const reduced = useReducedMotion()

  if (afterSignIn && !authed) return <Navigate to="/login" replace />
  if (!afterSignIn && authed) return <Navigate to="/chats" replace />
  if (!afterSignIn && isDesktop) return <Navigate to="/login" replace />

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        padding: 'calc(var(--s5) + var(--safe-top)) var(--s5) calc(var(--s6) + var(--safe-bottom))',
        overflow: 'hidden',
      }}
    >
      <AppBackdrop />

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="row"
        style={{ position: 'relative', zIndex: 1, gap: 10 }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--surface)', boxShadow: 'var(--e2), inset 0 0 0 1px var(--border)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}
        >
          <AppMark size={26} radius={8} />
        </div>
        <Wordmark size={20} />
      </motion.div>

      <div
        style={{
          position: 'relative', zIndex: 1, flex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 'var(--s8)', minHeight: 0,
        }}
      >
        <div style={{ position: 'relative', width: RINGS[2], height: RINGS[2], flexShrink: 0 }}>
          {RINGS.map((size, i) => (
            <motion.span
              key={size}
              className="orbit-ring"
              style={{ width: size, height: size, left: '50%', top: '50%' }}
              animate={reduced ? undefined : { rotate: 360 }}
              transition={{ duration: 70 + i * 30, repeat: Infinity, ease: 'linear' }}
              aria-hidden
            />
          ))}
          {DOTS.map(({ ring, angle }, i) => {
            const r = RINGS[ring] / 2
            const rad = (angle * Math.PI) / 180
            return (
              <span
                key={i}
                aria-hidden
                style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: `translate(${Math.cos(rad) * r}px, ${Math.sin(rad) * r}px) translate(-50%, -50%)`,
                  width: 9, height: 9, borderRadius: '50%',
                  background: 'var(--surface)', boxShadow: 'var(--e1), inset 0 0 0 1px var(--brand-300)',
                }}
              >
                <span
                  style={{
                    position: 'absolute', inset: 2.5, borderRadius: '50%', background: 'var(--brand-400)',
                  }}
                />
              </span>
            )
          })}

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            style={{
              position: 'absolute', inset: (RINGS[2] - 148) / 2,
              borderRadius: '50%', background: 'var(--surface)',
              boxShadow: 'var(--e4), inset 0 0 0 1px var(--border)',
              display: 'grid', placeItems: 'center',
            }}
          >
            <AppMark size={72} radius={22} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          style={{ textAlign: 'center', maxWidth: 340 }}
        >
          <h1
            style={{
              fontSize: 'clamp(1.5rem, 6vw, 1.875rem)', fontWeight: 800,
              letterSpacing: '-0.025em', lineHeight: 1.15, color: 'var(--text)',
              marginBottom: 'var(--s3)',
            }}
          >
            Calm, intelligent communication.
          </h1>
          <p style={{ fontSize: 'var(--fs-15)', lineHeight: 1.5, color: 'var(--text-3)' }}>
            A refined messaging space designed for clarity, privacy, and everyday focus.
          </p>
        </motion.div>
      </div>

      <motion.button
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.32, ease }}
        onClick={() => navigate(afterSignIn ? '/chats' : '/login', { replace: afterSignIn })}
        style={{
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center',
          width: '100%', height: 56, padding: '0 6px 0 var(--s6)',
          borderRadius: 'var(--r-full)',
          background: 'var(--surface)',
          boxShadow: 'var(--e2), inset 0 0 0 1.5px var(--brand-300)',
          flexShrink: 0,
        }}
      >
        <span style={{ flex: 1, textAlign: 'center', fontSize: 'var(--fs-15)', fontWeight: 700, color: 'var(--text)' }}>
          Continue
        </span>
        <span
          aria-hidden
          style={{
            width: 44, height: 44, borderRadius: 'var(--r-lg)', flexShrink: 0,
            background: 'var(--grad)', boxShadow: 'var(--e-brand)',
            display: 'grid', placeItems: 'center', color: 'var(--text-on-brand)',
          }}
        >
          <ArrowRight size={19} />
        </span>
      </motion.button>
    </div>
  )
}
