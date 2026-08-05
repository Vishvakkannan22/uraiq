import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ShieldCheck } from 'lucide-react'
import Sheet from './Sheet'
import { REPORT_REASONS } from '../../lib/moderation'
import { springPop } from '../../lib/motion'

/**
 * Reporting flow. Two steps rather than one: pick the standard, then confirm
 * with optional context. The second step also states what happens next, which
 * is the part most report flows leave out and the reason people stop filing.
 */
export default function ReportSheet({ open, onClose, desktop, subject, onSubmit }) {
  const [reason, setReason] = useState(null)
  const [note, setNote] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(true)

  function close() {
    onClose()
    setTimeout(() => {
      setReason(null)
      setNote('')
    }, 260)
  }

  function submit() {
    onSubmit?.({ reason, note, alsoBlock })
    close()
  }

  return (
    <Sheet open={open} onClose={close} desktop={desktop}>
      <h3 style={{ fontSize: 'var(--fs-17)', marginBottom: 'var(--s1)' }}>
        Report {subject || 'this content'}
      </h3>
      <p style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)', marginBottom: 'var(--s4)' }}>
        Which standard does this breach?
      </p>

      <div className="col" style={{ gap: 'var(--s1)' }}>
        {REPORT_REASONS.map((r) => {
          const on = reason === r.id
          return (
            <motion.button
              key={r.id}
              whileTap={{ scale: 0.99 }}
              className={`choice ${on ? 'choice--on' : ''}`}
              onClick={() => setReason(r.id)}
              aria-pressed={on}
            >
              <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                <span className="choice__title">{r.label}</span>
                <span className="choice__body">{r.blurb}</span>
              </span>
              {on && (
                <motion.span className="choice__check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springPop}>
                  <Check size={13} strokeWidth={3.2} />
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </div>

      {reason && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springPop}>
          <div className="field" style={{ marginTop: 'var(--s4)' }}>
            <label className="field__label" htmlFor="report-note">Anything else? (optional)</label>
            <textarea
              id="report-note"
              className="field__input"
              style={{ height: 78, padding: 'var(--s3) var(--s4)', resize: 'none', lineHeight: 1.5 }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Context helps reviewers decide faster"
            />
          </div>

          <label className="row" style={{ gap: 'var(--s3)', marginTop: 'var(--s4)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={alsoBlock}
              onChange={(e) => setAlsoBlock(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--brand-500)' }}
            />
            <span style={{ fontSize: 'var(--fs-14)', color: 'var(--text-2)' }}>
              Also block this account
            </span>
          </label>

          <div className="notice notice--info" style={{ marginTop: 'var(--s4)' }}>
            <ShieldCheck size={16} />
            <span>
              A reviewer sees the reported content and your note — not your chat history.
              You'll get the outcome in Activity.
            </span>
          </div>

          <button className="btn btn--primary btn--block" style={{ marginTop: 'var(--s4)' }} onClick={submit}>
            Submit report
          </button>
        </motion.div>
      )}
    </Sheet>
  )
}
