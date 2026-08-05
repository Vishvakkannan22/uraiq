import { useMemo, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive, ArchiveRestore, ArrowDownAZ, ArrowLeftRight, BellOff, Bell, Check,
  Clock, CloudOff, Lock, MailOpen, MessagesSquare, Orbit, Pin,
  Search, SlidersHorizontal, SquarePen, Users, X,
} from 'lucide-react'
import Header from '../../layout/Header'
import Avatar from '../../components/ui/Avatar'
import StatePanel from '../../components/ui/StatePanel'
import SwipeRow from '../../components/ui/SwipeRow'
import Sheet from '../../components/ui/Sheet'
import NewChatSheet from './NewChatSheet'
import { SkeletonRow } from '../../components/ui/Skeleton'
import { listItem, listStagger } from '../../lib/motion'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { healthOf } from '../../lib/conversationHealth'
import { useScrolled } from '../../lib/useScrolled'
import { useChatList } from '../../lib/chat/useChatList'

function MiniPulse({ status }) {
  const state = status === 'read' || status === 'seen' ? 'seen' : status === 'delivered' || status === 'received' ? 'received' : 'sending'
  return (
    <span className={`mini-pulse mini-pulse--${state}`} aria-label={state}>
      <span />
    </span>
  )
}

function TypingPreview() {
  return (
    <span className="row" style={{ gap: 5, color: 'var(--brand-600)', fontWeight: 560 }}>
      typing
      <span className="row" style={{ gap: 2.5 }}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -1.5, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16 }}
            style={{ width: 3.5, height: 3.5, borderRadius: 999, background: 'currentColor' }}
          />
        ))}
      </span>
    </span>
  )
}

const MUTE_OPTIONS = ['1 hour', '8 hours', '1 week', 'Until I turn it back on']

const SORTS = [
  { id: 'recent', label: 'Recent activity', icon: Clock },
  { id: 'unread', label: 'Unread first', icon: MailOpen },
  { id: 'name', label: 'Name (A-Z)', icon: ArrowDownAZ },
]

const FILTERS = [
  { id: 'all', label: 'All chats' },
  { id: 'unread', label: 'Unread' },
  { id: 'groups', label: 'Groups' },
  { id: 'muted', label: 'Muted' },
]

function ChatRow({ chat, muted, archived, onArchive, onMute }) {
  return (
    <motion.div variants={listItem}>
    <SwipeRow
      actions={({ close }) => (
        <>
          <button
            className="swipe-act"
            onClick={() => { onMute(chat); close() }}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <Bell size={17} /> : <BellOff size={17} />}
            <span>{muted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button
            className="swipe-act swipe-act--archive"
            onClick={() => { onArchive(chat.id); close() }}
            aria-label={archived ? 'Unarchive' : 'Archive'}
          >
            {archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}
            <span>{archived ? 'Restore' : 'Archive'}</span>
          </button>
        </>
      )}
    >
    <NavLink to={`/chats/${chat.id}`} style={{ display: 'block' }}>
      {({ isActive }) => (
        <div className={`row-item ${isActive ? 'row-item--active' : ''}`}>
          <Avatar
            initials={chat.initials}
            gradient={chat.gradient}
            size={46}
            status={chat.online ? 'online' : undefined}
          />

          <div className="grow col" style={{ gap: 2 }}>
            <div className="row" style={{ gap: 6 }}>
              <span
                className="truncate"
                style={{ fontWeight: 640, fontSize: 'var(--fs-15)', color: 'var(--text)', letterSpacing: '-0.012em' }}
              >
                {chat.name}
              </span>
              {chat.group && <Users size={12} style={{ color: 'var(--text-4)' }} />}
              {chat.encrypted && <Lock size={11} style={{ color: 'var(--brand-400)' }} />}
              {/* TODO(milestone 2): derived locally from the conversation id,
                  not from the messages in it. See lib/conversationHealth.js. */}
              <span
                className={`health-dot health-dot--${healthOf(chat.id).band.tone}`}
                title={`Conversation health: ${healthOf(chat.id).band.label}`}
              />
              {chat.pinned && <Pin size={11} style={{ color: 'var(--text-4)', fill: 'currentColor' }} />}
              <span className="tnum" style={{ marginLeft: 'auto', fontSize: 'var(--fs-11)', color: chat.unread ? 'var(--brand-600)' : 'var(--text-4)', fontWeight: chat.unread ? 650 : 500, flexShrink: 0 }}>
                {chat.time}
              </span>
            </div>

            <div className="row" style={{ gap: 5, fontSize: 'var(--fs-13)', color: 'var(--text-4)' }}>
              {chat.outgoing && !chat.typing && (
                <MiniPulse status={chat.read ? 'seen' : chat.delivered ? 'received' : 'sending'} />
              )}
              <span className="truncate grow">
                {chat.typing ? (
                  <TypingPreview />
                ) : (
                  <>
                    {chat.author && <span style={{ color: 'var(--text-3)' }}>{chat.author}: </span>}
                    {chat.preview}
                  </>
                )}
              </span>
              {muted && <BellOff size={13} style={{ flexShrink: 0 }} />}
              {chat.unread > 0 && <span className="badge" style={{ flexShrink: 0 }}>{chat.unread}</span>}
            </div>
          </div>
        </div>
      )}
    </NavLink>
    </SwipeRow>
    </motion.div>
  )
}

