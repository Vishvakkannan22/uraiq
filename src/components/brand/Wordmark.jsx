import { wordmarkSrc } from './assets'

/**
 * The UraiQ lockup: gradient on the outer U and Q, brand ink on "rai".
 * Uses the real artwork when present (see src/assets/brand/README.md);
 * otherwise type-sets the same structure in Fredoka, whose rounded
 * geometric forms match the drawn mark closely.
 */
export default function Wordmark({ size = 34 }) {
  if (wordmarkSrc) {
    return (
      <img
        src={wordmarkSrc}
        alt="UraiQ"
        style={{ height: size * 1.15, width: 'auto', display: 'block', margin: '0 auto' }}
      />
    )
  }

  return (
    <div
      className="brand-text"
      style={{ fontSize: size, lineHeight: 1.05, letterSpacing: '-0.03em', textAlign: 'center' }}
    >
      <span className="mark-text">U</span>
      <span style={{ color: 'var(--text)' }}>rai</span>
      <span className="mark-text">Q</span>
    </div>
  )
}
