import { del, get, patch, post } from './client'
import { endpoints } from './endpoints'
import { setSession, clearSession, getRefreshToken } from '../auth'

/* Local stand-ins for features that have no backend yet. These are NOT chat
   data — they are unbuilt features operating on real conversation ids, and
   each is marked with the milestone that will replace it. */
import * as localAssistant from '../assistant'
import { evaluate as localEvaluate, standing as localStanding } from '../moderation'
import { healthOf as localHealth } from '../conversationHealth'

/**
 * The app's data layer. Components import from here and never from `client`,
 * so a route change or a payload rename stays inside this folder.
 *
 * Everything under `auth`, `chatsApi` and `usersApi` talks to the Worker and
 * has no fallback: the chat screens show real conversations or an error, never
 * invented ones.
 */

export const auth = {
  async login(email, password) {
    const data = await post(endpoints.login(), { email, password }, { auth: false })
    setSession(data)
    return data.user
  },

  async signup(payload) {
    const data = await post(endpoints.signup(), payload, { auth: false })
    setSession(data)
    return data.user
  },

  async logout() {
    /* Send this device's refresh token so only this session is revoked —
       without it the server revokes every session for the user, which would
       sign them out on their phone because they signed out on their laptop.
       Best-effort: a failed revoke must not strand them signed in here. */
    await post(endpoints.logout(), { refreshToken: getRefreshToken() }, { auth: true }).catch(() => {})
    clearSession()
  },

  me: () => get(endpoints.me()),
}

export const chatsApi = {
  list: (opts) => get(endpoints.conversations(), opts),
  create: (peerId) => post(endpoints.conversations(), { peerId }),
  one: (id, opts) => get(endpoints.conversation(id), opts),
  messages: (id, params, opts) => get(endpoints.messages(id, params), opts),
  send: (id, message) => post(endpoints.sendMessage(id), message),
  edit: (id, messageId, body) => patch(endpoints.message(id, messageId), { body }),
  remove: (id, messageId) => del(endpoints.message(id, messageId)),
  markRead: (id, lastReadMessageId) => post(endpoints.markRead(id), { lastReadMessageId }),
}

export const usersApi = {
  search: (q, opts) => get(endpoints.searchUsers(q), opts),
  get: (handle, opts) => get(endpoints.user(handle), opts),
  update: (patchBody) => patch(endpoints.updateProfile(), patchBody),
}

export const agents = {
  /**
   * Pre-send check, called on a debounce while the user types.
   *
   * Falls back to the local heuristic rather than to "clear": failing open on a
   * moderation call would silently disable the product's core protection the
   * moment the network blips. The server runs the same classifier again on
   * send, so the fallback can only be more cautious than the real answer, never
   * less.
   */
  async moderate(text, { signal } = {}) {
    try {
      return await post(endpoints.moderate(), { text }, { signal })
    } catch (err) {
      if (err.code === 'aborted') throw err
      return localEvaluate(text)
    }
  },

  /* TODO(milestone 2): no backend routes exist for these yet. They are derived
     locally from the conversation id and are not analysis of real messages —
     see src/lib/conversationHealth.js. Replace each with an agent endpoint
     before presenting any of it as insight. */
  brief: () => Promise.resolve(localAssistant.dailyBrief()),
  notes: (chatId) => Promise.resolve(localAssistant.notesFor(chatId)),
  health: (chatId) => Promise.resolve(localHealth(chatId)),
  standing: () => Promise.resolve(localStanding),
  report: (payload) => Promise.resolve({ ok: true, payload }),
}

export { ApiError } from './client'
export { LIVE } from './config'
