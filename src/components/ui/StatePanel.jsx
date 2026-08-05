import { motion } from 'framer-motion'
import { ease } from '../../lib/motion'

export default function StatePanel({ icon: Icon, title, body, actionLabel, onAction, compact }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease }}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? 'var(--s7) var(--s5)' : 'var(--s9) var(--s6)',
        gap: 'var(--s2)',
      }}
    >
      {Icon && (
        <div
          className="row"
          style={{
            justifyContent: 'center',
            width: 60,
            height: 60,
            borderRadius: 'var(--r-full)',
            background: 'var(--grad-wash)',
            boxShadow: 'var(--e1), inset 0 0 0 1px var(--border)',
            color: 'var(--brand-600)',
            marginBottom: 'var(--s2)',
          }}
        >
          <Icon size={26} strokeWidth={1.75} />
        </div>
      )}
      <h3 style={{ fontSize: 'var(--fs-17)' }}>{title}</h3>
      {body && (
        <p style={{ fontSize: 'var(--fs-14)', color: 'var(--text-4)', maxWidth: 300 }}>{body}</p>
      )}
      {actionLabel && (
        <button className="btn btn--secondary btn--sm" onClick={onAction} style={{ marginTop: 'var(--s3)' }}>
          {actionLabel}
        </button>
      )}
    </motion.div>
  )
}
