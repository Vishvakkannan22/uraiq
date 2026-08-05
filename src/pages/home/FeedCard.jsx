import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Bookmark, Heart, MessageSquare, MoreHorizontal, Play, Repeat2, Send } from 'lucide-react'
import Avatar from '../../components/ui/Avatar'
import RichText from '../../components/ui/RichText'
import Poll from './Poll'
import { listItem, spring, springPop } from '../../lib/motion'

function compact(n) {
  if (n < 1000) return String(n)
  const k = n / 1000
  return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`
}

/* Long enough to catch a deliberate double tap, short enough that a single tap
   opening the viewer doesn't feel laggy. */
const DOUBLE_TAP_MS = 260

/**
 * One card for every kind of post. `media.kind` only changes how the media area
 * is composed — it never surfaces a "News"/"Video"/"Photo" label, because the
 * feed reads as one continuous stream rather than a filtered list.
 */
export default function FeedCard({
  post, scrollRef, onOpenMedia, onComment, onShare, onMenu, onSave,
  followed, onToggleFollow, saved, reposted, onRepost,
}) {
  const [liked, setLiked] = useState(false)
  const [burst, setBurst] = useState(0)
  const cardRef = useRef(null)
  const tapTimer = useRef(null)
  const reduced = useReducedMotion()
  const { media } = post

  useEffect(() => () => clearTimeout(tapTimer.current), [])

  /* Progress of this card through the viewport, 0 as it enters the bottom to 1
     as it clears the top. Drives both the card's own settle and the parallax
     drift of its media. */
  const { scrollYProgress } = useScroll({
    target: cardRef,
    container: scrollRef,
    offset: ['start end', 'end start'],
  })
  const scale = useTransform(scrollYProgress, [0, 0.16, 0.84, 1], [0.955, 1, 1, 0.975])
  const opacity = useTransform(scrollYProgress, [0, 0.12, 0.88, 1], [0.42, 1, 1, 0.55])
  /* Media is 112% tall and drifts within its frame, so the edges never show. */
  const mediaY = useTransform(scrollYProgress, [0, 1], ['-5.5%', '5.5%'])

  function likeNow() {
    setLiked(true)
    setBurst((n) => n + 1)
  }

  /* One tap opens the viewer, two tap-likes. The timer is what separates them. */
  function onMediaTap() {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current)
      tapTimer.current = null
      likeNow()
      return
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null
      onOpenMedia(post)
    }, DOUBLE_TAP_MS)
  }

  return (
    /* Two elements on purpose: the outer one owns the stagger variants, the
       inner one owns the scroll-driven values. Binding a MotionValue to
       `opacity` in style while a variant also animates `opacity` makes the two
       fight over the same property. */
    <motion.div ref={cardRef} variants={listItem}>
    <motion.article className="post" style={reduced ? undefined : { scale, opacity }}>
      {post.repostedBy && (
        <div className="post__repost">
          <Repeat2 size={13} /> {post.repostedBy} reposted
        </div>
      )}

      <header className="post__head">
        <Avatar initials={post.initials} gradient={post.gradient} size={40} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="truncate" style={{ fontWeight: 660, fontSize: 'var(--fs-14)', color: 'var(--text)' }}>
            {post.author}
          </div>
          <div className="truncate" style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>
            @{post.handle} · {post.time}
          </div>
        </div>
        <button
          className={`follow-btn ${followed ? 'follow-btn--on' : ''}`}
          onClick={() => onToggleFollow(post.handle)}
          aria-pressed={followed}
        >
          {followed ? 'Following' : 'Follow'}
        </button>
        <button className="iconbtn iconbtn--sm" onClick={() => onMenu(post)} aria-label={`More from ${post.author}`}>
          <MoreHorizontal size={18} />
        </button>
      </header>

      {media && (
        <div
          className="post__media"
          style={{ aspectRatio: media.ratio }}
          onClick={onMediaTap}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onOpenMedia(post)}
          aria-label="Open media"
        >
          {/* The layoutId lives on the clipping layer, the parallax on its
              child. Framer drives transform during a shared-layout morph, so
              a MotionValue on the same element would be overwritten. */}
          <motion.div layoutId={`media-${post.id}`} className="post__mediaLayer" transition={spring}>
            <motion.div
              className="post__mediaFill"
              style={{ background: media.gradient, y: reduced ? 0 : mediaY }}
            />
          </motion.div>

          {media.kind === 'clip' && (
            <>
              <span className="post__play" aria-hidden>
                <Play size={22} fill="currentColor" style={{ marginLeft: 3 }} />
              </span>
              <span className="post__duration tnum">{media.duration}</span>
            </>
          )}

          {media.kind === 'article' && (
            <div className="post__overlay">
              <h3 className="post__headline">{media.headline}</h3>
              <span className="post__source">{media.source}</span>
            </div>
          )}

          {/* Double-tap burst. Keyed on a counter so a repeat tap replays it. */}
          <AnimatePresence>
            {burst > 0 && (
              <motion.span
                key={burst}
                className="post__burst"
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.15, 1, 1.5] }}
                transition={{ duration: 0.9, times: [0, 0.25, 0.6, 1] }}
                aria-hidden
              >
                <Heart size={82} fill="currentColor" strokeWidth={0} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}

      {post.text && (
        <p className="post__text">
          <RichText text={post.text} />
        </p>
      )}

      {post.poll && <Poll poll={post.poll} />}

      <footer className="post__actions">
        <button
          className={`post__action ${liked ? 'post__action--liked' : ''}`}
          onClick={() => (liked ? setLiked(false) : likeNow())}
          aria-pressed={liked}
          aria-label="Like"
        >
          <motion.span animate={{ scale: liked ? [1, 1.4, 1] : 1 }} transition={springPop} style={{ display: 'flex' }}>
            <Heart size={19} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.9} />
          </motion.span>
          <span className="tnum">{compact(post.likes + (liked ? 1 : 0))}</span>
        </button>

        <button className="post__action" onClick={() => onComment(post)} aria-label="Comment">
          <MessageSquare size={19} strokeWidth={1.9} />
          <span className="tnum">{compact(post.comments)}</span>
        </button>

        <button
          className={`post__action ${reposted ? 'post__action--reposted' : ''}`}
          onClick={() => onRepost(post)}
          aria-pressed={reposted}
          aria-label="Repost"
        >
          <motion.span animate={{ rotate: reposted ? [0, 180, 360] : 0 }} transition={springPop} style={{ display: 'flex' }}>
            <Repeat2 size={19} strokeWidth={1.9} />
          </motion.span>
          <span className="tnum">{compact(post.shares + (reposted ? 1 : 0))}</span>
        </button>

        <button className="post__action" onClick={() => onShare(post)} aria-label="Share">
          <Send size={19} strokeWidth={1.9} />
        </button>

        <button
          className={`post__action post__action--end ${saved ? 'post__action--saved' : ''}`}
          onClick={() => onSave(post)}
          aria-pressed={saved}
          aria-label="Save"
        >
          <motion.span animate={{ y: saved ? [0, -4, 0] : 0 }} transition={springPop} style={{ display: 'flex' }}>
            <Bookmark size={19} fill={saved ? 'currentColor' : 'none'} strokeWidth={1.9} />
          </motion.span>
        </button>
      </footer>
    </motion.article>
    </motion.div>
  )
}
