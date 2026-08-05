import { useSyncExternalStore } from 'react'
import { API_URL, LIVE, REFRESH_KEY, TOKEN_KEY, USER_KEY } from './api/config'
import { endpoints } from './api/endpoints'

/**
 * JWT session.
 *
 * Tokens live in localStorage so a reload keeps you signed in. That trades XSS
 * exposure for persistence — the usual alternative is an httpOnly cookie, which
 * removes the token from JS entirely but needs credentialed CORS on the Worker.
 * If you'd rather have that, this is the only file that changes.
 *
 * A short-lived access token plus a refresh token keeps the blast radius small:
 * see `refreshSession`, which the API client calls once on a 401.
 */

let access = null
let refresh = null
let user = null
/* Bumped on every change. `useSyncExternalStore` compares snapshots by
   identity, so a counter is what makes a profile update re-render — returning
   the token would miss any change that leaves the token alone. */
let version = 0
const listeners = new Set()

function load() {
  try {
    access = localStorage.getItem(TOKEN_KEY)
    refresh = localStorage.getItem(REFRESH_KEY)
    const cached = localStorage.getItem(USER_KEY)
    /* Assigned unconditionally: `load` runs again when another tab changes the
       session, and leaving a stale profile in place there would show one
       person's name over another person's messages. */
    user = cached ? JSON.parse(cached) : null
  } catch {
    /* private mode, or a corrupt profile blob — the session still works and
       /auth/me will refill it. */
    user = null
  }
}
load()

/**
 * Every tab on this origin shares one localStorage, so signing in somewhere
 * else replaces the token this tab is holding in memory. Without this listener
 * the other tab carries on with a dead session: its requests 401, the client
 * tries to refresh with an already-rotated token, and the user is bounced to
 * /login with no explanation.
 *
 * The `storage` event fires only in the tabs that did *not* make the change —
 * exactly the ones that need to hear about it.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key && ![TOKEN_KEY, REFRESH_KEY, USER_KEY].includes(event.key)) return
    load()
    emit()
  })
}

function emit() {
  version += 1
  listeners.forEach((l) => l())
}

function persist() {
  try {
    if (access) localStorage.setItem(TOKEN_KEY, access)
    else localStorage.removeItem(TOKEN_KEY)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
    else localStorage.removeItem(REFRESH_KEY)
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* not persisting is survivable; the tab stays signed in */
  }
}

export function getToken() {
  return access
}

export function getRefreshToken() {
  return refresh
}

export function getUser() {
  return user
}

/**
 * There is no mock mode any more: the chat screens read from the Worker and
 * nothing else, so an unauthenticated session has nothing to show. A missing
 * VITE_API_URL therefore lands on /login rather than on empty screens.
 */
export function isAuthed() {
  return Boolean(access)
}

export function setSession({ token, refreshToken, user: nextUser }) {
  access = token || null
  refresh = refreshToken || null
  user = nextUser || null
  persist()
  emit()
}

/** Update the cached profile without touching the tokens. */
export function setUser(nextUser) {
  user = nextUser || null
  persist()
  emit()
}

export function clearSession() {
  access = null
  refresh = null
  user = null
  persist()
  emit()
}

/**
 * Exchange the refresh token for a new access token.
 *
 * Deliberately uses bare `fetch` rather than the API client: the client calls
 * *this* on 401, and routing it back through the client would recurse.
 *
 * Concurrent 401s share one in-flight refresh so a burst of failed requests
 * doesn't fire N refreshes and invalidate each other's tokens.
 */
let inFlight = null

export function refreshSession() {
  if (!refresh || !API_URL) return Promise.resolve(false)
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}${endpoints.refresh()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      })
      if (!res.ok) return false
      const data = await res.json()
      if (!data?.token) return false
      setSession({ token: data.token, refreshToken: data.refreshToken || refresh, user: data.user || user })
      return true
    } catch {
      return false
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function snapshot() {
  return version
}

/** Re-renders on sign-in, sign-out, and profile refresh. */
export function useAuth() {
  useSyncExternalStore(subscribe, snapshot, () => 0)
  return { token: access, user, authed: isAuthed() }
}
