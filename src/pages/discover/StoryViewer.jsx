import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, MoreHorizontal, SendHorizontal, X } from 'lucide-react'
import Avatar from '../../components/ui/Avatar'
import { stories } from '../../data/mockData'

const FRAME_MS = 5000

export default function StoryViewer() {
  const { storyId } = useParams()
  const navigate = useNavigate()
  const story = stories.find((s) => s.id === storyId)
  const [frame, setFrame] = useState(0)
  const [paused, setPaused] = useState(false)

  const close = useCallback(() => navigate(-1), [navigate])
  const frames = story?.frames || []

  const next = useCallback(() => {
    setFrame((f) => {
      if (f + 1 >= frames.length) { close(); return f }
      return f + 1
    })
  }, [frames.length, close])

  useEffect(() => {
    if (paused || !frames.length) return
    const t = setTimeout(next, FRAME_MS)
    return () => clearTimeout(t)
  }, [frame, paused, next, frames.length])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') setFrame((f) => Math.max(0, f - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, next])

  if (!story || !frames.length) return <Navigate to="/search" replace />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="story-stage"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'relative',
          width: 'min(430px, 100vw)',
          height: 'min(92dvh, 860px)',
          borderRadius: 'clamp(0px, 3vw, 22px)',
          overflow: 'hidden',
          background: frames[frame],
          boxShadow: 'var(--e4)',
        }}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {/* progress */}
        <div className="row" style={{ position: 'absolute', top: 12, left: 12, right: 12, gap: 4, zIndex: 3 }}>
          {frames.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 999, background: 'rgba(255,255,255,.32)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: i < frame ? '100%' : '0%' }}
                animate={{ width: i < frame ? '100%' : i === frame ? '100%' : '0%' }}
                transition={i === frame ? { duration: FRAME_MS / 1000, ease: 'linear' } : { duration: 0 }}
                style={{ height: '100%', background: '#fff' }}
              />
            </div>
          ))}
        </div>

        <div className="row" style={{ position: 'absolute', top: 26, left: 12, right: 8, gap: 10, zIndex: 3 }}>
          <Avatar initials={story.initials} gradient={story.gradient} size={32} />
          <div className="grow">
            <div style={{ fontWeight: 640, fontSize: 'var(--fs-13)', color: '#fff' }}>{story.name}</div>
            <div style={{ fontSize: 'var(--fs-11)', color: 'rgba(255,255,255,.7)' }}>{story.time} ago</div>
          </div>
          <button className="iconbtn iconbtn--onDark iconbtn--sm" aria-label="More"><MoreHorizontal size={18} /></button>
          <button className="iconbtn iconbtn--onDark iconbtn--sm" onClick={close} aria-label="Close"><X size={18} /></button>
        </div>

        {/* tap zones */}
        <button onClick={() => setFrame((f) => Math.max(0, f - 1))} aria-label="Previous" style={{ position: 'absolute', inset: '60px auto 90px 0', width: '32%', zIndex: 2 }} />
        <button onClick={next} aria-label="Next" style={{ position: 'absolute', inset: '60px 0 90px auto', width: '45%', zIndex: 2 }} />

        <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: 160, background: 'linear-gradient(transparent, rgba(0,0,0,.6))', pointerEvents: 'none' }} />

        <div className="row" style={{ position: 'absolute', bottom: 16, left: 14, right: 14, gap: 10, zIndex: 3 }}>
          <div
            className="row grow"
            style={{
              gap: 8, height: 42, padding: '0 16px', borderRadius: 999,
              background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.66)',
              fontSize: 'var(--fs-14)',
            }}
          >
            Reply to {story.name}…
          </div>
          <button className="iconbtn iconbtn--onDark" aria-label="Send reply"><SendHorizontal size={19} /></button>
        </div>

        <div className="row" style={{ position: 'absolute', bottom: 70, left: 16, gap: 5, fontSize: 'var(--fs-12)', color: 'rgba(255,255,255,.78)', zIndex: 3 }}>
          <Eye size={13} /> <span className="tnum">{story.viewers}</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
