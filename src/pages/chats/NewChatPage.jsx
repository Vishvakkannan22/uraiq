import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search, UserPlus, X } from 'lucide-react'
import Header from '../../layout/Header'
import Avatar from '../../components/ui/Avatar'
import StatePanel from '../../components/ui/StatePanel'
import { chatsApi, usersApi } from '../../lib/api'
import { useScrolled } from '../../lib/useScrolled'

const MIN_QUERY = 2
const DEBOUNCE_MS = 280

export default function NewChatPage() {
  const navigate = useNavigate()
  const scrollRef = useRef(null)
  const scrolled = useScrolled(scrollRef)
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const [starting, setStarting] = useState(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_QUERY) {
      setUsers([])
      setSearching(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const data = await usersApi.search(q, { signal: controller.signal })
        setUsers(data?.users ?? [])
        setError(null)
      } catch (err) {
        if (err.code !== 'aborted') setError(err)
      } finally {
        setSearching(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  async function start(user) {
    setStarting(user.id)
    setError(null)
    try {
      const data = await chatsApi.create(user.id)
      const id = data?.conversation?.id
      if (!id) throw new Error('Could not open that conversation')
      navigate(`/chats/${id}`, { replace: true })
    } catch (err) {
      setError(err)
      setStarting(null)
    }
  }

  return (
    <div className="new-chat-page">
      <Header title="New chat" subtitle="Start a private conversation" scrolled={scrolled} />

      <div ref={scrollRef} className="scroll grow" style={{ padding: '0 var(--gutter) var(--s8)' }}>
        <section className="compose-card">
          <div className="compose-card__icon">
            <UserPlus size={20} />
          </div>
          <h2>Who do you want to message?</h2>
          <p>Search by display name or handle. Opening the same person again returns to the existing chat.</p>
        </section>

        <div className="search new-chat-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or @handle"
            aria-label="Search people"
          />
          {searching ? (
            <Loader2 size={15} className="spin" />
          ) : query ? (
            <button onClick={() => setQuery('')} aria-label="Clear search" style={{ display: 'flex', color: 'var(--text-4)' }}>
              <X size={15} />
            </button>
          ) : null}
        </div>

        {error && (
          <div className="notice notice--error" role="alert" style={{ marginTop: 'var(--s3)' }}>
            {error.message}
          </div>
        )}

        <div style={{ marginTop: 'var(--s4)' }}>
          {query.trim().length < MIN_QUERY ? (
            <StatePanel compact icon={Search} title="Search people" body={`Type at least ${MIN_QUERY} characters to begin.`} />
          ) : users.length === 0 && !searching ? (
            <StatePanel compact icon={UserPlus} title="No matches" body={`Nothing found for "${query.trim()}".`} />
          ) : (
            <div className="col" style={{ gap: 'var(--s2)' }}>
              {users.map((u) => (
                <button
                  key={u.id}
                  className="row-item"
                  onClick={() => start(u)}
                  disabled={starting !== null}
                  style={{ textAlign: 'left' }}
                >
                  <Avatar initials={u.initials} gradient={u.avatarGradient} size={46} status={u.online ? 'online' : undefined} />
                  <span className="grow col" style={{ gap: 1, minWidth: 0 }}>
                    <span className="truncate" style={{ fontWeight: 720, fontSize: 'var(--fs-15)', color: 'var(--text)' }}>
                      {u.displayName}
                    </span>
                    <span className="truncate" style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>
                      @{u.handle}
                    </span>
                  </span>
                  {starting === u.id ? <Loader2 size={16} className="spin" style={{ color: 'var(--brand-600)' }} /> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
