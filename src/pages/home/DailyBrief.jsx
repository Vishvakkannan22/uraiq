import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, ChevronRight, Clock, MoonStar, Sparkles } from 'lucide-react'
import Avatar from '../../components/ui/Avatar'
import AiMark from '../../components/brand/AiMark'
import { listItem, listStagger } from '../../lib/motion'
import { dailyBrief } from '../../lib/assistant'

/**
 * The assistant's briefing: what happened, who is waiting, what is coming.
 *
 * Ordered by obligation rather than recency — people waiting on you come
 * before anything you might merely want to read. A summary that opens with
 * headlines buries the one thing that actually needed you.
 */
export default function DailyBrief({ onNavigate }) {
  const navigate = useNavigate()
  const brief = dailyBrief()

  function go(chatId) {
    onNavigate?.()
    navigate(`/chats/${chatId}`)
  }

  return (
    <>
      <div className="row" style={{ gap: 'var(--s3)', marginBottom: 'var(--s2)' }}>
        <div
          className="row"
          style={{ justifyContent: 'center', width: 40, height: 40, borderRadius: 13, background: 'var(--grad)', color: '#fff' }}
        >
          <AiMark size={21} strokeWidth={2} />
        </div>
        <div className="grow" style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 'var(--fs-17)' }}>Your brief</h3>
          <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>
            {brief.counts.messages} messages across {brief.counts.threads} threads {brief.window}
          </div>
        </div>
      </div>

      {/* Obligation first. */}
      <div className="set-label" style={{ marginTop: 'var(--s5)' }}>
        Waiting on you<span className="tnum" style={{ marginLeft: 6 }}>{brief.needsYou.length}</span>
      </div>
      <motion.div variants={listStagger} initial="hidden" animate="show" className="col" style={{ gap: 'var(--s1)' }}>
        {brief.needsYou.map((p) => (
          <motion.button key={p.chatId} variants={listItem} className="brief-row" onClick={() => go(p.chatId)}>
            <Avatar initials={p.initials} gradient={p.gradient} size={38} />
            <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
              <span className="row" style={{ gap: 6 }}>
                <span className="truncate brief-row__name">{p.name}</span>
                <span className="brief-row__wait">
                  <Clock size={10} /> {p.waiting}
                </span>
              </span>
              <span className="brief-row__reason">{p.reason}</span>
            </span>
            <ChevronRight size={16} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
          </motion.button>
        ))}
      </motion.div>

      <div className="set-label" style={{ marginTop: 'var(--s5)' }}>What happened</div>
      <div className="col" style={{ gap: 'var(--s2)' }}>
        {brief.summary.map((line) => (
          <div key={line} className="moment">
            <span className="moment__dot" aria-hidden />
            {line}
          </div>
        ))}
      </div>

      <div className="set-label" style={{ marginTop: 'var(--s5)' }}>Coming up</div>
      <div className="col" style={{ gap: 'var(--s2)' }}>
        {brief.comingUp.map((e) => (
          <div key={e.id} className="brief-event">
            <span className="brief-event__icon"><CalendarClock size={16} /></span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="truncate brief-row__name">{e.title}</span>
              <span className="brief-row__reason">
                {e.when}{e.where ? ` · ${e.where}` : ''} · from {e.source}
              </span>
            </span>
          </div>
        ))}
      </div>

      {brief.quiet.length > 0 && (
        <>
          <div className="set-label" style={{ marginTop: 'var(--s5)' }}>Gone quiet</div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {brief.quiet.map((p) => (
              <button key={p.chatId} className="chip" onClick={() => go(p.chatId)}>
                <MoonStar size={13} />
                {p.name.split(' ')[0]} · {p.days}d
              </button>
            ))}
          </div>
        </>
      )}

      <div className="notice notice--info" style={{ marginTop: 'var(--s5)' }}>
        <Sparkles size={16} />
        <span>Built on-device from your own threads. Nothing here was sent anywhere to produce it.</span>
      </div>
    </>
  )
}
