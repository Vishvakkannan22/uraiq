import { useNavigate } from 'react-router-dom'

/* Split on hashtags and @mentions while keeping the delimiters, so the plain
   runs between them survive intact. Handles allow a dot (jordan.o). */
const TOKEN = /(#[\w-]+|@[\w.]+)/g

/**
 * Renders post and comment text with #hashtags and @mentions made tappable.
 * A tag seeds Search; a mention opens the profile. Everything else is passed
 * through untouched — no markdown, no HTML, nothing injected.
 */
export default function RichText({ text, className }) {
  const navigate = useNavigate()
  if (!text) return null

  return (
    <span className={className}>
      {text.split(TOKEN).map((part, i) => {
        if (part.startsWith('#')) {
          return (
            <button
              key={i}
              className="rich-tag"
              onClick={(e) => {
                e.stopPropagation()
                navigate('/search', { state: { q: part } })
              }}
            >
              {part}
            </button>
          )
        }
        if (part.startsWith('@')) {
          return (
            <button
              key={i}
              className="rich-tag rich-tag--mention"
              onClick={(e) => {
                e.stopPropagation()
                navigate('/profile')
              }}
            >
              {part}
            </button>
          )
        }
        return part
      })}
    </span>
  )
}
