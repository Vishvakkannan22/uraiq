import { User } from 'lucide-react'

/**
 * A person's avatar.
 *
 * Renders a generic silhouette rather than initials. Initials-as-avatar reads
 * fine in a design mock, but on a two-letter pair like "NB" it looks exactly
 * like unfinished placeholder content — which is what it was, before every
 * account had a real name behind it. The per-user gradient stays: it is still
 * useful for telling rows apart at a glance in a list, it just no longer has
 * letters stamped on top of it.
 *
 * `initials` is still accepted so callers don't need updating, but it is not
 * rendered — nothing currently uses it for anything else.
 */
export default function Avatar({
  gradient = 'var(--grad)',
  size = 44,
  status,
  ring,
  className = '',
  style,
}) {
  const dot = Math.max(9, Math.round(size * 0.26))
  const iconSize = Math.round(size * 0.54)

  const node = (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, background: gradient, ...style }}
    >
      <User size={iconSize} strokeWidth={2} color="rgba(255,255,255,0.94)" fill="none" />
      {status && (
        <span
          className={`avatar__status ${status !== 'online' ? `avatar__status--${status}` : ''}`}
          style={{ width: dot, height: dot }}
        />
      )}
    </span>
  )

  if (!ring) return node

  return <span className={`avatar-ring ${ring === 'seen' ? 'avatar-ring--seen' : ''}`}>{node}</span>
}
