/**
 * Wire DTOs -> the shapes the chat components already render.
 *
 * The components were written against the mock data, and the brief was to keep
 * the UI unchanged. So rather than renaming props across ChatRow, MessageBubble
 * and Composer, every field difference between the Worker and the mocks is
 * resolved here. One file to read when the API changes, and the mock path keeps
 * working untouched.
 */

/* All date/time formatting lives in one place, fixed to IST — see
   lib/time.js for why that file exists at all. */
import { timeLabel, listTimeLabel, dayLabel } from '../time'

export { timeLabel, listTimeLabel, dayLabel }

const KIND_LABEL = {
  image: 'Photo',
  video: 'Video',
  voice: 'Voice message',
  document: 'Document',
}

export function previewOf(message) {
  if (!message) return 'No messages yet'
  if (message.deletedAt) return 'Message deleted'
  if (message.body) return message.body
  const first = message.attachments?.[0]
  return KIND_LABEL[first?.kind] ?? KIND_LABEL[message.kind] ?? 'Attachment'
}

/**
 * ConversationDTO -> the `chat` object ChatRow and the thread header consume.
 *
 * `group`, `members` and `pinned` are absent by design: milestone 1 is 1:1 only
 * and there is no pin column, so they stay falsy rather than being invented.
 */
export function conversationToChat(conversation, meId) {
  const { peer, lastMessage } = conversation
  return {
    id: conversation.id,
    peerId: peer.id,
    name: peer.displayName,
    handle: peer.handle,
    initials: peer.initials,
    gradient: peer.avatarGradient,
    avatarUrl: peer.avatarUrl,
    online: peer.online,
    lastSeenAt: peer.lastSeenAt,
    preview: previewOf(lastMessage),
    time: listTimeLabel(conversation.updatedAt),
    updatedAt: conversation.updatedAt,
    unread: conversation.unreadCount,
    muted: conversation.muted,
    archived: conversation.archived,
    /* Outgoing decides whether the list shows a delivery pulse next to the
       preview. Unknown sender (no messages yet) is not outgoing. */
    outgoing: Boolean(lastMessage && meId && lastMessage.senderId === meId),
    delivered: Boolean(lastMessage),
    read: conversation.unreadCount === 0,
    typing: false,
  }
}

/**
 * An outgoing message's delivery state, in the order it actually progresses:
 *
 *   sending  — in flight: no server-confirmed id yet, this is still the
 *              optimistic row
 *   sent     — the server has it durably, but the peer's device has not
 *              acknowledged it — most often because the peer is offline or
 *              the app isn't open anywhere for them right now. This is a real,
 *              possibly long-lived state, not a transient one: collapsing it
 *              into "sending" would tell the sender their message never left,
 *              when it in fact did.
 *   received — the peer's device acknowledged it (their inbox socket or an
 *              open thread stamped delivered_at — see worker/src/ws/UserInbox.ts)
 *   seen     — the peer's read cursor has passed it
 *
 * The read check compares ids, not timestamps: ULIDs sort lexicographically in
 * creation order, so `id <= cursor` is the same comparison and needs no extra
 * round trip.
 */
function statusOf(message, out, peerLastReadId) {
  if (!out) return undefined
  if (message.failed) return 'failed'
  if (message.pending) return 'sending'
  if (peerLastReadId && message.id <= peerLastReadId) return 'seen'
  if (message.deliveredAt) return 'received'
  return 'sent'
}

/**
 * MessageDTO[] -> bubble view models, oldest first.
 *
 * Day dividers and reply quotes are derived here because both need the whole
 * list: a divider depends on the previous message's date, and a quote needs the
 * parent message resolved by id.
 */
export function messagesToView(messages, { meId, peerName, peerLastReadId, peerReadAt }) {
  const byId = new Map(messages.map((m) => [m.id, m]))
  let lastDay = null

  return messages.map((m) => {
    const day = dayLabel(m.createdAt)
    const showDay = day !== lastDay
    lastDay = day

    const out = Boolean(meId) && m.senderId === meId
    const parent = m.replyToId ? byId.get(m.replyToId) : null
    const status = statusOf(m, out, peerLastReadId)
    const time = timeLabel(m.createdAt)

    return {
      id: m.id,
      clientId: m.clientId ?? null,
      from: out ? 'me' : 'them',
      author: out ? 'You' : peerName,
      kind: m.kind,
      /* A deleted message keeps its slot so replies above it still make sense,
         but the body is gone server-side and is not reconstructed here. */
      text: m.deletedAt ? 'This message was deleted' : m.body,
      deleted: Boolean(m.deletedAt),
      attachments: m.attachments ?? [],
      time,
      createdAt: m.createdAt,
      day: showDay ? day : undefined,
      edited: Boolean(m.editedAt),
      flagged: m.moderationState === 'flagged',
      status,
      /* `received` is a real timestamp from the server. `seen` is only known
         when a read event arrived in this session — read_receipts stores one
         cursor per member, not a timestamp per message — so it is left blank
         rather than filled with the send time, which would be a lie. */
      statusTrail: out
        ? {
            sending: time,
            received: m.deliveredAt ? timeLabel(m.deliveredAt) : undefined,
            seen: status === 'seen' && peerReadAt ? timeLabel(peerReadAt) : undefined,
          }
        : undefined,
      replyTo: parent
        ? {
            author: Boolean(meId) && parent.senderId === meId ? 'You' : peerName,
            text: previewOf(parent),
          }
        : undefined,
      pending: Boolean(m.pending),
      failed: Boolean(m.failed),
    }
  })
}
