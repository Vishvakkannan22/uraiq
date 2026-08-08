import { useEffect, useRef, useState } from 'react'

/**
 * What a screen reader should hear while a thread is open.
 *
 * Two things are announced, both chosen because they are otherwise conveyed
 * only visually and only by change: a message arriving from the other person,
 * and the live connection dropping or coming back.
 *
 * Three things are deliberately *not* announced:
 *   - Your own sent messages. You just typed it; being read it back is noise.
 *   - The history that loads when the thread opens. That is the document, not
 *     an event — a reader can navigate it directly, and announcing it would
 *     read the entire page aloud on every open.
 *   - Typing indicators. They fire constantly and would talk over everything
 *     that actually matters.
 */
export function useThreadAnnouncer({ messages, loading, connection, conversationId }) {
  const [announcement, setAnnouncement] = useState('')
  /* null means "we have not established a baseline yet" — the first non-empty
     render after opening a thread records where history ended, without
     announcing any of it. */
  const lastSeenId = useRef(null)
  const lastConnection = useRef(connection)

  /* A different thread is a different baseline. Without this, opening thread B
     after thread A would compare B's messages against A's last id and announce
     B's entire history as if it had just arrived. */
  useEffect(() => {
    lastSeenId.current = null
  }, [conversationId])

  useEffect(() => {
    if (loading) return

    const newest = messages[messages.length - 1]
    if (!newest) return

    if (lastSeenId.current === null) {
      lastSeenId.current = newest.id
      return
    }
    if (newest.id === lastSeenId.current) return

    /* Everything that landed since the last baseline. A burst that arrives
       together is summarised rather than read one by one — five separate
       announcements queued back to back is unusable. */
    const previousIndex = messages.findIndex((m) => m.id === lastSeenId.current)
    const arrived = previousIndex === -1 ? [newest] : messages.slice(previousIndex + 1)
    lastSeenId.current = newest.id

    const incoming = arrived.filter((m) => m.from === 'them')
    if (incoming.length === 0) return

    const last = incoming[incoming.length - 1]
    const body = last.deleted
      ? 'Message deleted'
      : last.text || (last.kind === 'voice' ? 'Voice message' : 'Attachment')

    setAnnouncement(
      incoming.length === 1
        ? `${last.author}: ${body}`
        : `${incoming.length} new messages. Latest, from ${last.author}: ${body}`
    )
  }, [messages, loading])

  useEffect(() => {
    if (connection === lastConnection.current) return
    const previous = lastConnection.current
    lastConnection.current = connection

    if (connection === 'reconnecting') {
      setAnnouncement('Connection lost. Reconnecting — new messages may be delayed.')
    } else if (connection === 'open' && previous === 'reconnecting') {
      setAnnouncement('Connection restored.')
    }
  }, [connection])

  return announcement
}
