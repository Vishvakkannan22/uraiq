import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, SendHorizontal } from 'lucide-react'
import Sheet from '../../components/ui/Sheet'
import Avatar from '../../components/ui/Avatar'
import { listItem, listStagger, springPop } from '../../lib/motion'
import { commentsByPost, currentUser } from '../../data/mockData'

function Comment({ c }) {
  const [liked, setLiked] = useState(false)

  return (
    <motion.div variants={listItem} className="comment">
      <Avatar initials={c.initials} gradient={c.gradient} size={34} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}>
          <span className="truncate" style={{ fontSize: 'var(--fs-13)', fontWeight: 660, color: 'var(--text)' }}>
            {c.author}
          </span>
          <span style={{ fontSize: 'var(--fs-11)', color: 'var(--text-4)', flexShrink: 0 }}>{c.time}</span>
        </div>
        <p style={{ fontSize: 'var(--fs-14)', color: 'var(--text-2)', lineHeight: 1.45, marginTop: 2 }}>{c.text}</p>
        {/* TODO(milestone 2): no reply-to-comment endpoint exists yet — this
            comment thread is flat, seeded local data. Disabled rather than
            wired to a fake local reply, which would look real and then not
            survive a reload. */}
        <button className="comment__reply" disabled aria-label="Replies aren't available yet">Reply</button>
      </div>
      <button
        className={`comment__like ${liked ? 'comment__like--on' : ''}`}
        onClick={() => setLiked((v) => !v)}
        aria-pressed={liked}
        aria-label="Like comment"
      >
        <motion.span animate={{ scale: liked ? [1, 1.4, 1] : 1 }} transition={springPop} style={{ display: 'flex' }}>
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} strokeWidth={2} />
        </motion.span>
        <span className="tnum">{c.likes + (liked ? 1 : 0)}</span>
      </button>
    </motion.div>
  )
}

export default function CommentsSheet({ post, onClose, desktop }) {
  const [draft, setDraft] = useState('')
  const [mine, setMine] = useState([])

  const seeded = useMemo(
    () => (post ? commentsByPost[post.id] || commentsByPost.default : []),
    [post]
  )
  const all = [...seeded, ...mine]

  function send() {
    const text = draft.trim()
    if (!text) return
    setMine((m) => [
      ...m,
      {
        id: `mine-${Date.now()}`,
        author: currentUser.name,
        initials: currentUser.initials,
        gradient: currentUser.gradient,
        time: 'now',
        text,
        likes: 0,
      },
    ])
    setDraft('')
  }

  return (
    <Sheet open={Boolean(post)} onClose={onClose} desktop={desktop}>
      <h3 style={{ fontSize: 'var(--fs-17)', marginBottom: 'var(--s1)' }}>
        Comments <span className="tnum" style={{ color: 'var(--text-4)', fontWeight: 600 }}>{all.length}</span>
      </h3>
      <p style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)', marginBottom: 'var(--s4)' }}>
        {post ? `On ${post.author}'s post` : ''}
      </p>

      <motion.div variants={listStagger} initial="hidden" animate="show" className="col" style={{ gap: 'var(--s2)' }}>
        <AnimatePresence initial={false}>
          {all.map((c) => <Comment key={c.id} c={c} />)}
        </AnimatePresence>
      </motion.div>

      <div className="comment-composer">
        <Avatar initials={currentUser.initials} gradient={currentUser.gradient} size={32} />
        <div className="search grow">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Add a comment…"
            aria-label="Add a comment"
          />
        </div>
        <button
          className="iconbtn iconbtn--brand"
          onClick={send}
          disabled={!draft.trim()}
          aria-label="Post comment"
        >
          <SendHorizontal size={17} />
        </button>
      </div>
    </Sheet>
  )
}
