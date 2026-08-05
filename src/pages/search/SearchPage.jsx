import { useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronRight, Hash, Search, Users, X } from 'lucide-react'
import Header from '../../layout/Header'
import Avatar from '../../components/ui/Avatar'
import StatePanel from '../../components/ui/StatePanel'
import { listItem, listStagger } from '../../lib/motion'
import { useOpenStory } from '../../lib/useOpenStory'
import { useScrolled } from '../../lib/useScrolled'
import { useChatList } from '../../lib/chat/useChatList'
/* Communities and stories are not part of this milestone and still read from
   the local seed; only the people results are real. */
import { communities, stories } from '../../data/mockData'

export default function SearchPage() {
  const location = useLocation()
  /* Seeded when a hashtag or mention was tapped in the feed. */
  const [query, setQuery] = useState(location.state?.q || '')
  const openStory = useOpenStory()
  const scrollRef = useRef(null)
  const scrolled = useScrolled(scrollRef)
  const { chats } = useChatList()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return {
      /* People you already have a conversation with. Finding someone new is
         the New chat sheet, which hits GET /users/search — this page links
         straight to a thread, so it can only offer threads that exist. */
      people: chats.filter((c) => c.name.toLowerCase().includes(q)),
      groups: communities.filter((c) => c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q)),
    }
  }, [query, chats])

  const empty = results && results.people.length === 0 && results.groups.length === 0

  return (
    <div className="col grow" style={{ minWidth: 0, minHeight: 0 }}>
      <Header
        title="Search"
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
              placeholder="Search people, groups and posts"
              aria-label="Search"
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

        {empty && <StatePanel compact icon={Search} title="No matches" body={`Nothing found for “${query}”.`} />}

        {results && !empty && (
          <motion.div variants={listStagger} initial="hidden" animate="show" key={query}>
            {results.people.length > 0 && (
              <section className="section">
                <h2 className="section__head">People<span className="section__count tnum">{results.people.length}</span></h2>
                {results.people.map((c) => (
                  <motion.div key={c.id} variants={listItem}>
                    <Link to={`/chats/${c.id}`} className="row-item" style={{ display: 'flex' }}>
                      <Avatar initials={c.initials} gradient={c.gradient} size={44} status={c.online ? 'online' : undefined} />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 640, fontSize: 'var(--fs-15)', color: 'var(--text)' }}>{c.name}</div>
                        <div className="truncate" style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>
                          {c.group ? `${c.members} members` : c.online ? 'Active now' : 'Last seen recently'}
                        </div>
                      </div>
                      <ChevronRight size={17} style={{ color: 'var(--text-4)' }} />
                    </Link>
                  </motion.div>
                ))}
              </section>
            )}

            {results.groups.length > 0 && (
              <section className="section">
                <h2 className="section__head">Groups<span className="section__count tnum">{results.groups.length}</span></h2>
                {results.groups.map((c) => (
                  <motion.div key={c.id} variants={listItem}>
                    <Link to="/communities" className="row-item" style={{ display: 'flex' }}>
                      <span style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: c.gradient, flexShrink: 0 }} />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 640, fontSize: 'var(--fs-15)', color: 'var(--text)' }}>{c.name}</div>
                        <div className="row" style={{ gap: 'var(--s3)', fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>
                          <span className="row tnum" style={{ gap: 4 }}><Users size={12} />{c.members}</span>
                          <span className="row tnum" style={{ gap: 4 }}><Hash size={12} />{c.channels}</span>
                        </div>
                      </div>
                      <ChevronRight size={17} style={{ color: 'var(--text-4)' }} />
                    </Link>
                  </motion.div>
                ))}
              </section>
            )}
          </motion.div>
        )}

        {!results && (
          <>
            <section className="section">
              <h2 className="section__head">Recent stories<span className="section__count tnum">{stories.length}</span></h2>
              <div className="no-scrollbar story-strip">
                {stories.map((s) => (
                  <button key={s.id} className="story-strip__item" onClick={() => !s.self && openStory(s.id)}>
                    <Avatar initials={s.initials} gradient={s.gradient} size={54} ring={s.seen ? 'seen' : 'unseen'} />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="section">
              <h2 className="section__head">
                Groups
                <Link to="/communities" className="section__count row" style={{ gap: 3 }}>
                  See all <ChevronRight size={13} />
                </Link>
              </h2>
              <motion.div variants={listStagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                {communities.slice(0, 4).map((c) => (
                  <motion.div key={c.id} variants={listItem}>
                    <Link to="/communities" className="row-item" style={{ display: 'flex' }}>
                      <span style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: c.gradient, flexShrink: 0 }} />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 640, fontSize: 'var(--fs-15)', color: 'var(--text)' }}>{c.name}</div>
                        <div className="row" style={{ gap: 'var(--s3)', fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>
                          <span className="row tnum" style={{ gap: 4 }}><Users size={12} />{c.members}</span>
                          <span className="row tnum" style={{ gap: 4 }}><Hash size={12} />{c.channels}</span>
                        </div>
                      </div>
                      <ChevronRight size={17} style={{ color: 'var(--text-4)' }} />
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
