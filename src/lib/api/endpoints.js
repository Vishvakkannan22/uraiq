/**
 * Every path the client knows about, in one file.
 *
 * These now match the Worker in ../../worker exactly — see worker/README.md
 * for the full table. Rename a route there and this is the only file here that
 * needs to change.
 */

export const endpoints = {
  // ---- Auth ----
  login: () => '/auth/login',
  signup: () => '/auth/signup',
  refresh: () => '/auth/refresh',
  logout: () => '/auth/logout',
  me: () => '/auth/me',

  // ---- Users ----
  searchUsers: (q) => `/users/search?q=${encodeURIComponent(q)}`,
  user: (handle) => `/users/${encodeURIComponent(handle)}`,
  updateProfile: () => '/users/me',

  // ---- Conversations ----
  conversations: () => '/conversations',
  conversation: (id) => `/conversations/${id}`,

  // ---- Messages ----
  messages: (conversationId, { before, limit = 50 } = {}) => {
    const q = new URLSearchParams({ limit: String(limit) })
    if (before) q.set('before', before)
    return `/conversations/${conversationId}/messages?${q}`
  },
  sendMessage: (conversationId) => `/conversations/${conversationId}/messages`,
  message: (conversationId, messageId) => `/conversations/${conversationId}/messages/${messageId}`,
  markRead: (conversationId) => `/conversations/${conversationId}/read`,

  /* Durable Object socket, one per conversation. */
  chatSocket: (conversationId) => `/conversations/${conversationId}/ws`,

  // ---- Media ----
  upload: () => '/media',

  // ---- Agents ----
  moderate: () => '/agents/moderate',
}
