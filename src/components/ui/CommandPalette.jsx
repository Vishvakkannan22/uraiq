import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Search } from 'lucide-react'
import Avatar from './Avatar'
import { navItems } from '../../layout/navItems'
import { spring } from '../../lib/motion'
import { useChatList } from '../../lib/chat/useChatList'

/**
 * Subsequence match, the same rule editors use: every character of the query
 * must appear in order, not necessarily adjacent. "mv" finds "Marcus Vance".
 * Score rewards earlier and tighter matches so exact prefixes float up.
 */
function fuzzyScore(text, query) {
  if (!query) return 0
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  let ti = 0
  let score = 0
  let streak = 0
  for (const ch of q) {
    const found = t.indexOf(ch, ti)
    if (found === -1) return -1
    streak = found === ti ? streak + 1 : 0
    score += 10 - Math.min(found - ti, 9) + streak * 4
    ti = found + 1
  }
  if (t.startsWith(q)) score += 40
  return score
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const { chats } = useChatList()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const commands = useMemo(
    () => [
      ...navItems.map((n) => ({
        id: `go-${n.key}`,
        group: 'Go to',
        label: n.label,
        icon: n.icon,
        run: () => navigate(n.to),
      })),
      /* Real conversations. Only the ones already loaded — the palette is a
         jump list over what you have, not a search endpoint. */
      ...chats.map((c) => ({
        id: `chat-${c.id}`,
        group: 'Chats',
        label: c.name,
        hint: c.preview,
        avatar: c,
        run: () => navigate(`/chats/${c.id}`),
      })),
      { id: 'act-activity', group: 'Actions', label: 'Open Activity', run: () => navigate('/notifications') },
      { id: 'act-groups', group: 'Actions', label: 'Open Groups', run: () => navigate('/communities') },
      { id: 'act-profile', group: 'Actions', label: 'Open your profile', run: () => navigate('/profile') },
    ],
    [navigate, chats]
  )

  const results = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 8)
    return commands
      .map((c) => ({ c, s: Math.max(fuzzyScore(c.label, query), fuzzyScore(c.hint || '', query) - 20) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 10)
      .map((r) => r.c)
  }, [commands, query])

  useEffect(() => setCursor(0), [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      /* rAF, not a bare focus() — the input isn't in the DOM until the
         enter animation has committed its first frame. */
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  /* Keep the cursor row in view when arrowing past the fold. */
  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => (c + 1) % Math.max(results.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => (c - 1 + results.length) % Math.max(results.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = results[cursor]
      if (pick) {
        pick.run()
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  let lastGroup = null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
          />
          <motion.div
            className="cmdk"
            role="dialog"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={spring}
            onKeyDown={onKeyDown}
          >
            <div className="cmdk__field">
              <Search size={18} style={{ color: 'var(--text-4)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to a chat, screen or action…"
                aria-label="Command"
              />
              <kbd className="cmdk__kbd">esc</kbd>
            </div>

            <div className="cmdk__list" ref={listRef}>
              {results.length === 0 && (
                <div className="cmdk__empty">No matches for “{query}”</div>
              )}
              {results.map((c, i) => {
                const showGroup = c.group !== lastGroup
                lastGroup = c.group
                const Icon = c.icon
                return (
                  <div key={c.id}>
                    {showGroup && <div className="cmdk__group">{c.group}</div>}
                    <button
                      className={`cmdk__item ${i === cursor ? 'cmdk__item--active' : ''}`}
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => {
                        c.run()
                        onClose()
                      }}
                    >
                      {c.avatar ? (
                        <Avatar initials={c.avatar.initials} gradient={c.avatar.gradient} size={26} />
                      ) : (
                        <span className="cmdk__icon">{Icon ? <Icon size={16} /> : <CornerDownLeft size={16} />}</span>
                      )}
                      <span className="grow truncate" style={{ textAlign: 'left' }}>{c.label}</span>
                      {c.hint && <span className="cmdk__hint truncate">{c.hint}</span>}
                      {i === cursor && <CornerDownLeft size={14} style={{ color: 'var(--text-4)', flexShrink: 0 }} />}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="cmdk__foot">
              <span><kbd className="cmdk__kbd">↑</kbd><kbd className="cmdk__kbd">↓</kbd> navigate</span>
              <span><kbd className="cmdk__kbd">↵</kbd> open</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
