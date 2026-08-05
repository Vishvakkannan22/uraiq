/**
 * Resolves the real brand artwork at build time.
 *
 * Drop a file into src/assets/brand/ named `wordmark.*` or `icon.*` (svg, png,
 * or webp) and it is picked up automatically — no code change, no runtime probe,
 * and no flash of a broken image while a missing file 404s.
 */
const wordmarkMatches = import.meta.glob('../../assets/brand/wordmark.{svg,png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const iconMatches = import.meta.glob('../../assets/brand/icon.{svg,png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const wordmarkSrc = Object.values(wordmarkMatches)[0] ?? null
export const iconSrc = Object.values(iconMatches)[0] ?? null
