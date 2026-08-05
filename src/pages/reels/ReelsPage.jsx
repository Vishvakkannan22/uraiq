import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion'
import {
  Bookmark, Gauge, Heart, MessageCircle, Music2, Pause, Play, Send, Volume2, VolumeX,
} from 'lucide-react'
import Avatar from '../../components/ui/Avatar'
import ShareSheet from '../../components/ui/ShareSheet'
import CommentsSheet from '../home/CommentsSheet'
import { spring, springPop } from '../../lib/motion'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { reels } from '../../data/mockData'

const REEL_MS = 8000
const DOUBLE_TAP_MS = 260
const SPEEDS = [1, 1.5, 2, 0.5]

/* A horizontal flick has to beat the vertical component by this much before it
   counts, so it can't be triggered while scrolling between reels. */
const SWIPE_PX = 80
const SWIPE_BIAS = 1.5

function compact(v) {
  return typeof v === 'number' && v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(v)
}

function ReelSlide({ reel, active, muted, onToggleMute, speed, onCycleSpeed, onComment, onShare }) {
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [paused, setPaused] = useState(false)
  const [burst, setBurst] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const tapTimer = useRef(null)
  const swipeStart = useRef(null)
  const swiped = useRef(false)
  const progress = useMotionValue(0)

  useEffect(() => () => clearTimeout(tapTimer.current), [])

  /* Resume from where it stopped rather than restarting: remaining time is
     derived from the current value, so pausing mid-reel doesn't rewind it.
     Speed divides the remaining duration. */
  useEffect(() => {
    if (!active) {
      progress.set(0)
      return
    }
    if (paused) return
    const controls = animate(progress, 1, {
      duration: (REEL_MS * (1 - progress.get())) / 1000 / speed,
      ease: 'linear',
    })
    return () => controls.stop()
  }, [active, paused, speed, progress])

  /* Pointer-based rather than a drag: never calls preventDefault, so the
     vertical snap scroll underneath keeps working untouched. */
  function onPointerDown(e) {
    swipeStart.current = { x: e.clientX, y: e.clientY }
    swiped.current = false
  }

  function onPointerUp(e) {
    const s = swipeStart.current
    swipeStart.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (dx > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * SWIPE_BIAS) {
      swiped.current = true
      navigate('/profile')
    }
  }

  function onSurfaceTap() {
    if (swiped.current) return
    if (tapTimer.current) {
      clearTimeout(tapTimer.current)
      tapTimer.current = null
      setLiked(true)
      setBurst((n) => n + 1)
      return
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null
      setPaused((p) => !p)
    }, DOUBLE_TAP_MS)
  }

  return (
    <section className="reel-slide" style={{ background: reel.gradient }}>
      <button
        className="reel-slide__surface"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={onSurfaceTap}
        aria-label={paused ? 'Play' : 'Pause'}
      />

      <div className="reel-slide__scrim" aria-hidden />

      <div className="reel-slide__progress" aria-hidden>
        <motion.span style={{ scaleX: progress }} />
      </div>

      <div className="reel-slide__top">
        <button className="reel-chip" onClick={onCycleSpeed} aria-label={`Playback speed ${speed}x`}>
          <Gauge size={13} /> <span className="tnum">{speed}×</span>
        </button>
        <button className="reel-chip" onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted}>
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>

      {paused && active && (
        <motion.span
          className="reel-slide__paused"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          aria-hidden
        >
          <Play size={30} fill="currentColor" style={{ marginLeft: 4 }} />
        </motion.span>
      )}

      <AnimatePresence>
        {burst > 0 && (
          <motion.span
            key={burst}
            className="reel-slide__burst"
            initial={{ opacity: 0, scale: 0.3, rotate: -12 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.2, 1, 1.6], rotate: [-12, 4, 0, 0] }}
            transition={{ duration: 0.95, times: [0, 0.25, 0.6, 1] }}
            aria-hidden
          >
            <Heart size={110} fill="currentColor" strokeWidth={0} />
          </motion.span>
        )}
      </AnimatePresence>

      <div className="reel-slide__rail">
        <button className="reel-slide__action" onClick={() => setLiked((v) => !v)} aria-label="Like" aria-pressed={liked}>
          <motion.span animate={{ scale: liked ? [1, 1.4, 1] : 1 }} transition={springPop} style={{ display: 'flex' }}>
            <Heart size={27} fill={liked ? '#F43F5E' : 'transparent'} color={liked ? '#F43F5E' : '#fff'} strokeWidth={1.9} />
          </motion.span>
          <span className="tnum">{compact(reel.likes)}</span>
        </button>

        <button className="reel-slide__action" onClick={() => onComment(reel)} aria-label="Comment">
          <MessageCircle size={26} strokeWidth={1.9} />
          <span className="tnum">{compact(reel.comments)}</span>
        </button>

        <button className="reel-slide__action" onClick={() => onShare(reel)} aria-label="Share">
          <Send size={25} strokeWidth={1.9} />
          <span className="tnum">{compact(reel.shares)}</span>
        </button>

        <button className="reel-slide__action" onClick={() => setSaved((v) => !v)} aria-label="Save" aria-pressed={saved}>
          <motion.span animate={{ y: saved ? [0, -5, 0] : 0 }} transition={springPop} style={{ display: 'flex' }}>
            <Bookmark size={25} fill={saved ? '#fff' : 'transparent'} strokeWidth={1.9} />
          </motion.span>
        </button>

        <span className="reel-slide__disc" aria-hidden>
          <motion.span
            animate={paused || muted ? { rotate: 0 } : { rotate: 360 }}
            transition={paused || muted ? { duration: 0.2 } : { duration: 6 / speed, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'flex' }}
          >
            <Music2 size={15} />
          </motion.span>
        </span>
      </div>

      <div className="reel-slide__meta">
        <div className="row" style={{ gap: 9, marginBottom: 8 }}>
          <button className="row" style={{ gap: 9, color: '#fff' }} onClick={() => navigate('/profile')}>
            <Avatar initials={reel.user.slice(0, 2).toUpperCase()} gradient={reel.gradient} size={32} />
            <span style={{ fontSize: 'var(--fs-14)', fontWeight: 660 }}>@{reel.user}</span>
          </button>
          <button className="reel-slide__follow">Follow</button>
        </div>

        <p
          className={expanded ? '' : 'clamp-2'}
          onClick={() => setExpanded((v) => !v)}
          style={{ fontSize: 'var(--fs-14)', lineHeight: 1.42, color: 'rgba(255,255,255,.94)', cursor: 'pointer' }}
        >
          {reel.caption}
          {!expanded && reel.caption.length > 62 && <span className="reel-more"> more</span>}
        </p>

        <div className="row" style={{ gap: 7, marginTop: 9, fontSize: 'var(--fs-12)', color: 'rgba(255,255,255,.78)' }}>
          {paused ? <Pause size={12} /> : muted ? <VolumeX size={12} /> : <Music2 size={12} />}
          <span className="truncate">{muted ? 'Sound off' : reel.music}</span>
        </div>
      </div>
    </section>
  )
}

