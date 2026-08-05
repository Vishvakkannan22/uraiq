import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { spring } from '../../lib/motion'

/**
 * Full-screen media viewer that morphs out of the card it was opened from.
 *
 * The `layoutId` is the whole trick: the card's media and this frame share one,
 * so Framer interpolates position, size and radius between them instead of
 * cross-fading two separate elements. Drag it in either direction to dismiss.
 */
export default function Lightbox({ media, layoutId, onClose }) {
  return (
    <AnimatePresence>
      {media && (
        <motion.div
          className="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            layoutId={layoutId}
            className="lightbox__frame"
            style={{ background: media.gradient, aspectRatio: media.ratio }}
            transition={spring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.45}
            onClick={(e) => e.stopPropagation()}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.y) > 110 || Math.abs(info.velocity.y) > 520) onClose()
            }}
          >
            {media.kind === 'article' && (
              <div className="post__overlay">
                <h3 className="post__headline">{media.headline}</h3>
                <span className="post__source">{media.source}</span>
              </div>
            )}
          </motion.div>

          <motion.button
            className="lightbox__close iconbtn iconbtn--onDark"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.12 }}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
