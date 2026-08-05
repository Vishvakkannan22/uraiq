import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, Check, Copy, Link2, Send } from 'lucide-react'
import Sheet from './Sheet'
import Avatar from './Avatar'
import { springPop } from '../../lib/motion'
import { shareTargets } from '../../data/mockData'

/** Shared by the feed and reels. `open` drives it; there's nothing to send. */
export default function ShareSheet({ open, onClose, desktop, label = 'this post' }) {
  const [sent, setSent] = useState([])
  const [copied, setCopied] = useState(false)

  function toggle(id) {
    setSent((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  function copyLink() {
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <Sheet open={open} onClose={onClose} desktop={desktop}>
      <h3 style={{ fontSize: 'var(--fs-17)', marginBottom: 'var(--s1)' }}>Send {label}</h3>
      <p style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)', marginBottom: 'var(--s4)' }}>
        Shared links stay end-to-end encrypted.
      </p>

      <div className="share-grid">
        {shareTargets.map((t) => {
          const done = sent.includes(t.id)
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.94 }}
              className="share-target"
              onClick={() => toggle(t.id)}
              aria-pressed={done}
            >
              <span style={{ position: 'relative' }}>
                <Avatar initials={t.initials} gradient={t.gradient} size={52} />
                {done && (
                  <motion.span
                    className="share-target__check"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={springPop}
                  >
                    <Check size={13} strokeWidth={3.2} />
                  </motion.span>
                )}
              </span>
              <span className="truncate" style={{ maxWidth: 60 }}>{t.name}</span>
            </motion.button>
          )
        })}
      </div>

      <div className="col" style={{ gap: 'var(--s2)', marginTop: 'var(--s5)' }}>
        <button className="popover__item" onClick={copyLink}>
          {copied ? <Check size={17} style={{ color: 'var(--success)' }} /> : <Link2 size={17} />}
          {copied ? 'Link copied' : 'Copy link'}
        </button>
        <button className="popover__item"><Copy size={17} /> Copy text</button>
        <button className="popover__item"><Bookmark size={17} /> Save to collection</button>
      </div>

      <button
        className="btn btn--primary btn--block btn--sm"
        style={{ marginTop: 'var(--s5)', gap: 8 }}
        disabled={sent.length === 0}
        onClick={onClose}
      >
        <Send size={15} />
        {sent.length === 0 ? 'Pick someone' : `Send to ${sent.length}`}
      </button>
    </Sheet>
  )
}
