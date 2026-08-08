import { useCallback, useEffect, useRef, useState } from 'react'
import { chatsApi } from './api'
import { onConversationChanged, onInboxMessage } from './events'
import { useAuth } from './auth'

/**
 * GET /conversations, with the four states a real network actually has:
 * loading, loaded, empty and failed — plus an explicit `retry`.
 *
 * `conversations` is null until the first response, so a component can tell
 * "not loaded yet" from "loaded and empty" and show a skeleton rather than an
 * empty-state panel that flashes on every mount.
 */
export function useConversations() {
  const { token } = useAuth()
  const [conversations, setConversations] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const alive = useRef(true)
  const requestId = useRef(0)

  /**
   * Set to true on every run, not just at declaration.
   *
   * React StrictMode mounts, unmounts and remounts each component once in
   * development. A cleanup-only effect flips this to false during that
   * simulated unmount and never restores it, because re-running the effect only
   * registers a new cleanup. From then on every `if (!alive.current) return`
   * guard fires, `setLoading(false)` never runs, and the screen sits on its
   * loading skeleton forever while the responses arrive and are discarded.
   */
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const load = useCallback(async () => {
    const id = ++requestId.current
    if (!token) {
      setConversations(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await chatsApi.list()
      if (!alive.current || id !== requestId.current) return
      const nextConversations = data?.conversations
      if (!Array.isArray(nextConversations)) {
        throw new Error('The server returned an invalid conversations response.')
      }
      if (nextConversations.some((conversation) => !conversation?.id || !conversation.peer?.id)) {
        throw new Error('The server returned an incomplete conversation.')
      }
      setConversations(nextConversations)
    } catch (err) {
      if (!alive.current || id !== requestId.current || err.code === 'aborted') return
      setError(err)
    } finally {
      if (alive.current && id === requestId.current) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  /* On desktop the list and an open thread are mounted side by side. Clearing
     that thread's chat changes what this list should show for it (no
     preview, no unread) with nothing else to trigger a refetch. */
  useEffect(() => onConversationChanged(() => load()), [load])

  /** Move a conversation to the top after a new message, without a refetch. */
  const bump = useCallback((conversationId, lastMessage) => {
    setConversations((prev) => {
      if (!prev) return prev
      const index = prev.findIndex((c) => c.id === conversationId)
      if (index === -1) return prev
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.unshift({
        ...item,
        lastMessage,
        updatedAt: lastMessage?.createdAt ?? Date.now(),
      })
      return next
    })
  }, [])

  /* A message arriving over the inbox socket (see lib/realtime/inbox.js) for
     a conversation with no thread open has nothing else to move this list's
     row to the top — the thread's own socket, which normally does that, does
     not exist until someone opens it. */
  useEffect(() => onInboxMessage(bump), [bump])

  return { conversations, loading, error, retry: load, bump }
}
