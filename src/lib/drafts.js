import { useSyncExternalStore } from 'react'

/**
 * Unsent message text, per conversation, surviving navigation and reload.
 *
 * Two readers, which is why this is a store rather than local state in the
 * composer: the composer owns the text, and the chat list needs to show that
 * a draft exists at all ("you were part-way through writing to Maya"). Local
 * state in Composer would vanish the moment the thread unmounts, which is
 * exactly when the list needs to know.
 *
 * Kept out of the message pipeline on purpose. A draft is not a message — it
 * has no id, no ordering, no delivery, and must never be reconciled against
 * the server's history. Storing it in localStorage rather than on the Worker
 * is also deliberate: an unsent thought is the most private thing in the app,
 * and shipping it to a server the moment someone starts typing is not a
 * tradeoff worth making for cross-device convenience.
 */

const STORAGE_KEY = 'uraiq.drafts'
/* Long enough for a real half-written message, short enough that a runaway
   paste cannot fill the origin's storage quota and break the session. */
const MAX_DRAFT_LENGTH = 4000

function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    /* Coerce rather than trust: a non-string value here would end up rendered
       as a React child, and `{}` in a text node throws. */
    return Object.fromEntries(
      Object.entries(raw).filter(([, v]) => typeof v === 'string' && v.length > 0)
    )
  } catch {
    return {}
  }
}

let drafts = readStored()
const listeners = new Set()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
  } catch {
    /* Quota or private mode — the draft still lives in memory for this
       session, which is the case that matters most. */
  }
}

export function getDrafts() {
  return drafts
}

export function getDraft(conversationId) {
  return drafts[conversationId] ?? ''
}

export function setDraft(conversationId, text) {
  if (!conversationId) return
  const next = (text ?? '').slice(0, MAX_DRAFT_LENGTH)
  const current = drafts[conversationId] ?? ''
  if (next === current) return

  /* An empty draft is deleted, not stored as '' — otherwise every thread ever
     opened accumulates a key, and the list has to distinguish "no draft" from
     "a draft that happens to be empty". */
  if (next.trim()) drafts = { ...drafts, [conversationId]: next }
  else {
    const { [conversationId]: _removed, ...rest } = drafts
    drafts = rest
  }

  persist()
  listeners.forEach((l) => l())
}

export function clearDraft(conversationId) {
  setDraft(conversationId, '')
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The whole map — for the chat list, which needs to mark many rows at once. */
export function useDrafts() {
  return useSyncExternalStore(subscribe, getDrafts, () => drafts)
}
