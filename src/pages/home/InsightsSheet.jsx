import { motion } from 'framer-motion'
import { BarChart3, Eye, Send, UserPlus, Users } from 'lucide-react'
import Sheet from '../../components/ui/Sheet'
import { bentoItem, bentoStagger, ease } from '../../lib/motion'
import { postInsights } from '../../data/mockData'

function compact(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n)
}

export default function InsightsSheet({ post, onClose, desktop }) {
  const stats = [
    { icon: Eye, label: 'Views', value: compact(postInsights.views) },
    { icon: Users, label: 'Reach', value: compact(postInsights.reach) },
    { icon: UserPlus, label: 'Profile visits', value: compact(postInsights.profileVisits) },
    { icon: Send, label: 'Shares', value: compact(postInsights.shares) },
  ]

  return (
    <Sheet open={Boolean(post)} onClose={onClose} desktop={desktop}>
      <div className="row" style={{ gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
        <div
          className="row"
          style={{ justifyContent: 'center', width: 38, height: 38, borderRadius: 12, background: 'var(--grad)', color: '#fff' }}
        >
          <BarChart3 size={18} />
        </div>
        <div>
          <h3 style={{ fontSize: 'var(--fs-17)' }}>Post insights</h3>
          <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>Counted on-device · never shared</div>
        </div>
      </div>

      <motion.div
        variants={bentoStagger}
        initial="hidden"
        animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--s2)' }}
      >
        {stats.map(({ icon: Icon, label, value }) => (
          <motion.div key={label} variants={bentoItem} className="stat-tile">
            <span className="row" style={{ gap: 6, color: 'var(--text-4)' }}>
              <Icon size={14} />
              <span className="stat-tile__label">{label}</span>
            </span>
            <span className="stat-tile__value tnum" style={{ marginTop: 2 }}>{value}</span>
          </motion.div>
        ))}
      </motion.div>

      <div className="set-label" style={{ marginTop: 'var(--s5)' }}>Where views came from</div>
      <div className="col" style={{ gap: 'var(--s3)' }}>
        {postInsights.breakdown.map((b, i) => (
          <div key={b.label}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-2)' }}>{b.label}</span>
              <span className="tnum" style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)' }}>{b.pct}%</span>
            </div>
            <div className="meter">
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: b.pct / 100 }}
                transition={{ duration: 0.6, delay: 0.06 * i, ease }}
              />
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