/* The story tray used to live here. Removed with the rest of the mock chat
   data: it rendered invented people, and stories are not part of this
   milestone. Reinstate it when there is a stories endpoint to read. */

export default function ChatListPane({ onResetWidth, canResetWidth }) {
  const isDesktop = useIsDesktop()
  const { chats, loading, error, retry } = useChatList()
  const [query, setQuery] = useState('')
  /* Local overrides layered over the server's flags, rather than a set of ids:
     the server already knows what is muted and archived, and this only records
     what *this session* changed.
     TODO: no route updates conversation_members.archived / muted_until yet, so
     these do not survive a reload. */
  const [overrides, setOverrides] = useState({ muted: {}, archived: {} })
  const [muteTarget, setMuteTarget] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [sort, setSort] = useState('recent')
  const [filter, setFilter] = useState('all')
  const scrollRef = useRef(null)
  const scrolled = useScrolled(scrollRef)

  const isMuted = (c) => overrides.muted[c.id] ?? Boolean(c.muted)
  const isArchived = (c) => overrides.archived[c.id] ?? Boolean(c.archived)

  function toggleArchive(id) {
    const chat = chats.find((c) => c.id === id)
    setOverrides((prev) => ({
      ...prev,
      archived: { ...prev.archived, [id]: !(prev.archived[id] ?? Boolean(chat?.archived)) },
    }))
  }

  /* Unmuting is immediate; muting asks for how long, because "forever" is
     rarely what someone actually means. */
  function onMute(chat) {
    if (isMuted(chat)) {
      setOverrides((prev) => ({ ...prev, muted: { ...prev.muted, [chat.id]: false } }))
    } else {
      setMuteTarget(chat)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chats
    return chats.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.preview ?? '').toLowerCase().includes(q)
    )
  }, [chats, query])

  /* Filter, then sort. `chats` already arrives in recent order, so 'recent'
     is a no-op and the other sorts work from that same baseline. */
  const byFilter = filtered.filter((c) => {
    if (filter === 'unread') return c.unread > 0
    if (filter === 'groups') return Boolean(c.group)
    if (filter === 'muted') return isMuted(c)
    return true
  })

  const sorted = [...byFilter].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'unread') return (b.unread > 0) - (a.unread > 0)
    return 0
  })

  const inbox = sorted.filter((c) => !isArchived(c))
  const archivedList = sorted.filter((c) => isArchived(c))
  const shown = showArchived ? archivedList : inbox
  const pinned = shown.filter((c) => c.pinned)
  const rest = shown.filter((c) => !c.pinned)

  const rowProps = (c) => ({
    chat: c,
    muted: isMuted(c),
    archived: isArchived(c),
    onArchive: toggleArchive,
    onMute,
  })

  return (
    <div className="chat-list-shell">
      <Header
        title="Chats"
        scrolled={scrolled}
        actions={
          <>
            {archivedList.length > 0 && (
              <button
                className="iconbtn"
                onClick={() => setShowArchived((v) => !v)}
                aria-label={showArchived ? 'Back to chats' : 'Archived chats'}
                aria-pressed={showArchived}
                style={showArchived ? { color: 'var(--brand-700)' } : undefined}
              >
                <Archive size={19} />
              </button>
            )}
            <Link to="/universe" className="iconbtn" aria-label="Universe view" title="Universe view">
              <Orbit size={19} />
            </Link>
            <button
              className="iconbtn"
              onClick={() => setAdjustOpen(true)}
              aria-label="Adjust list"
              style={filter !== 'all' || sort !== 'recent' ? { color: 'var(--brand-700)' } : undefined}
            >
              <SlidersHorizontal size={19} />
            </button>
            <button className="iconbtn" onClick={() => setNewChatOpen(true)} aria-label="New chat">
              <SquarePen size={19} />
            </button>
          </>
        }
      />

      <div ref={scrollRef} className="scroll grow" style={{ padding: '0 var(--list-inset) var(--s5)' }}>
        <div style={{ padding: 'var(--s2) var(--s3) var(--s3)' }}>
          <div className="search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages and people" aria-label="Search chats" />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  style={{ display: 'flex', color: 'var(--text-4)' }}
                >
                  <X size={15} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {(filter !== 'all' || sort !== 'recent') && (
          <div className="row" style={{ gap: 6, padding: '0 var(--row-pad) var(--s3)', flexWrap: 'wrap' }}>
            {filter !== 'all' && (
              <button className="chip chip--ai" style={{ height: 28 }} onClick={() => setFilter('all')}>
                {FILTERS.find((f) => f.id === filter)?.label} <X size={12} />
              </button>
            )}
            {sort !== 'recent' && (
              <button className="chip chip--ai" style={{ height: 28 }} onClick={() => setSort('recent')}>
                {SORTS.find((f) => f.id === sort)?.label} <X size={12} />
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div>{Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : error ? (
          <StatePanel
            compact
            icon={CloudOff}
            title="Couldn't load your chats"
            body={error.message}
            actionLabel="Try again"
            onAction={retry}
          />
        ) : shown.length === 0 ? (
          <StatePanel
            compact
            icon={showArchived ? Archive : query || filter !== 'all' ? Search : MessagesSquare}
            title={
              showArchived
                ? 'Archive is empty'
                : query || filter !== 'all'
                  ? 'No matches'
                  : 'No conversations yet'
            }
            body={
              showArchived
                ? 'Swipe a chat left to archive it.'
                : query || filter !== 'all'
                  ? `Nothing found for “${query || FILTERS.find((f) => f.id === filter)?.label}”.`
                  : 'Start one and it will show up here.'
            }
            actionLabel={
              showArchived ? 'Back to chats' : !query && filter === 'all' ? 'New chat' : undefined
            }
            onAction={
              showArchived
                ? () => setShowArchived(false)
                : !query && filter === 'all'
                  ? () => setNewChatOpen(true)
                  : undefined
            }
          />
        ) : (
          <motion.div variants={listStagger} initial="hidden" animate="show" key={query ? 'search' : 'all'}>
            {pinned.length > 0 && (
              <>
                <div className="section-label">Pinned</div>
                {pinned.map((c) => <ChatRow key={c.id} {...rowProps(c)} />)}
              </>
            )}
            {rest.length > 0 && (
              <>
                <div className="section-label">
                  {showArchived ? 'Archived' : pinned.length ? 'All messages' : 'Messages'}
                </div>
                {rest.map((c) => <ChatRow key={c.id} {...rowProps(c)} />)}
              </>
            )}
          </motion.div>
        )}
        {!showArchived && archivedList.length > 0 && !query && (
          <button className="row-item archived-entry" onClick={() => setShowArchived(true)}>
            <span className="archived-entry__icon"><Archive size={17} /></span>
            <span className="grow" style={{ textAlign: 'left', fontSize: 'var(--fs-14)', fontWeight: 620, color: 'var(--text-2)' }}>
              Archived
            </span>
            <span className="tnum" style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>{archivedList.length}</span>
          </button>
        )}
      </div>

      <NewChatSheet open={newChatOpen} onClose={() => setNewChatOpen(false)} desktop={isDesktop} />

      <Sheet open={adjustOpen} onClose={() => setAdjustOpen(false)} desktop={isDesktop}>
        <h3 style={{ fontSize: 'var(--fs-17)', marginBottom: 'var(--s4)' }}>Adjust list</h3>

        <div className="set-label">Show</div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`chip ${filter === f.id ? 'chip--ai' : ''}`}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="set-label">Sort by</div>
        <div className="col" style={{ gap: 'var(--s1)' }}>
          {SORTS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`choice ${sort === id ? 'choice--on' : ''}`}
              onClick={() => setSort(id)}
              aria-pressed={sort === id}
            >
              <Icon size={17} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
              <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                <span className="choice__title">{label}</span>
              </span>
              {sort === id && (
                <span className="choice__check"><Check size={13} strokeWidth={3.2} /></span>
              )}
            </button>
          ))}
        </div>

        {onResetWidth && (
          <>
            <div className="set-label" style={{ marginTop: 'var(--s5)' }}>Layout</div>
            <div className="row" style={{ gap: 'var(--s3)', padding: 'var(--s2) 0' }}>
              <span className="set-row__icon"><ArrowLeftRight size={17} /></span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-14)', fontWeight: 620, color: 'var(--text)' }}>List width</div>
                <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>
                  Drag the divider, or focus it and use the arrow keys
                </div>
              </div>
              <button className="btn btn--secondary btn--sm" onClick={onResetWidth} disabled={!canResetWidth}>
                Reset
              </button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={Boolean(muteTarget)} onClose={() => setMuteTarget(null)} desktop={isDesktop}>
        <h3 style={{ fontSize: 'var(--fs-17)', marginBottom: 'var(--s1)' }}>
          Mute {muteTarget?.name}
        </h3>
        <p style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)', marginBottom: 'var(--s4)' }}>
          You'll still see messages in the list, just without a notification.
        </p>
        <div className="col" style={{ gap: 'var(--s1)' }}>
          {MUTE_OPTIONS.map((o) => (
            <button
              key={o}
              className="popover__item"
              onClick={() => {
                setOverrides((prev) => ({ ...prev, muted: { ...prev.muted, [muteTarget.id]: true } }))
                setMuteTarget(null)
              }}
            >
              <BellOff size={16} /> {o}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
