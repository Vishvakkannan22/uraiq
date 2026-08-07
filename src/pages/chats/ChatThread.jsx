import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown, ChevronLeft, CloudOff, Eraser, Flag, Loader2, Lock, MessagesSquare,
  MoreVertical, Phone, Pin, Search, CalendarClock, CheckCircle2, Circle, ShieldCheck,
  ShieldX, Sparkles, Star, Video, WifiOff, X,
} from 'lucide-react'
import Header from '../../layout/Header'
import Avatar from '../../components/ui/Avatar'
import StatePanel from '../../components/ui/StatePanel'
import Sheet from '../../components/ui/Sheet'
import ShareSheet from '../../components/ui/ShareSheet'
import ReportSheet from '../../components/ui/ReportSheet'
import HealthRing from '../../components/ui/HealthRing'
import HealthSheet from './HealthSheet'
import { SkeletonBubble } from '../../components/ui/Skeleton'
import MessageBubble, { DateDivider, TypingBubble } from './MessageBubble'
import Composer from './Composer'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { ease, springSnap } from '../../lib/motion'
import { COOLDOWN, COOLDOWN_THRESHOLD, healthOf } from '../../lib/conversationHealth'
import { notesFor, resumeFor } from '../../lib/assistant'
import { useThread } from '../../lib/chat/useThread'
import { lastSeenLabel } from '../../lib/time'
import { useClockTick } from '../../lib/useClockTick'
import { smartRepliesByChat } from '../../data/mockData'

/** Below this many pixels from the bottom counts as "at the latest message". */
const BOTTOM_SLACK = 90

function bodyOf(m) {
  return m.text || m.caption || m.translation || ''
}

