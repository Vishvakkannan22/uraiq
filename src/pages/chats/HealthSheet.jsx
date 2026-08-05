import { motion } from 'framer-motion'
import { Flame, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import Sheet from '../../components/ui/Sheet'
import HealthRing from '../../components/ui/HealthRing'
import { ease, listItem, listStagger } from '../../lib/motion'
import { momentsOf } from '../../lib/conversationHealth'

/** 14-day tone line. Inline SVG — one path, no charting dependency. */
function Sparkline({ series, tone }) {
  const w = 260
  const h = 46
  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = Math.max(max - min, 1)

  const pts = series.map((v, i) => [
    (i / (series.length - 1)) * w,
    h - ((v - min) / span) * (h - 8) - 4,
  ])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${d} L${w} ${h} L0 ${h} Z`
  const stroke = tone === 'ok' ? 'var(--success)' : tone === 'warn' ? 'var(--warning)' : 'var(--danger)'

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none" aria-hidden>
      <path d={area} fill={stroke} opacity="0.10" />
      <motion.path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease }}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export default function HealthSheet({ open, onClose, desktop, chat, health }) {
  if (!chat || !health) return null
  const moments = momentsOf(chat.id)
  const up = health.trend >= 0

  return (
    <Sheet open={open} onClose={onClose} desktop={desktop}>
      <div className="row" style={{ gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
        <HealthRing score={health.score} tone={health.band.tone} size={78} showValue />
        <div className="grow" style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 'var(--fs-17)' }}>{health.band.label}</h3>
          <p style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)', marginTop: 3, lineHeight: 1.45 }}>
            {health.band.note}
          </p>
          <span className={`trend ${up ? 'trend--up' : 'trend--down'}`}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {up ? '+' : ''}{health.trend} this week
          </span>
        </div>
      </div>

      <div className="notice notice--info">
        <Sparkles size={16} />
        <span>
          This describes the conversation, not either of you. {chat.name.split(' ')[0]} can't
          see your score and you can't see theirs.
        </span>
      </div>

      <div className="set-label" style={{ marginTop: 'var(--s5)' }}>Last 14 days</div>
      <Sparkline series={health.series} tone={health.band.tone} />

      <div className="set-label" style={{ marginTop: 'var(--s5)' }}>Signals</div>
      <div className="col" style={{ gap: 'var(--s3)' }}>
        {health.signals.map((s, i) => (
          <div key={s.id}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-2)' }}>{s.label}</span>
              <span className="tnum" style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)' }}>{s.value}</span>
            </div>
            <div className="meter">
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: s.value / 100 }}
                transition={{ duration: 0.6, delay: 0.05 * i, ease }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="row" style={{ gap: 'var(--s3)', marginTop: 'var(--s5)' }}>
        <div className="stat-tile grow">
          <span className="row" style={{ gap: 6, color: 'var(--warning)' }}>
            <Flame size={14} />
            <span className="stat-tile__label">Respectful streak</span>
          </span>
          <span className="stat-tile__value tnum" style={{ marginTop: 2 }}>{health.streak} days</span>
        </div>
      </div>

      {moments.length > 0 && (
        <>
          <div className="set-label" style={{ marginTop: 'var(--s5)' }}>Moments</div>
          <motion.div variants={listStagger} initial="hidden" animate="show" className="col" style={{ gap: 'var(--s2)' }}>
            {moments.map((m) => (
              <motion.div key={m} variants={listItem} className="moment">
                <span className="moment__dot" aria-hidden />
                {m}
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </Sheet>
  )
}
