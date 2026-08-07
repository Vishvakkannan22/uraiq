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
