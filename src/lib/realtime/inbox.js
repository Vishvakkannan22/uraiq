import { useEffect, useRef } from 'react'
import { createInboxSocket } from './socket'
import { useMe } from '../useMe'
import { emitInboxMessage } from '../events'

/**
 * The one always-on connection for a signed-in session — independent of
 * which conversation, if any, is open right now.
 *
 * Mounted once at the app shell (see layout/AppShell.jsx). Its only job:
 * ack every incoming message the instant it arrives, which is what stamps
 * `delivered_at` without the recipient opening that specific thread — see
 * worker/src/ws/UserInbox.ts for the server side of this. It also tells the
 * conversation list about the arrival (lib/useConversations.js listens via
 * `onInboxMessage`) so a new message bumps that row to the top even while no
 * thread is open.
 *
 * Deliberately does not touch typing, presence or read state — those stay
 * scoped to whichever single thread is open, via useChatThread's own
 * per-conversation socket. This connection only ever needs to answer "is
 * this device reachable right now".
 */
export function useInbox() {
  const me = useMe()
  const socketRef = useRef(null)

  useEffect(() => {
    if (!me?.id) return

    const socket = createInboxSocket(me.id, {
      message: (event) => {
        if (event.type !== 'message') return
        const { conversationId, senderId, id } = event.message
        /* The inbox only ever receives messages addressed to us, but guard
           anyway rather than trust that invariant silently. */
        if (senderId === me.id) return

        socketRef.current?.send({ type: 'delivered', conversationId, messageIds: [id] })
        emitInboxMessage(conversationId, event.message)
      },
    })

    socketRef.current = socket
    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [me?.id])
}
