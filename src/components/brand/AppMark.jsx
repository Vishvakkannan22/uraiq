import { iconSrc } from './assets'

/**
 * Square app mark. Uses the real icon artwork when present, otherwise draws a
 * simplified vector of the logo's motif — the rounded U on the brand gradient.
 * Deliberately simple: the neon render's fine highlights turn to mush below
 * ~32px, where this still reads cleanly.
 */
export default function AppMark({ size = 34, radius }) {
  const r = radius ?? Math.round(size * 0.3)

  if (iconSrc) {
    return (
      <img src={iconSrc} alt="" width={size} height={size} style={{ borderRadius: r, display: 'block' }} />
    )
  }

  const gid = `uraiq-mark-${size}`

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="UraiQ">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9B6FF" />
          <stop offset="0.52" stopColor="#A855F7" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
      <path
        d="M10.5 8.5 V15 C10.5 20 21.5 20 21.5 15 V8.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3.3"
        strokeLinecap="round"
      />
    </svg>
  )
}
