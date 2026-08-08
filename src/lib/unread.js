import { useEffect, useSyncExternalStore } from 'react'
import { chatsApi } from './api'
import { onInboxMessage, onConversationChanged, onConversationRead } from './events'
import { useAuth } from './auth'

/**
 * Total unread messages across every conversation — what the nav badge on
 * Messages shows (TabBar.jsx on mobile, NavRail.jsx on desktop).
 *
 * A module-level singleton rather than a fetch per component: TabBar and
 * NavRail are mutually exclusive (mobile vs. desktop) but remount on a
 * breakpoint change, and a shared count survives that without the badge
 * flashing back to zero mid-resize. It is kept live the same way the rest of
 * the app's real-time state is — events, not polling:
 *
 *   - `onInboxMessage`  bumps it by one the instant a message arrives
 *     anywhere in the app (see lib/realtime/inbox.js), independent of
 *     whether its thread happens to be open.
 *   - `onConversationRead` / `onConversationChanged` pull it back to the
 *     server's real number after anything that can zero a conversation's
 *     unread count (opening a thread, clearing a chat) — reconciling away
 *     the case where the optimistic +1 above counted a message whose thread
 *     was already open and got marked read in the same tick.
 */

let total = 0
let wired = false
const listeners = new Set()

function emit() {
  listeners.forEach((l) => l())
}

async function refresh() {
  try {
    const data = await chatsApi.list()
    total = (data?.conversations ?? []).reduce((sum, c) => sum + (c.unreadCount || 0), 0)
    emit()
  } catch {
    /* A stale count is less disruptive than one that blanks out on a
       network blip — leave the last known total in place. */
  }
}

function wire() {
  if (wired) return
  wired = true
  onInboxMessage(() => {
    total += 1
    emit()
  })
  onConversationChanged(refresh)
  onConversationRead(refresh)
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function snapshot() {
  return total
}

export function useUnreadCount() {
  const { authed } = useAuth()

  useEffect(() => {
    wire()
    if (authed) {
      refresh()
    } else {
      /* Signing out with a stale count still in memory would show the
         previous account's unread badge for a moment on the login screen. */
      total = 0
      emit()
    }
  }, [authed])

  return useSyncExternalStore(subscribe, snapshot, () => 0)
}
