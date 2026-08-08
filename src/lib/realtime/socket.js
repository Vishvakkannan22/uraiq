import { WS_URL } from '../api/config'
import { endpoints } from '../api/endpoints'
import { getToken } from '../auth'

/**
 * WebSocket client for a Durable Object room.
 *
 * On Cloudflare each conversation is one Durable Object holding the socket
 * set, so `createChatSocket` connects per chat rather than once per app —
 * paired with the server-side WebSocket Hibernation API
 * (`state.acceptWebSocket`), so an idle room bills for wall-clock duration.
 * `createInboxSocket` (below) connects to the per-*user* room instead, for
 * the one thing that has to work regardless of which conversation is open:
 * see lib/realtime/inbox.js.
 *
 * Both share the same connection machinery — reconnect backoff, heartbeat,
 * the handshake — since a Durable Object socket is a Durable Object socket
 * regardless of what it's keyed by; only the URL and the room identifier
 * embedded in log/emit calls differ.
 *
 * Auth is passed as a WebSocket subprotocol, not a query string: browsers
 * cannot set headers on a WebSocket handshake, and a token in the URL ends up
 * in access logs. The Worker reads `Sec-WebSocket-Protocol` and MUST echo one
 * of the offered values back, or the browser rejects the connection:
 *
 *   const proto = req.headers.get('Sec-WebSocket-Protocol')  // "bearer, <jwt>"
 *   return new Response(null, {
 *     status: 101,
 *     webSocket: client,
 *     headers: { 'Sec-WebSocket-Protocol': 'bearer' },
 *   })
 */

const BACKOFF = [500, 1000, 2000, 4000, 8000, 15000]
const HEARTBEAT_MS = 25000
const PONG_GRACE_MS = 10000

export function createChatSocket(conversationId, handlers = {}) {
  return createRoomSocket(endpoints.chatSocket(conversationId), handlers)
}

export function createInboxSocket(userId, handlers = {}) {
  return createRoomSocket(endpoints.inboxSocket(userId), handlers)
}

function createRoomSocket(path, handlers = {}) {
  let ws = null
  let attempt = 0
  let closed = false
  let heartbeat = null
  let pongTimer = null

  const emit = (event, payload) => handlers[event]?.(payload)

  function clearTimers() {
    clearInterval(heartbeat)
    clearTimeout(pongTimer)
    heartbeat = null
    pongTimer = null
  }

  /* A socket can stay "open" long after the network is gone. Ping, and if no
     pong arrives, tear it down so the backoff loop can rebuild it. */
  function startHeartbeat() {
    clearTimers()
    heartbeat = setInterval(() => {
      if (ws?.readyState !== WebSocket.OPEN) return
      send({ type: 'ping', t: Date.now() })
      pongTimer = setTimeout(() => ws?.close(4000, 'heartbeat timeout'), PONG_GRACE_MS)
    }, HEARTBEAT_MS)
  }

  function connect() {
    if (closed || !WS_URL) return

    const token = getToken()
    const url = `${WS_URL}${path}`

    try {
      ws = token ? new WebSocket(url, ['bearer', token]) : new WebSocket(url)
    } catch (err) {
      emit('error', err)
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      /* A close() that landed while this was still handshaking already asked
         for the socket to go away; honour that instead of announcing an open
         connection nobody is listening to. */
      if (closed) {
        try { ws?.close(1000, 'client closed') } catch { /* already gone */ }
        return
      }
      attempt = 0
      startHeartbeat()
      emit('open')
    }

    ws.onmessage = (e) => {
      let data
      try {
        data = JSON.parse(e.data)
      } catch {
        return
      }
      if (data.type === 'pong') {
        clearTimeout(pongTimer)
        return
      }
      emit('message', data)
    }

    ws.onerror = (err) => emit('error', err)

    ws.onclose = (e) => {
      clearTimers()
      emit('close', e)
      /* 1000 is a clean server-side close; anything else we try to recover. */
      if (!closed && e.code !== 1000) scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (closed) return
    const wait = BACKOFF[Math.min(attempt, BACKOFF.length - 1)]
    attempt += 1
    emit('reconnecting', { attempt, wait })
    setTimeout(connect, wait)
  }

  function send(payload) {
    if (ws?.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify(payload))
    return true
  }

  /**
   * Tear down without aborting an upgrade that is still in flight.
   *
   * Calling `close()` on a CONNECTING socket is legal, but it abandons the
   * handshake half-finished — the server has already accepted the connection
   * and is mid-response when the client disappears. React StrictMode does
   * exactly this on every mount in development (mount, unmount, remount), and
   * so does a user tapping quickly between conversations.
   *
   * So a still-connecting socket is closed cleanly once it opens, rather than
   * pulled out from under the handshake. `closed` is already true by then, so
   * the open handler above bows out and no reconnect is scheduled.
   */
  function close() {
    closed = true
    clearTimers()

    const socket = ws
    ws = null
    if (!socket) return

    if (socket.readyState === WebSocket.CONNECTING) {
      socket.addEventListener('open', () => socket.close(1000, 'client closed'), { once: true })
      /* A failed handshake is the outcome we wanted anyway. */
      socket.addEventListener('error', () => {}, { once: true })
      return
    }

    if (socket.readyState === WebSocket.OPEN) {
      socket.close(1000, 'client closed')
    }
  }

  connect()

  return { send, close, get state() { return ws?.readyState ?? WebSocket.CLOSED } }
}
