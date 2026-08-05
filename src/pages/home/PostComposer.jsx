import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Globe, Image, Lock, Users, X } from 'lucide-react'
import Sheet from '../../components/ui/Sheet'
import Avatar from '../../components/ui/Avatar'
import { springPop } from '../../lib/motion'
import { currentUser } from '../../data/mockData'

const AUDIENCES = [
  { id: 'public', label: 'Everyone', icon: Globe },
  { id: 'campus', label: 'Campus', icon: Users },
  { id: 'close', label: 'Close friends', icon: Lock },
]

const SWATCHES = [
  'linear-gradient(135deg, #F0ABFC, #A855F7)',
  'linear-gradient(135deg, #A5B4FC, #4F46E5)',
  'linear-gradient(135deg, #FDE68A, #F59E0B)',
  'linear-gradient(135deg, #FDA4AF, #E11D48)',
  'linear-gradient(135deg, #D9F99D, #65A30D)',
  'linear-gradient(135deg, #C4B5FD, #6D28D9)',
]

export default function PostComposer({ open, onClose, desktop, onPost }) {
  const [text, setText] = useState('')
  const [audience, setAudience] = useState('public')
  const [media, setMedia] = useState(null)

  function reset() {
    setText('')
    setMedia(null)
    setAudience('public')
  }

  function submit() {
    if (!text.trim() && !media) return
    onPost({ text: text.trim(), media, audience })
    reset()
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} desktop={desktop}>
      <h3 style={{ fontSize: 'var(--fs-17)', marginBottom: 'var(--s4)' }}>New post</h3>

      <div className="row" style={{ gap: 'var(--s3)', alignItems: 'flex-start' }}>
        <Avatar initials={currentUser.initials} gradient={currentUser.gradient} size={40} />
        <textarea
          className="composer-field"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening?"
          rows={3}
          aria-label="Post text"
        />
      </div>

      <AnimatePresence>
        {media && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="composer-preview" style={{ background: media }}>
              <button className="iconbtn iconbtn--sm composer-preview__x" onClick={() => setMedia(null)} aria-label="Remove media">
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="row" style={{ gap: 6, marginTop: 'var(--s4)', flexWrap: 'wrap' }}>
        <span className="row" style={{ gap: 6, color: 'var(--text-4)', fontSize: 'var(--fs-12)', marginRight: 4 }}>
          <Image size={15} /> Media
        </span>
        {SWATCHES.map((s) => (
          <motion.button
            key={s}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMedia(s)}
            className={`swatch ${media === s ? 'swatch--on' : ''}`}
            style={{ background: s }}
            aria-label="Pick media"
            aria-pressed={media === s}
          />
        ))}
      </div>

      <div className="row" style={{ gap: 6, marginTop: 'var(--s5)' }}>
        {AUDIENCES.map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            whileTap={{ scale: 0.96 }}
            transition={springPop}
            className={`chip ${audience === id ? 'chip--ai' : ''}`}
            onClick={() => setAudience(id)}
            aria-pressed={audience === id}
          >
            <Icon size={14} /> {label}
          </motion.button>
        ))}
      </div>

      <button
        className="btn btn--primary btn--block"
        style={{ marginTop: 'var(--s5)' }}
        disabled={!text.trim() && !media}
        onClick={submit}
      >
        Post
      </button>
    </Sheet>
  )
}
