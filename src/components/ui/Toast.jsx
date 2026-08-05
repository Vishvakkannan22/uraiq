import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { spring } from '../../lib/motion'

/**
 * Snackbar with an optional undo. Destructive-feeling actions in the feed
 * (hiding a post, muting an author) are reversible from here rather than
 * behind a confirm dialog — cheaper to dismiss, and cheaper to take back.
 */
export default function Toast({ toast, onClose, duration = 4200 }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [toast, onClose, duration])

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className="toast"
          role="status"
          initial={{ opacity: 0, y: 22, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.97 }}
          transition={spring}
        >
          <span className="grow truncate">{toast.message}</span>
          {toast.actionLabel && (
            <button
              className="toast__action"
              onClick={() => {
                toast.onAction?.()
                onClose()
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          <button className="toast__close" onClick={onClose} aria-label="Dismiss">
            <X size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
