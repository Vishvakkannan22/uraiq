/**
 * A minimal signal for "a conversation changed in a way its own hook can't
 * tell the list about."
 *
 * `useConversations` and `useChatThread` are separate hook instances with no
 * shared state — on desktop both are mounted at once (list + thread side by
 * side), and clearing a chat from the thread has nothing to poke the list's
 * cached data. Rather than thread a callback prop through several layers for
 * one interaction, this is a single dispatch/subscribe pair scoped to exactly
 * that need.
 */
const target = new EventTarget()

export function emitConversationChanged(conversationId) {
  target.dispatchEvent(new CustomEvent('conversation-changed', { detail: { conversationId } }))
}

/** Returns an unsubscribe function, so callers can use it directly in a `useEffect` cleanup. */
export function onConversationChanged(handler) {
  const listener = (event) => handler(event.detail.conversationId)
  target.addEventListener('conversation-changed', listener)
  return () => target.removeEventListener('conversation-changed', listener)
}

/**
 * A message arrived over the inbox socket (see lib/realtime/inbox.js) for a
 * conversation that may or may not have its own thread open right now.
 *
 * Separate from `conversation-changed`: that one means "go refetch", this one
 * carries the message itself so the list can bump a row without a round trip.
 */
export function emitInboxMessage(conversationId, message) {
  target.dispatchEvent(new CustomEvent('inbox-message', { detail: { conversationId, message } }))
}

export function onInboxMessage(handler) {
  const listener = (event) => handler(event.detail.conversationId, event.detail.message)
  target.addEventListener('inbox-message', listener)
  return () => target.removeEventListener('inbox-message', listener)
}

/**
 * This device just marked a conversation read.
 *
 * Separate from `conversation-changed` (which covers clear-chat) so a
 * listener that only cares about unread count — see lib/unread.js — does not
 * have to refetch on every kind of change, only the one that can zero a
 * counter.
 */
export function emitConversationRead(conversationId) {
  target.dispatchEvent(new CustomEvent('conversation-read', { detail: { conversationId } }))
}

export function onConversationRead(handler) {
  const listener = (event) => handler(event.detail.conversationId)
  target.addEventListener('conversation-read', listener)
  return () => target.removeEventListener('conversation-read', listener)
}