export default function ReelsPage() {
  const isDesktop = useIsDesktop()
  const trackRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [speedIndex, setSpeedIndex] = useState(0)
  const [commentReel, setCommentReel] = useState(null)
  const [shareReel, setShareReel] = useState(null)

  /* Which reel is on screen drives playback and the progress bar. An observer
     beats a scroll handler here: with snap points the answer only changes when
     a slide actually crosses the threshold. */
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveIndex(Number(entry.target.dataset.index))
        }
      },
      { root: track, threshold: 0.6 }
    )

    for (const slide of track.children) observer.observe(slide)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div ref={trackRef} className="reels no-scrollbar">
        {reels.map((reel, i) => (
          <div key={reel.id} className="reels__snap" data-index={i}>
            <ReelSlide
              reel={reel}
              active={activeIndex === i}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              speed={SPEEDS[speedIndex]}
              onCycleSpeed={() => setSpeedIndex((s) => (s + 1) % SPEEDS.length)}
              onComment={setCommentReel}
              onShare={setShareReel}
            />
          </div>
        ))}
      </div>

      <CommentsSheet
        post={commentReel && { id: commentReel.id, author: `@${commentReel.user}` }}
        onClose={() => setCommentReel(null)}
        desktop={isDesktop}
      />

      <ShareSheet
        open={Boolean(shareReel)}
        onClose={() => setShareReel(null)}
        desktop={isDesktop}
        label="this reel"
      />
    </>
  )
}
