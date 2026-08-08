import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { chatsApi } from '../api'
import { useChatThread } from '../useChatThread'
import { useMe } from '../useMe'
import { useAuth } from '../auth'
import { conversationToChat, messagesToView } from './adapters'

/**
 * One conversation, in the single shape ChatThread renders.
 *
 * Two requests, deliberately separate: the conversation (for the header — the
 * peer's name, avatar and presence) and the message page. A deep link into a
 * thread has no list to read the peer from, so the header cannot depend on the
 * list having loaded.
 */
export function useThread(chatId) {
  const me = useMe()
  const { token } = useAuth()
  const conversation = useConversation(chatId, token)
  const thread = useChatThread(chatId, me?.id, token)

  const {
    markRead,
    retry: retryMessages,
    send: sendMessage,
    edit: editMessage,
    remove: removeMessage,
    clearChat,
  } = thread
  const { retry: retryConversation } = conversation

  /* No reactions endpoint exists yet, so they live in this session only and are
     overlaid at render rather than written into the message list.
     TODO(milestone 2): POST /conversations/:id/messages/:id/reactions. */
  const [reactions, setReactions] = useState({})
  useEffect(() => {
    setReactions({})
  }, [chatId])

  const peerName = conversation.conversation?.peer?.displayName ?? ''

  const chat = useMemo(() => {
    if (!conversation.conversation) return null
    const base = conversationToChat(conversation.conversation, me?.id)
    return {
      ...base,
      /* The socket knows presence more accurately than the REST snapshot taken
         when the thread was opened. */
      online: thread.peerOnline ?? base.online,
      typing: thread.peerTyping,
    }
  }, [conversation.conversation, me?.id, thread.peerOnline, thread.peerTyping])

  const messages = useMemo(() => {
    const list = messagesToView(thread.messages, {
      meId: me?.id,
      peerName,
      peerLastReadId: thread.peerLastReadId,
      peerReadAt: thread.peerReadAt,
    })
    if (Object.keys(reactions).length === 0) return list
    return list.map((m) => (reactions[m.id] ? { ...m, reactions: reactions[m.id] } : m))
  }, [thread.messages, thread.peerLastReadId, thread.peerReadAt, me?.id, peerName, reactions])

  const messagesRef = useRef(messages)
  messagesRef.current = messages

  /* Mark read when the newest incoming message changes while the thread is
     open. Keyed on the id rather than a boolean so a burst of arrivals sends
     one receipt per message instead of one per render. */
  const newestIncomingId = useMemo(() => {
    const newest = thread.messages[thread.messages.length - 1]
    return newest && me?.id && newest.senderId !== me.id ? newest.id : null
  }, [thread.messages, me?.id])

  useEffect(() => {
    if (!newestIncomingId) return
    markRead(newestIncomingId)
  }, [newestIncomingId, markRead])

  const send = useCallback(
    (text, replyTo) => sendMessage(text, { replyToId: replyTo?.id ?? null }),
    [sendMessage]
  )

  const react = useCallback((messageId, emoji) => {
    setReactions((prev) => {
      const current =
        prev[messageId] ?? messagesRef.current.find((m) => m.id === messageId)?.reactions ?? {}
      const next = { ...current }
      const mine = next[emoji]
      if (mine?.mine) {
        if (mine.count <= 1) delete next[emoji]
        else next[emoji] = { count: mine.count - 1, mine: false }
      } else {
        next[emoji] = { count: (mine?.count || 0) + 1, mine: true }
      }
      return { ...prev, [messageId]: next }
    })
  }, [])

  const retry = useCallback(() => {
    retryConversation()
    retryMessages()
  }, [retryConversation, retryMessages])

  return {
    chat,
    messages,
    loading: conversation.loading || thread.loading,
    /* A conversation that is not there is a 404, not a transport failure. The
       component tells them apart to choose between "not found" and "retry". */
    error: conversation.error || thread.error,
    notFound: !conversation.loading && !conversation.error && !conversation.conversation,
    connection: thread.connection,
    hasMore: thread.hasMore,
    loadOlder: thread.loadOlder,
    setTyping: thread.setTyping,
    send,
    edit: editMessage,
    remove: removeMessage,
    clearChat,
    react,
    retry,
  }
}

/** GET /conversations/:id — the header's source of truth. */
function useConversation(id, token) {
  const [conversation, setConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const alive = useRef(true)
  const requestId = useRef(0)

  /* Reset on every run — a cleanup-only effect stays false after StrictMode's
     simulated unmount and silently discards every later response. See the note
     in useConversations.js. */
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current
    if (!id) {
      setLoading(false)
      return
    }
    if (!token) {
      setConversation(null)
      setError(new Error('Your session is still initializing. Please try again.'))
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await chatsApi.one(id)
      if (!alive.current || currentRequest !== requestId.current) return
      const nextConversation = data?.conversation
      /* A malformed response used to reach `conversationToChat`, which
         dereferences `peer` during render and crashes the entire route. Make
         it an explicit retryable screen error instead of a blank screen. */
      if (!nextConversation?.id || !nextConversation.peer?.id) {
        throw new Error('The server returned an incomplete conversation.')
      }
      setConversation(nextConversation)
    } catch (err) {
      if (!alive.current || currentRequest !== requestId.current) return
      /* 403 and 404 both mean "no such thread for you". Neither is worth a
         retry button, so they surface as "not found" rather than an error. */
      if (err.status === 403 || err.status === 404) setConversation(null)
      else setError(err)
    } finally {
      if (alive.current && currentRequest === requestId.current) setLoading(false)
    }
  }, [id, token])

  useEffect(() => {
    setConversation(null)
    load()
  }, [load])

  return { conversation, loading, error, retry: load }
}
