/**
 * The AI mark — the voice half of the UraiQ logo: a speech bubble carrying a
 * waveform, with sound radiating from it. Drawn rather than imported so it
 * inherits currentColor and stays crisp at the 18-22px it's used at.
 *
 * Pass `gradient` where it's the hero (the Home top bar); leave it off and it
 * paints in currentColor, which is what icon buttons want.
 */
export default function AiMark({ size = 20, gradient = false, strokeWidth = 1.9 }) {
  const gid = `ai-mark-${size}`
  const stroke = gradient ? `url(#${gid})` : 'currentColor'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="UraiQ assistant"
    >
      {gradient && (
        <defs>
          <linearGradient id={gid} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#E879F9" />
            <stop offset="0.45" stopColor="#A855F7" />
            <stop offset="1" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
      )}

      {/* Bubble, tail dropping to the lower left. */}
      <path
        d="M13.4 3.2a8.3 8.3 0 0 1 0 16.6h-4.1L4.9 23l1.4-4.1a8.3 8.3 0 0 1 7.1-15.7Z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Waveform. */}
      <path d="M10.4 9.4v5.2" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M13.6 7.6v8.8" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M16.8 9.9v4.2" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}
