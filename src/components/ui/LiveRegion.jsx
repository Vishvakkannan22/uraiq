/**
 * A polite ARIA live region.
 *
 * Everything this app communicates through motion and colour — a message
 * arriving, the socket dropping — is invisible to a screen reader, which
 * reads the DOM once and is never told it changed. A live region is the only
 * mechanism that reports those changes, so anything the user could not
 * otherwise perceive belongs here.
 *
 * `polite` rather than `assertive` throughout: assertive interrupts whatever
 * is being read mid-sentence, which is right for an alert and wrong for an
 * incoming chat message. `aria-atomic` makes the region re-read in full each
 * time rather than only the words that changed, so a partially-updated
 * sentence never gets announced on its own.
 */
export default function LiveRegion({ message }) {
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  )
}
