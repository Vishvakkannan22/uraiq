import { useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronRight, Search, UserPlus, X } from 'lucide-react'
import Header from '../../layout/Header'
import Avatar from '../../components/ui/Avatar'
import StatePanel from '../../components/ui/StatePanel'
import { listItem, listStagger } from '../../lib/motion'
import { useScrolled } from '../../lib/useScrolled'
import { useChatList } from '../../lib/chat/useChatList'

export default function SearchPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState(location.state?.q || '')
  const scrollRef = useRef(null)
  const scrolled = useScrolled(scrollRef)
  const { chats } = useChatList()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return chats.filter((c) => c.name.toLowerCase().includes(q) || (c.preview ?? '').toLowerCase().includes(q))
  }, [query, chats])

  return (
    <div className="find-page">
      <Header
        title="Find"
        subtitle="People and conversations"
        scrolled={scrolled}
        actions={
          <Link to="/notifications" className="iconbtn" aria-label="Activity">
            <Bell size={19} />
          </Link>
        }
      />

      <div ref={scrollRef} className="scroll grow" style={{ padding: '0 var(--gutter) var(--s8)' }}>
        <div style={{ padding: 'var(--s1) 0 var(--s5)' }}>
          <div className="search" style={{ height: 46 }}>
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people and chats"
              aria-label="Search conversations"
            />
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
                  <X size={16} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {!results ? (
          <StatePanel
            compact
            icon={UserPlus}
            title="Find a conversation"
            body="Search existing chats here, or start a new one from the center action."
            actionLabel="New chat"
            onAction={() => navigate('/new')}
          />
        ) : results.length === 0 ? (
          <StatePanel compact icon={Search} title="No matches" body={`Nothing found for "${query.trim()}".`} />
        ) : (
          <motion.section variants={listStagger} initial="hidden" animate="show" className="section" key={query}>
            <h2 className="section__head">
              Conversations
              <span className="section__count tnum">{results.length}</span>
            </h2>
            {results.map((c) => (
              <motion.div key={c.id} variants={listItem}>
                <Link to={`/chats/${c.id}`} className="row-item" style={{ display: 'flex' }}>
                  <Avatar initials={c.initials} gradient={c.gradient} size={44} status={c.online ? 'online' : undefined} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 700, fontSize: 'var(--fs-15)', color: 'var(--text)' }}>{c.name}</div>
                    <div className="truncate" style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>
                      {c.online ? 'Active now' : c.preview}
                    </div>
                  </div>
                  <ChevronRight size={17} style={{ color: 'var(--text-4)' }} />
                </Link>
              </motion.div>
            ))}
          </motion.section>
        )}
      </div>
    </div>
  )
}
