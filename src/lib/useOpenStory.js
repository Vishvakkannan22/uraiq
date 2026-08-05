import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Opens the story viewer as an overlay on top of the current screen instead of
 * navigating away from it, so returning doesn't remount (and re-load) the
 * screen underneath.
 */
export function useOpenStory() {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(
    (storyId) => navigate(`/stories/${storyId}`, { state: { background: location } }),
    [navigate, location]
  )
}
