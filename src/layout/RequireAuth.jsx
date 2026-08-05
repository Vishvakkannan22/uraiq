import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/**
 * Gate for everything behind sign-in.
 *
 * With no API configured `isAuthed()` returns true, so local development never
 * bounces to /login. Once VITE_API_URL is set this enforces a real session and
 * remembers where you were headed so the redirect after login lands correctly.
 */
export default function RequireAuth({ children }) {
  const { authed } = useAuth()
  const location = useLocation()

  if (!authed) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
