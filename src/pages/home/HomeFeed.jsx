import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useScroll } from 'framer-motion'
import { MessageCircle, PenLine } from 'lucide-react'
import AppMark from '../../components/brand/AppMark'
import AiMark from '../../components/brand/AiMark'
import Segmented from '../../components/ui/Segmented'
import Sheet from '../../components/ui/Sheet'
import Lightbox from '../../components/ui/Lightbox'
import ShareSheet from '../../components/ui/ShareSheet'
import StatePanel from '../../components/ui/StatePanel'
import Toast from '../../components/ui/Toast'
import FeedCard from './FeedCard'
import CommentsSheet from './CommentsSheet'
import PostComposer from './PostComposer'
import DailyBrief from './DailyBrief'
import PostMenu from './PostMenu'
import InsightsSheet from './InsightsSheet'
import CollectionSheet from './CollectionSheet'
import { listStagger, spring } from '../../lib/motion'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { useScrolled } from '../../lib/useScrolled'
import { currentUser, feed as seedFeed, feedExtras } from '../../data/mockData'

export default function HomeFeed() {
  const isDesktop = useIsDesktop()
  const scrollRef = useRef(null)
  const scrolled = useScrolled(scrollRef)
  const { scrollYProgress } = useScroll({ container: scrollRef })

  const [aiOpen, setAiOpen] = useState(false)
  const [openPost, setOpenPost] = useState(null)
  const [commentPost, setCommentPost] = useState(null)
  const [sharePost, setSharePost] = useState(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [tab, setTab] = useState('foryou')
  /* Poll and mention posts are interleaved rather than appended, so the feed
     doesn't front-load one kind of content. */
  const [posts, setPosts] = useState(() => {
    const merged = [...seedFeed]
    merged.splice(2, 0, feedExtras[0])
    merged.splice(5, 0, feedExtras[1])
    return merged
  })
  const [menuPost, setMenuPost] = useState(null)
  const [insightsPost, setInsightsPost] = useState(null)
  const [savePost, setSavePost] = useState(null)
  const [hidden, setHidden] = useState(() => new Set())
  const [savedIds, setSavedIds] = useState(() => new Set())
  const [reposted, setReposted] = useState(() => new Set())
  const [toast, setToast] = useState(null)

  const [followed, setFollowed] = useState(() => new Set(['elena.codes', 'campuswire']))

  const shown = useMemo(() => {
    const visible = posts.filter((p) => !hidden.has(p.id))
    return tab === 'following' ? visible.filter((p) => followed.has(p.handle)) : visible
  }, [tab, posts, followed, hidden])

  const isMine = (p) => p.handle === currentUser.handle.replace('@', '')

  /* Hiding is reversible from the snackbar, which is why it doesn't confirm. */
  function hidePost(p) {
    setHidden((prev) => new Set(prev).add(p.id))
    setToast({
      message: `Post from ${p.author} hidden`,
      actionLabel: 'Undo',
      onAction: () =>
        setHidden((prev) => {
          const next = new Set(prev)
          next.delete(p.id)
          return next
        }),
    })
  }

  function toggleRepost(p) {
    setReposted((prev) => {
      const next = new Set(prev)
      if (next.has(p.id)) {
        next.delete(p.id)
      } else {
        next.add(p.id)
        setToast({ message: 'Reposted to your profile' })
      }
      return next
    })
  }

  function toggleFollow(handle) {
    setFollowed((prev) => {
      const next = new Set(prev)
      next.has(handle) ? next.delete(handle) : next.add(handle)
      return next
    })
  }

  function addPost({ text, media }) {
    setPosts((prev) => [
      {
        id: `own-${Date.now()}`,
        author: currentUser.name,
        handle: currentUser.handle.replace('@', ''),
        initials: currentUser.initials,
        gradient: currentUser.gradient,
        time: 'now',
        text,
        media: media ? { kind: 'photo', gradient: media, ratio: '4 / 5' } : null,
        likes: 0,
        comments: 0,
        shares: 0,
      },
      ...prev,
    ])
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="col grow" style={{ minWidth: 0, minHeight: 0, position: 'relative' }}>
      {/* Logo left, assistant then messages right — in that order. */}
      <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
        <AppMark size={30} radius={9} />
        {/* The lockup, not plain text: gradient U and Q either side of ink. */}
        <span className="brand-text" style={{ fontSize: 'var(--fs-20)', letterSpacing: '-0.03em', color: 'var(--text)' }}>
          <span className="mark-text">U</span>rai<span className="mark-text">Q</span>
        </span>

        <div className="header__actions">
          <button className="iconbtn" onClick={() => setAiOpen(true)} aria-label="Open UraiQ assistant">
            <AiMark size={21} />
          </button>
          <Link to="/chats" className="iconbtn" aria-label="Messages">
            <MessageCircle size={21} />
          </Link>
        </div>

        {/* How far through the feed you are, pinned to the header's lower edge. */}
        <motion.span className="header__progress" style={{ scaleX: scrollYProgress }} aria-hidden />
      </header>

      <div ref={scrollRef} className="scroll grow" style={{ padding: '0 var(--gutter) var(--s10)' }}>
        <div className="row" style={{ justifyContent: 'center', padding: 'var(--s4) 0 var(--s2)' }}>
          <Segmented
            id="feed"
            value={tab}
            onChange={setTab}
            items={[{ value: 'foryou', label: 'For you' }, { value: 'following', label: 'Following' }]}
          />
        </div>

        {shown.length === 0 ? (
          <StatePanel
            compact
            icon={PenLine}
            title="Nothing here yet"
            body="Follow a few people and their posts will show up in this tab."
            actionLabel="Browse For you"
            onAction={() => setTab('foryou')}
          />
        ) : (
          <motion.div className="feed" variants={listStagger} initial="hidden" animate="show" key={tab}>
            <AnimatePresence initial={false}>
              {shown.map((post) => (
                <FeedCard
                  key={post.id}
                  post={post}
                  scrollRef={scrollRef}
                  onOpenMedia={setOpenPost}
                  onComment={setCommentPost}
                  onShare={setSharePost}
                  onMenu={setMenuPost}
                  onSave={setSavePost}
                  followed={followed.has(post.handle)}
                  onToggleFollow={toggleFollow}
                  saved={savedIds.has(post.id)}
                  reposted={reposted.has(post.id)}
                  onRepost={toggleRepost}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Compose stays off the top bar, which is spoken for by AI + Messages. */}
      <motion.button
        className="fab"
        onClick={() => setComposeOpen(true)}
        whileTap={{ scale: 0.92 }}
        transition={spring}
        aria-label="New post"
      >
        <PenLine size={20} />
      </motion.button>

      <Lightbox
        media={openPost?.media}
        layoutId={openPost ? `media-${openPost.id}` : undefined}
        onClose={() => setOpenPost(null)}
      />

      <CommentsSheet post={commentPost} onClose={() => setCommentPost(null)} desktop={isDesktop} />

      <PostMenu
        post={menuPost}
        mine={menuPost ? isMine(menuPost) : false}
        onClose={() => setMenuPost(null)}
        desktop={isDesktop}
        onHide={hidePost}
        onMute={(p) => setToast({ message: `You won't see posts from @${p.handle}`, actionLabel: 'Undo' })}
        onReport={() => setToast({ message: 'Report sent. Thanks for flagging it.' })}
        onCopyLink={() => setToast({ message: 'Link copied' })}
        onInsights={setInsightsPost}
      />

      <InsightsSheet post={insightsPost} onClose={() => setInsightsPost(null)} desktop={isDesktop} />

      <CollectionSheet
        open={Boolean(savePost)}
        onClose={() => setSavePost(null)}
        desktop={isDesktop}
        onSaved={(name) => {
          setSavedIds((prev) => new Set(prev).add(savePost.id))
          setToast({ message: `Saved to ${name}` })
        }}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

      <ShareSheet
        open={Boolean(sharePost)}
        onClose={() => setSharePost(null)}
        desktop={isDesktop}
        label="this post"
      />

      <PostComposer
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        desktop={isDesktop}
        onPost={addPost}
      />

      <Sheet open={aiOpen} onClose={() => setAiOpen(false)} desktop={isDesktop}>
        <DailyBrief onNavigate={() => setAiOpen(false)} />
      </Sheet>
    </div>
  )
}