export default function ChatThread() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  const {
    chat, messages, loading, error, notFound, connection,
    send: submit, edit: applyEdit, remove: removeMessage, clearChat, react, retry, setTyping,
  } = useThread(chatId)

  /* "Last seen 5 minutes ago" in the header depends on elapsed time, not on
     any prop here changing — without this it freezes at whatever age it had
     during the last message/typing/presence event, silently going stale
     between them. */
  useClockTick()

  const [replyTo, setReplyTo] = useState(null)
  const [activeMsg, setActiveMsg] = useState(null)
  const [showSmart, setShowSmart] = useState(true)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pinnedId, setPinnedId] = useState(null)
  const [starred, setStarred] = useState(() => new Set())
  const [starredOpen, setStarredOpen] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const [forwardMsg, setForwardMsg] = useState(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [healthOpen, setHealthOpen] = useState(false)
  const [guidanceHits, setGuidanceHits] = useState(0)
  const [cooldownDismissed, setCooldownDismissed] = useState(false)
  /* A verdict the server returned on send. The composer catches almost
     everything first, so this only fires when the pre-send check was skipped or
     disagreed — but it must be visible, or the message vanishes silently. */
  const [refused, setRefused] = useState(null)
  const [sendError, setSendError] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearError, setClearError] = useState(null)

  const scrollRef = useRef(null)

  useEffect(() => {
    setReplyTo(null)
    setShowSmart(true)
    setPinnedId(null)
    setStarred(new Set())
    setSearchOpen(false)
    setQuery('')
    setGuidanceHits(0)
    setCooldownDismissed(false)
    setRefused(null)
    setSendError(null)
    setMoreOpen(false)
    setClearConfirmOpen(false)
    setClearError(null)
  }, [chatId])

  /* Escape closes the message action menu, matching the outside-click
     dismissal below rather than requiring a second click on the same bubble. */
  useEffect(() => {
    if (!activeMsg) return
    const onKey = (e) => {
      if (e.key === 'Escape') setActiveMsg(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeMsg])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_SLACK)
  }, [])

  function jumpToLatest() {
    const el = scrollRef.current
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  const q = query.trim().toLowerCase()
  const matches = useMemo(
    () => (q ? messages.filter((m) => bodyOf(m).toLowerCase().includes(q)).map((m) => m.id) : []),
    [messages, q]
  )

  /* The last `chat.unread` messages are the ones you haven't seen, so the
     divider goes immediately before them. */
  const unreadStart = chat?.unread > 0 ? messages.length - chat.unread : -1

  const health = useMemo(() => (chatId ? healthOf(chatId) : null), [chatId])
  const resume = useMemo(() => resumeFor(chatId, chat?.unread), [chatId, chat?.unread])
  const notes = useMemo(() => (chatId ? notesFor(chatId) : null), [chatId])
  const hasNotes = notes && (notes.decisions.length || notes.dates.length || notes.actions.length)
  const showCooldown = guidanceHits >= COOLDOWN_THRESHOLD && !cooldownDismissed

  const pinned = messages.find((m) => m.id === pinnedId)
  const starredList = messages.filter((m) => starred.has(m.id))

  /* Order matters: a thread that is still loading is not a missing thread. */
  if (loading && !chat) {
    return (
      <div className="chat-focus">
        <div className="scroll grow" style={{ padding: '0 var(--gutter)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', paddingTop: 'var(--s6)' }}>
            <SkeletonBubble side="in" />
            <SkeletonBubble side="out" />
            <SkeletonBubble side="in" />
          </div>
        </div>
      </div>
    )
  }

  if (!chat) {
    return notFound ? (
      <StatePanel
        icon={Search}
        title="Chat not found"
        body="This conversation doesn’t exist, or you’re not part of it."
        actionLabel="Back to chats"
        onAction={() => navigate('/chats')}
      />
    ) : (
      <StatePanel
        icon={CloudOff}
        title="Couldn’t open this chat"
        body={error?.message ?? 'The server did not respond.'}
        actionLabel="Try again"
        onAction={retry}
      />
    )
  }

  const smart = smartRepliesByChat[chatId] || smartRepliesByChat.default

  async function send(text) {
    const replying = replyTo
    setReplyTo(null)
    setShowSmart(false)
    setRefused(null)

    try {
      const result = await submit(text, replying)
      /* The server ran the same classifier again. If it refuses, nothing was
         written — say so, rather than letting the message quietly vanish. */
      if (result?.status === 'blocked') {
        setRefused(result.moderation)
        setGuidanceHits((n) => n + 1)
      }
    } catch (err) {
      /* Transport failure, not a refusal. The optimistic row is already marked
         failed by the hook and renders as "Not sent". */
      setSendError(err.message || 'Message could not be sent')
    }
  }

  function toggleStar(id) {
    setStarred((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setActiveMsg(null)
  }

  function togglePin(id) {
    setPinnedId((cur) => (cur === id ? null : id))
    setActiveMsg(null)
  }

  async function remove(id) {
    setActiveMsg(null)
    try {
      await removeMessage(id)
    } catch (err) {
      setSendError(err.message || 'Could not delete that message')
    }
  }

  async function edit(id, text) {
    const next = text.trim()
    if (!next) return
    setActiveMsg(null)
    try {
      /* Edits go through moderation server-side too, so this can be refused
         exactly like a send. */
      const result = await applyEdit(id, next)
      if (result?.status === 'blocked') setRefused(result.moderation)
    } catch (err) {
      setSendError(err.message || 'Could not save that edit')
    }
  }

  function onReact(id, emoji) {
    react(id, emoji)
    setActiveMsg(null)
  }

  function copy(msg) {
    navigator.clipboard?.writeText(bodyOf(msg)).catch(() => {})
    setActiveMsg(null)
  }

  async function handleClearChat() {
    setClearing(true)
    setClearError(null)
    try {
      await clearChat()
      setClearConfirmOpen(false)
    } catch (err) {
      setClearError(err.message || 'Could not clear this chat')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="chat-focus">
      <Header
        leading={
          !isDesktop && (
            <button className="iconbtn" onClick={() => navigate('/chats')} aria-label="Back" style={{ marginLeft: -8 }}>
              <ChevronLeft size={22} />
            </button>
          )
        }
        actions={
          <>
            <button
              className="iconbtn"
              onClick={() => { setSearchOpen((v) => !v); setQuery('') }}
              aria-label="Search in conversation"
              aria-pressed={searchOpen}
            >
              <Search size={19} />
            </button>
            <button
              className="iconbtn"
              onClick={() => setStarredOpen(true)}
              aria-label="Starred messages"
              style={starred.size > 0 ? { color: 'var(--warning)' } : undefined}
            >
              <Star size={19} fill={starred.size > 0 ? 'currentColor' : 'none'} />
            </button>
            <button
              className="iconbtn"
              onClick={() => setHealthOpen(true)}
              aria-label={`Conversation health ${health?.score}`}
              title="Conversation health"
            >
              <HealthRing score={health?.score ?? 0} tone={health?.band.tone} size={21} />
            </button>
            <button className="iconbtn" onClick={() => setSummaryOpen(true)} aria-label="Summarize conversation">
              <Sparkles size={19} style={{ color: 'var(--brand-600)' }} />
            </button>
            <button className="iconbtn" onClick={() => setReportOpen(true)} aria-label="Report conversation">
              <Flag size={18} />
            </button>
            <button className="iconbtn iconbtn--muted" disabled aria-label="Voice call unavailable"><Phone size={19} /></button>
            <button className="iconbtn iconbtn--muted" disabled aria-label="Video call unavailable"><Video size={19} /></button>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                className="iconbtn"
                onClick={() => setMoreOpen((v) => !v)}
                aria-label="More options"
                aria-pressed={moreOpen}
              >
                <MoreVertical size={19} />
              </button>
              <AnimatePresence>
                {moreOpen && (
                  <>
                    {/* A full-screen click-catcher, not stopPropagation on the
                        button: it needs to close on a click anywhere else,
                        including inside the message list, and that list
                        already has its own click handler this must not
                        fight with. */}
                    <div
                      onClick={() => setMoreOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-popover)' }}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.94 }}
                      transition={springSnap}
                      className="popover"
                      style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: 8,
                        width: 180, zIndex: 'var(--z-popover)',
                      }}
                    >
                      <button
                        className="popover__item"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => { setMoreOpen(false); setClearConfirmOpen(true) }}
                      >
                        <Eraser size={16} /> Clear chat
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </>
        }
      >
        <div className="row grow" style={{ gap: 'var(--s3)', minWidth: 0 }}>
          <Avatar initials={chat.initials} gradient={chat.gradient} size={36} status={chat.online ? 'online' : undefined} />
          <div style={{ minWidth: 0 }}>
            <div className="truncate" style={{ fontWeight: 660, fontSize: 'var(--fs-15)', color: 'var(--text)', letterSpacing: '-0.015em' }}>
              {chat.name}
            </div>
            <div className="row" style={{ gap: 4, fontSize: 'var(--fs-12)', color: chat.typing ? 'var(--brand-700)' : 'var(--text-4)' }}>
              <ShieldCheck size={11} style={{ color: 'var(--success)' }} />
              {chat.encrypted && <Lock size={10} />}
              {chat.typing ? 'typing…' : chat.online ? 'Active now' : lastSeenLabel(chat.lastSeenAt)}
            </div>
          </div>
        </div>
      </Header>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <div className="thread-search">
              <div className="search grow">
                <Search size={15} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search in ${chat.name.split(' ')[0]}…`}
                  aria-label="Search messages"
                />
              </div>
              <span className="tnum" style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)', minWidth: 46, textAlign: 'right' }}>
                {q ? `${matches.length} hit${matches.length === 1 ? '' : 's'}` : ''}
              </span>
              <button className="iconbtn iconbtn--sm" onClick={() => { setSearchOpen(false); setQuery('') }} aria-label="Close search">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pinned && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <div className="pin-banner">
              <span className="pin-banner__bar" aria-hidden />
              <Pin size={14} style={{ color: 'var(--brand-700)', flexShrink: 0 }} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-11)', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--brand-700)' }}>
                  Pinned
                </div>
                <div className="truncate" style={{ fontSize: 'var(--fs-13)', color: 'var(--text-3)' }}>
                  {bodyOf(pinned) || 'Attachment'}
                </div>
              </div>
              <button className="iconbtn iconbtn--sm" onClick={() => setPinnedId(null)} aria-label="Unpin">
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        onClick={() => activeMsg && setActiveMsg(null)}
        className="scroll grow"
        style={{ padding: '0 var(--gutter) var(--s3)', display: 'flex', flexDirection: 'column' }}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', paddingTop: 'var(--s5)' }}>
            <SkeletonBubble side="in" />
            <SkeletonBubble side="out" />
            <SkeletonBubble side="in" />
          </div>
        ) : error ? (
          <StatePanel
            icon={CloudOff}
            title="Couldn’t load messages"
            body={error.message}
            actionLabel="Try again"
            onAction={retry}
          />
        ) : messages.length === 0 ? (
          <StatePanel
            icon={MessagesSquare}
            title="No messages yet"
            /* Not "end-to-end encrypted": the server reads every message in
               order to moderate it, so that claim would be false. */
            body={`Say hi to ${chat.name.split(' ')[0]} — messages are checked for safety before they're delivered.`}
          />
        ) : (
          <div style={{ marginTop: 'auto', paddingTop: 'var(--s4)' }}>
            {messages.map((m, i) => {
              const prev = messages[i - 1]
              const grouped = prev && prev.from === m.from && prev.author === m.author && !m.day
              const showAuthor = chat.group && m.from === 'them' && !grouped
              return (
                <div key={m.id}>
                  {i === unreadStart && (
                    <>
                      <div className="unread-mark">{chat.unread} new</div>
                      {resume && (
                        <motion.div
                          className="resume"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease }}
                        >
                          <div className="resume__head">
                            <Sparkles size={13} />
                            You were away {resume.awayFor}
                          </div>
                          <ul className="resume__list">
                            {resume.bullets.map((b) => <li key={b}>{b}</li>)}
                          </ul>
                        </motion.div>
                      )}
                    </>
                  )}
                  {m.day && <DateDivider label={m.day} />}
                  <MessageBubble
                    msg={m}
                    grouped={grouped}
                    showAuthor={showAuthor}
                    onReply={setReplyTo}
                    onReact={onReact}
                    active={activeMsg === m.id}
                    onActivate={setActiveMsg}
                    onOpenStatus={setStatusMsg}
                    starred={starred.has(m.id)}
                    pinned={pinnedId === m.id}
                    match={q ? matches.includes(m.id) : false}
                    dimmed={Boolean(q) && !matches.includes(m.id)}
                    onStar={toggleStar}
                    onPin={togglePin}
                    onCopy={copy}
                    onDelete={remove}
                    onForward={setForwardMsg}
                    onEdit={edit}
                  />
                </div>
              )
            })}
            <AnimatePresence>{chat.typing && <TypingBubble />}</AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {!atBottom && !loading && messages.length > 0 && (
          <motion.button
            className="jump-latest"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={springSnap}
            onClick={jumpToLatest}
          >
            <ChevronDown size={15} /> Latest
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCooldown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <div className="cooldown">
              <div className="cooldown__body">
                <strong>{COOLDOWN.title}</strong>
                <p>{COOLDOWN.body}</p>
              </div>
              <div className="row" style={{ gap: 'var(--s2)', flexShrink: 0 }}>
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={() => { setGuidanceHits(0); setCooldownDismissed(true) }}
                >
                  {COOLDOWN.actions[0]}
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setCooldownDismissed(true)}
                >
                  {COOLDOWN.actions[1]}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A dropped socket does not stop sending — REST still works — so this
          reports the loss of live updates rather than blocking the composer. */}
      <AnimatePresence>
        {connection === 'reconnecting' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <div className="thread-notice" role="status">
              <WifiOff size={14} />
              <span className="grow">Reconnecting — new messages may be delayed.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {refused && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease }}
            style={{ overflow: 'hidden', flexShrink: 0, padding: '0 var(--gutter)' }}
          >
            <div className="guard guard--stop">
              <div className="guard__head">
                <ShieldX size={16} />
                <span className="grow">{refused.reason}</span>
                <button className="iconbtn iconbtn--sm" onClick={() => setRefused(null)} aria-label="Dismiss">
                  <X size={15} />
                </button>
              </div>
              <p style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)', marginTop: 4 }}>
                This message wasn’t sent.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sendError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            <div className="thread-notice thread-notice--error" role="alert">
              <CloudOff size={14} />
              <span className="grow">{sendError}</span>
              <button className="iconbtn iconbtn--sm" onClick={() => setSendError(null)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSmart && !loading && messages.length > 0 && !searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease }}
            style={{ overflow: 'hidden' }}
          >
            <div className="ai-reply-tray">
              <span className="ai-reply-tray__label">
                <Sparkles size={12} />
                UraiQ
              </span>
              <div className="no-scrollbar ai-reply-tray__scroll">
                {smart.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, scale: 0.8, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ ...springSnap, delay: 0.08 + i * 0.06 }}
                    className="chip chip--ai"
                    onClick={() => send(s)}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Composer
        onSend={send}
        onTyping={setTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        peerName={chat.name.split(' ')[0]}
        onGuidance={() => setGuidanceHits((n) => n + 1)}
      />

      <HealthSheet
        open={healthOpen}
        onClose={() => setHealthOpen(false)}
        desktop={isDesktop}
        chat={chat}
        health={health}
      />

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        desktop={isDesktop}
        subject={chat.name}
      />

      <Sheet
        open={clearConfirmOpen}
        onClose={() => { setClearConfirmOpen(false); setClearError(null) }}
        desktop={isDesktop}
      >
        <div className="row" style={{ gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
          <div
            className="row"
            style={{
              justifyContent: 'center', width: 38, height: 38, borderRadius: 12,
              background: 'color-mix(in srgb, var(--danger) 14%, transparent)', color: 'var(--danger)',
            }}
          >
            <Eraser size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--fs-17)' }}>Clear this chat?</h3>
            <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>Only on your side</div>
          </div>
        </div>
        <p style={{ fontSize: 'var(--fs-14)', color: 'var(--text-3)', lineHeight: 1.5 }}>
          Every message will be removed from your view of this chat. {chat.name.split(' ')[0]} keeps
          their copy — nothing is deleted for them, and the conversation itself stays in your list.
        </p>
        {clearError && (
          <div className="notice notice--error" role="alert" style={{ marginTop: 'var(--s4)' }}>
            {clearError}
          </div>
        )}
        <div className="row" style={{ gap: 'var(--s2)', marginTop: 'var(--s5)' }}>
          <button
            className="btn btn--secondary btn--sm grow"
            onClick={() => setClearConfirmOpen(false)}
            disabled={clearing}
          >
            Cancel
          </button>
          <button className="btn btn--danger btn--sm grow" onClick={handleClearChat} disabled={clearing}>
            {clearing ? <Loader2 size={16} className="spin" /> : 'Clear chat'}
          </button>
        </div>
      </Sheet>

      <ShareSheet
        open={Boolean(forwardMsg)}
        onClose={() => setForwardMsg(null)}
        desktop={isDesktop}
        label="this message"
      />

      <Sheet open={starredOpen} onClose={() => setStarredOpen(false)} desktop={isDesktop}>
        <h3 style={{ fontSize: 'var(--fs-17)', marginBottom: 'var(--s1)' }}>Starred messages</h3>
        <p style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)', marginBottom: 'var(--s4)' }}>
          Kept on this device only.
        </p>
        {starredList.length === 0 ? (
          <StatePanel compact icon={Star} title="Nothing starred" body="Tap a message and choose the star to keep it here." />
        ) : (
          <div className="col" style={{ gap: 'var(--s2)' }}>
            {starredList.map((m) => (
              <div key={m.id} className="row-item" style={{ alignItems: 'flex-start', cursor: 'default' }}>
                <Star size={15} style={{ color: 'var(--warning)', marginTop: 3, flexShrink: 0 }} fill="currentColor" />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--fs-11)', color: 'var(--text-4)' }}>
                    {m.from === 'me' ? 'You' : m.author || chat.name} · {m.time}
                  </div>
                  <div style={{ fontSize: 'var(--fs-14)', color: 'var(--text-2)', marginTop: 2 }}>
                    {bodyOf(m) || 'Attachment'}
                  </div>
                </div>
                <button className="iconbtn iconbtn--sm" onClick={() => toggleStar(m.id)} aria-label="Unstar">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Sheet>

      <Sheet open={summaryOpen} onClose={() => setSummaryOpen(false)} desktop={isDesktop}>
        <div className="row" style={{ gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
          <div className="row" style={{ justifyContent: 'center', width: 38, height: 38, borderRadius: 12, background: 'var(--grad)', color: '#fff' }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--fs-17)' }}>Assistant</h3>
            <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>Summary and notes · on-device</div>
          </div>
        </div>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          {[
            'Encryption audit passed with zero findings on the key derivation path.',
            'Marcus shared an export set to burn 30 seconds after reading.',
            'Follow-up: confirm the export was received before it expires.',
          ].map((line) => (
            <li key={line} className="row" style={{ gap: 'var(--s3)', alignItems: 'flex-start', fontSize: 'var(--fs-14)', color: 'var(--text-2)' }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--brand-500)', marginTop: 8, flexShrink: 0 }} />
              {line}
            </li>
          ))}
        </ul>
        {hasNotes && (
          <>
            {notes.decisions.length > 0 && (
              <>
                <div className="set-label" style={{ marginTop: 'var(--s5)' }}>Decisions</div>
                <div className="col" style={{ gap: 'var(--s2)' }}>
                  {notes.decisions.map((d) => (
                    <div key={d} className="moment"><span className="moment__dot" aria-hidden />{d}</div>
                  ))}
                </div>
              </>
            )}

            {notes.dates.length > 0 && (
              <>
                <div className="set-label" style={{ marginTop: 'var(--s5)' }}>Dates</div>
                <div className="col" style={{ gap: 'var(--s2)' }}>
                  {notes.dates.map((d) => (
                    <div key={d.label} className="brief-event">
                      <span className="brief-event__icon"><CalendarClock size={16} /></span>
                      <span className="grow" style={{ minWidth: 0 }}>
                        <span className="truncate brief-row__name">{d.label}</span>
                        <span className="brief-row__reason">{d.when}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {notes.actions.length > 0 && (
              <>
                <div className="set-label" style={{ marginTop: 'var(--s5)' }}>Action items</div>
                <div className="col" style={{ gap: 'var(--s1)' }}>
                  {notes.actions.map((a) => (
                    <div key={a.label} className={`todo ${a.done ? 'todo--done' : ''}`}>
                      {a.done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                      <span className="grow">{a.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <button className="btn btn--secondary btn--block btn--sm" style={{ marginTop: 'var(--s5)' }} onClick={() => setSummaryOpen(false)}>
          Close
        </button>
      </Sheet>

      <Sheet open={Boolean(statusMsg)} onClose={() => setStatusMsg(null)} desktop={isDesktop}>
        {statusMsg && (
          <>
            <div className="row" style={{ gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
              <div className="delivery-orb" aria-hidden>
                <span />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--fs-17)' }}>Message pulse</h3>
                <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>
                  Digital delivery path for this message
                </div>
              </div>
            </div>

            <div className="delivery-timeline">
              {/* Times come only from the trail. A stage the server never
                  timestamped shows as reached-but-unknown rather than
                  borrowing the send time, which would be invented. */}
              {[
                ['Sending', statusMsg.statusTrail?.sending, true, 'Transmission started'],
                [
                  'Received',
                  statusMsg.statusTrail?.received,
                  ['received', 'delivered', 'seen', 'read'].includes(statusMsg.status),
                  'Reached receiver device',
                ],
                [
                  'Seen',
                  statusMsg.statusTrail?.seen,
                  ['seen', 'read'].includes(statusMsg.status),
                  'Opened by receiver',
                ],
              ].map(([label, time, reached, detail]) => (
                <div key={label} className={`delivery-step ${reached ? 'delivery-step--done' : ''}`}>
                  <span className="delivery-step__mark" />
                  <div className="grow">
                    <div className="row" style={{ justifyContent: 'space-between', gap: 'var(--s3)' }}>
                      <strong>{label}</strong>
                      <span className="tnum">{time || (reached ? 'Done' : 'Pending')}</span>
                    </div>
                    <p>{detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn--secondary btn--block btn--sm" style={{ marginTop: 'var(--s5)' }} onClick={() => setStatusMsg(null)}>
              Close
            </button>
          </>
        )}
      </Sheet>
    </div>
  )
}

export function NoChatSelected() {
  return (
    <StatePanel
      icon={MessagesSquare}
      title="Pick a conversation"
      body="Choose a chat from the list to start reading."
    />
  )
}
