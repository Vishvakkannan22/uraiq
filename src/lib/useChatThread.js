import { useCallback, useEffect, useRef, useState } from 'react'
import { chatsApi } from './api'
import { createChatSocket } from './realtime/socket'
import { emitConversationChanged, emitConversationRead } from './events'

/**
 * `crypto.randomUUID()` only exists in a secure context — HTTPS, or the
 * `localhost` exemption — so it's silently `undefined` on a phone loading
 * this app over plain HTTP from a LAN IP (e.g. testing against a laptop's
 * dev server), and calling it throws. `getRandomValues` carries no such
 * restriction, so build the UUID from that instead; it's what `randomUUID`
 * itself does internally, this just skips the secure-context gate.
 */
function randomId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * One conversation: history, live updates, optimistic sends.
 *
 * The socket and the REST history are reconciled by id rather than merged
 * blindly — a send can land over the socket before its own HTTP response
 * returns, and the optimistic row must be replaced, not duplicated. `clientId`
 * is what ties the three together.
 */
export function useChatThread(conversationId, meId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [connection, setConnection] = useState('connecting')
  const [peerTyping, setPeerTyping] = useState(false)
  const [peerRead, setPeerRead] = useState({ messageId: null, at: null })
  const [peerOnline, setPeerOnline] = useState(null)

  const socketRef = useRef(null)
  const typingTimer = useRef(null)
  const alive = useRef(true)

  /* Reset on every run — a cleanup-only effect stays false after StrictMode's
     simulated unmount and silently discards every later response. See the note
     in useConversations.js. */
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  /* ---------------------------------------------------------- history --- */

  const load = useCallback(async () => {
    if (!conversationId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await chatsApi.messages(conversationId)
      if (!alive.current) return
      setMessages(data?.messages ?? [])
      setCursor(data?.nextCursor ?? null)
      /* The peer's read cursor comes back with the page, so read ticks are
         correct on first paint instead of waiting for a live read event. */
      if (data?.peerLastReadMessageId) {
        setPeerRead({ messageId: data.peerLastReadMessageId, at: data.peerLastReadAt ?? null })
      }
    } catch (err) {
      if (alive.current) setError(err)
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    setMessages([])
    setCursor(null)
    setPeerRead({ messageId: null, at: null })
    load()
  }, [load])

  const loadOlder = useCallback(async () => {
    if (!cursor) return
    const data = await chatsApi.messages(conversationId, { before: cursor })
    if (!alive.current) return
    setMessages((prev) => [...(data?.messages ?? []), ...prev])
    setCursor(data?.nextCursor ?? null)
  }, [conversationId, cursor])

  /* --------------------------------------------------------- realtime --- */

  useEffect(() => {
    if (!conversationId) return

    setPeerOnline(null)
    setPeerTyping(false)

    const socket = createChatSocket(conversationId, {
      open: () => setConnection('open'),
      reconnecting: () => setConnection('reconnecting'),
      close: () => setConnection('closed'),
      message: (event) => {
        switch (event.type) {
          case 'ready':
            /* Presence for everyone else in the room. In a 1:1 thread a
               non-empty list means the peer is here. */
            setPeerOnline((event.presence?.length ?? 0) > 0)
            break

          case 'message':
            setMessages((prev) => upsert(prev, event.message))
            /* Acknowledge receipt so the sender's tick advances. Only for
               messages we did not send. */
            if (event.message.senderId !== meId) {
              socketRef.current?.send({ type: 'delivered', messageIds: [event.message.id] })
            }
            break

          case 'message.updated':
            setMessages((prev) => prev.map((m) => (m.id === event.message.id ? event.message : m)))
            break

          case 'message.deleted':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === event.messageId ? { ...m, deletedAt: Date.now(), body: null } : m
              )
            )
            break

          case 'delivered':
            setMessages((prev) =>
              prev.map((m) =>
                event.messageIds.includes(m.id) ? { ...m, deliveredAt: event.deliveredAt } : m
              )
            )
            break

          case 'typing':
            /* The room broadcasts typing to every socket but the sender's, so
               this is always the peer, never an echo of our own keystrokes. */
            setPeerTyping(event.typing)
            break

          case 'presence':
            setPeerOnline(event.online)
            break

          case 'read':
            /* Monotonic: an out-of-order event must not walk the cursor
               backwards and un-tick messages that were already seen. */
            setPeerRead((prev) =>
              prev.messageId && event.lastReadMessageId <= prev.messageId
                ? prev
                : { messageId: event.lastReadMessageId, at: event.readAt }
            )
            break

          default:
            break
        }
      },
    })

    socketRef.current = socket
    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [conversationId, meId])

  /* Acknowledge anything already on screen that arrived before the socket was
     ready — otherwise a message fetched by REST is never marked delivered. */
  useEffect(() => {
    if (connection !== 'open' || !meId) return
    const undelivered = messages
      .filter((m) => m.senderId !== meId && !m.deliveredAt && !m.pending)
      .map((m) => m.id)
    if (undelivered.length > 0) {
      socketRef.current?.send({ type: 'delivered', messageIds: undelivered.slice(0, 200) })
    }
  }, [connection, messages, meId])

  /* ---------------------------------------------------------- sending --- */

  const send = useCallback(
    async (body, { replyToId } = {}) => {
      const clientId = randomId()
      const optimistic = {
        /* Sorts after every real ULID, so an in-flight message stays pinned to
           the bottom until the server's row replaces it. */
        id: `~pending-${clientId}`,
        conversationId,
        senderId: meId,
        kind: 'text',
        body,
        replyToId: replyToId ?? null,
        attachments: [],
        moderationState: 'clear',
        deliveredAt: null,
        createdAt: Date.now(),
        editedAt: null,
        deletedAt: null,
        clientId,
        pending: true,
      }
      setMessages((prev) => [...prev, optimistic])

      try {
        const res = await chatsApi.send(conversationId, { body, replyToId, clientId })

        if (res?.status === 'blocked') {
          /* Never written server-side, so remove the optimistic row and hand
             the verdict back for the composer to show. */
          setMessages((prev) => prev.filter((m) => m.clientId !== clientId))
          return res
        }

        setMessages((prev) => prev.map((m) => (m.clientId === clientId ? res.message : m)))
        return res
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) => (m.clientId === clientId ? { ...m, failed: true, pending: false } : m))
        )
        throw err
      }
    },
    [conversationId, meId]
  )

  /**
   * Editing goes back through moderation server-side, so it can be refused the
   * same way a send can. The caller gets the verdict rather than an exception.
   */
  const edit = useCallback(
    async (messageId, body) => {
      const res = await chatsApi.edit(conversationId, messageId, body)
      if (res?.status === 'blocked') return res
      if (res?.message) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? res.message : m)))
      }
      return res
    },
    [conversationId]
  )

  const remove = useCallback(
    async (messageId) => {
      /* Optimistic, and not rolled back on failure: the socket broadcast is the
         source of truth and will restore the row if the delete did not land. */
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deletedAt: Date.now(), body: null } : m))
      )
      await chatsApi.remove(conversationId, messageId)
    },
    [conversationId]
  )

  /**
   * Clear chat: hides this device's view of the history so far. The other
   * participant's copy is untouched server-side — see the route's doc comment.
   *
   * Cleared locally first for an immediate empty thread, then the list is
   * told to refetch its preview for this conversation (see lib/events.js).
   */
  const clearChat = useCallback(async () => {
    await chatsApi.clearChat(conversationId)
    setMessages([])
    setCursor(null)
    emitConversationChanged(conversationId)
  }, [conversationId])

  const retryFailed = useCallback(
    (clientId) => {
      const message = messages.find((m) => m.clientId === clientId)
      if (!message) return
      setMessages((prev) => prev.filter((m) => m.clientId !== clientId))
      return send(message.body, { replyToId: message.replyToId })
    },
    [messages, send]
  )

  /* ----------------------------------------------------------- typing --- */

  const setTyping = useCallback((typing) => {
    socketRef.current?.send({ type: 'typing', typing })
    clearTimeout(typingTimer.current)
    if (typing) {
      /* Auto-expire so a dropped socket cannot leave the peer typing forever. */
      typingTimer.current = setTimeout(
        () => socketRef.current?.send({ type: 'typing', typing: false }),
        4000
      )
    }
  }, [])

  useEffect(() => () => clearTimeout(typingTimer.current), [])

  const markRead = useCallback(
    (lastReadMessageId) => {
      if (!lastReadMessageId) return
      /* Both paths: the socket for an instant tick on the peer's screen, the
         POST for the durable cursor and the unread counter. The nav badge
         (lib/unread.js) listens for the POST to land so it can pull the
         zeroed count back down — it may have already counted this message
         optimistically the instant it arrived over the inbox socket. */
      socketRef.current?.send({ type: 'read', lastReadMessageId })
      chatsApi
        .markRead(conversationId, lastReadMessageId)
        .then(() => emitConversationRead(conversationId))
        .catch(() => {})
    },
    [conversationId]
  )

  return {
    messages,
    loading,
    error,
    connection,
    peerTyping,
    peerOnline,
    peerLastReadId: peerRead.messageId,
    peerReadAt: peerRead.at,
    hasMore: Boolean(cursor),
    loadOlder,
    send,
    edit,
    remove,
    clearChat,
    retryFailed,
    setTyping,
    markRead,
    retry: load,
  }
}

/**
 * Insert or replace by id, keeping the list ordered oldest-first.
 *
 * `clientId` is checked first: a message we sent arrives back over the socket
 * with a real ULID, and matching on id alone would leave the optimistic row
 * sitting beside its own confirmation.
 *
 * Sorting is by id rather than `createdAt` — ULIDs are lexicographically
 * ordered by time, and the optimistic `~pending-` prefix sorts after all of
 * them, so an in-flight message stays at the bottom where it was typed.
 */
function upsert(list, message) {
  const byClientId = message.clientId ? list.findIndex((m) => m.clientId === message.clientId) : -1
  if (byClientId !== -1) {
    const next = [...list]
    next[byClientId] = message
    return next.sort(byId)
  }
  if (list.some((m) => m.id === message.id)) return list
  return [...list, message].sort(byId)
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
