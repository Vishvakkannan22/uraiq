import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Clock } from 'lucide-react'
import { ease } from '../../lib/motion'

/**
 * Poll block. Options read as plain buttons until you vote, then each one
 * fills to its share — the bar grows *inside* the option rather than sitting
 * under it, so the result reads without adding a second row of chrome.
 */
export default function Poll({ poll }) {
  const [choice, setChoice] = useState(null)

  const seedTotal = poll.options.reduce((a, o) => a + o.votes, 0)
  const total = seedTotal + (choice ? 1 : 0)

  return (
    <div className="poll" onClick={(e) => e.stopPropagation()}>
      <div className="poll__q">{poll.question}</div>

      <div className="col" style={{ gap: 'var(--s2)' }}>
        {poll.options.map((o) => {
          const votes = o.votes + (choice === o.id ? 1 : 0)
          const pct = total ? Math.round((votes / total) * 100) : 0
          const picked = choice === o.id

          return (
            <button
              key={o.id}
              className={`poll__opt ${choice ? 'poll__opt--voted' : ''} ${picked ? 'poll__opt--mine' : ''}`}
              onClick={() => !choice && setChoice(o.id)}
              disabled={Boolean(choice)}
              aria-pressed={picked}
            >
              {choice && (
                <motion.span
                  className="poll__fill"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: pct / 100 }}
                  transition={{ duration: 0.55, ease }}
                  aria-hidden
                />
              )}
              <span className="poll__label truncate">{o.label}</span>
              {picked && <Check size={14} className="poll__check" strokeWidth={3} />}
              {choice && <span className="poll__pct tnum">{pct}%</span>}
            </button>
          )
        })}
      </div>

      <div className="poll__foot">
        <span className="tnum">{total.toLocaleString()} votes</span>
        <span className="row" style={{ gap: 4 }}><Clock size={11} /> {poll.closesIn}</span>
      </div>
    </div>
  )
}
