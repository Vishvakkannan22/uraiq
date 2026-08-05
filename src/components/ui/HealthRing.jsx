import { motion } from 'framer-motion'
import { ease } from '../../lib/motion'

const TONE = {
  ok: 'var(--success)',
  warn: 'var(--warning)',
  stop: 'var(--danger)',
}

/**
 * Score ring. Drawn rather than a progress bar because the number and its band
 * need to read at 22px in a header and at 96px in a sheet from the same
 * component — a bar can't do both.
 */
export default function HealthRing({ score, tone = 'ok', size = 22, stroke, showValue = false }) {
  const w = stroke ?? Math.max(2.5, size * 0.11)
  const r = (size - w) / 2
  const c = 2 * Math.PI * r

  return (
    <span className="health-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--track)" strokeWidth={w}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={TONE[tone]}
          strokeWidth={w}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 0.9, ease }}
        />
      </svg>
      {showValue && (
        <span className="health-ring__value tnum" style={{ fontSize: size * 0.28 }}>
          {score}
        </span>
      )}
    </span>
  )
}
