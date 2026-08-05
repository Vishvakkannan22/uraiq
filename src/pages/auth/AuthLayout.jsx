import { motion } from 'framer-motion'
import AppBackdrop from '../../components/AppBackdrop'
import { ease } from '../../lib/motion'

/**
 * Auth sits on the same drifting backdrop as the rest of the app, so signing in
 * doesn't feel like a different product from what's behind it. The card and
 * footer are the only things above it — everything else here is the wash.
 */
export default function AuthLayout({ children, footer }) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--s6)',
        padding: 'calc(var(--s5) + var(--safe-top)) var(--s5) calc(var(--s5) + var(--safe-bottom))',
      }}
    >
      <AppBackdrop />
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'min(420px, 100%)',
          background: 'var(--surface)',
          borderRadius: 'var(--r-2xl)',
          padding: 'var(--s7) var(--s6) var(--s6)',
          boxShadow: 'var(--e4), inset 0 0 0 1px var(--border)',
        }}
      >
        {children}
      </motion.div>

      {/* In flow, not absolutely positioned — on a short viewport the old
          footer floated up over the card. */}
      {footer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            fontSize: 'var(--fs-12)',
            color: 'var(--text-4)',
          }}
        >
          {footer}
        </motion.div>
      )}
    </div>
  )
}

export { default as Wordmark } from '../../components/brand/Wordmark'
