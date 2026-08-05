import { useEffect } from 'react'
import { auth as authApi } from './api'
import { setUser, useAuth } from './auth'

/**
 * The signed-in user.
 *
 * Everything in a thread hangs off this: "is this message mine" is decided by
 * comparing `senderId` to `me.id`, so a null here would render the whole
 * conversation as incoming. The profile is cached in localStorage by `auth`,
 * and `/auth/me` refills it after a reload that only kept the tokens.
 */
export function useMe() {
  const { user, token } = useAuth()

  useEffect(() => {
    if (user || !token) return
    let alive = true
    authApi
      .me()
      .then((data) => {
        /* A failure here is not fatal — the next authenticated request will
           either refresh the session or land the user back on /login. */
        if (alive && data?.user) setUser(data.user)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [user, token])

  return user
}
