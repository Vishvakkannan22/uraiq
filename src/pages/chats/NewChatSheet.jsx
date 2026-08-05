import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search, UserPlus } from 'lucide-react'
import Sheet from '../../components/ui/Sheet'
import StatePanel from '../../components/ui/StatePanel'
import Avatar from '../../components/ui/Avatar'
import { chatsApi, usersApi } from '../../lib/api'

const DEBOUNCE_MS = 280
/* The Worker returns nothing under two characters — a prefix search on one
   letter is a scan of most of the table. Match that here so the empty result
   reads as "keep typing" rather than "nobody found". */
const MIN_QUERY = 2

/**
 * Start a 1:1 conversation.
 *
 * Search is a prefix match on handle and display name, so typing part-way
 * through a name finds nothing by design; see the TODO in worker/routes/users.
 */
export default function NewChatSheet({ open, onClose, desktop }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const [starting, setStarting] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setUsers([])
    setError(null)
    setStarting(null)
  }, [open])

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_QUERY) {
      setUsers([])
      setSearching(false)
      return
    }

    /* Debounce the keystrokes, and abort the request the moment another one
       starts, so a slow response cannot overwrite a newer query's results. */
    const controller = new AbortController()
    setSearching(true)
    const t = setTimeout(async () => {
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
      clearTimeout(t)
      controller.abort()
    }
  }, [query])

  async function start(user) {
    setStarting(user.id)
    try {
      /* Idempotent server-side: opening the same person twice converges on one
         conversation rather than creating a second. */
      const data = await chatsApi.create(user.id)
      const id = data?.conversation?.id
      if (!id) throw new Error('Could not open that conversation')
      onClose()
      navigate(`/chats/${id}`)
    } catch (err) {
      setError(err)
      setStarting(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} desktop={desktop}>
      <h3 style={{ fontSize: 'var(--fs-17)', marginBottom: 'var(--s1)' }}>New chat</h3>
      <p style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)', marginBottom: 'var(--s4)' }}>
        Search by name or @handle.
      </p>

      <div className="search" style={{ marginBottom: 'var(--s4)' }}>
        <Search size={16} />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or handle"
          aria-label="Search people"
        />
        {searching && (
          <span style={{ display: 'flex', color: 'var(--text-4)' }} aria-label="Searching">
            <Loader2 size={15} className="spin" />
          </span>
        )}
      </div>

      {error && (
        <div className="notice notice--error" role="alert" style={{ marginBottom: 'var(--s3)' }}>
          {error.message}
        </div>
      )}

      {query.trim().length < MIN_QUERY ? (
        <StatePanel
          compact
          icon={UserPlus}
          title="Find someone"
          body={`Type at least ${MIN_QUERY} characters to search.`}
        />
      ) : users.length === 0 && !searching ? (
        <StatePanel compact icon={Search} title="No matches" body={`Nothing found for “${query.trim()}”.`} />
      ) : (
        <div className="col" style={{ gap: 'var(--s1)' }}>
          {users.map((u) => (
            <button
              key={u.id}
              className="row-item"
              onClick={() => start(u)}
              disabled={starting !== null}
              style={{ textAlign: 'left' }}
            >
              <Avatar
                initials={u.initials}
                gradient={u.avatarGradient}
                size={40}
                status={u.online ? 'online' : undefined}
              />
              <span className="grow col" style={{ gap: 1, minWidth: 0 }}>
                <span
                  className="truncate"
                  style={{ fontWeight: 640, fontSize: 'var(--fs-14)', color: 'var(--text)' }}
                >
                  {u.displayName}
                </span>
                <span className="truncate" style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>
                  @{u.handle}
                </span>
              </span>
              {starting === u.id && <Loader2 size={16} className="spin" style={{ color: 'var(--brand-600)' }} />}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
