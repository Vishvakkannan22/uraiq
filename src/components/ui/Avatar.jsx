export default function Avatar({
  initials,
  gradient = 'var(--grad)',
  size = 44,
  status,
  ring,
  className = '',
  style,
}) {
  const dot = Math.max(9, Math.round(size * 0.26))

  const node = (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, background: gradient, fontSize: size * 0.36, ...style }}
    >
      {initials}
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
