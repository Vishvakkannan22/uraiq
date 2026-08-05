import { useMemo } from 'react'
import { useConversations } from '../useConversations'
import { useMe } from '../useMe'
import { conversationToChat } from './adapters'

/**
 * The chat list, from the Worker.
 *
 * `chats` is an empty array until the first response lands; `loading`
 * distinguishes that from a genuinely empty inbox, so the list shows a skeleton
 * rather than "no conversations yet" on every mount.
 */
export function useChatList() {
  const { conversations, loading, error, retry } = useConversations()
  const me = useMe()

  const chats = useMemo(
    () => (conversations ?? []).map((c) => conversationToChat(c, me?.id)),
    [conversations, me?.id]
  )

  return { chats, loading, error, retry }
}
