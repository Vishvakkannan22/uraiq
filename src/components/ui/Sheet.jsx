import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { X } from 'lucide-react'
import { spring } from '../../lib/motion'

/** Bottom sheet on phones, centred dialog on desktop. */
export default function Sheet({ open, onClose, children, desktop }) {
  const dragControls = useDragControls()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="sheet"
            initial={desktop ? { opacity: 0, scale: 0.94, y: 12 } : { y: '100%' }}
            animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
            transition={spring}
            /* Drag starts from the grabber only, so the body can scroll freely. */
            drag={desktop ? false : 'y'}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 520) onClose()
            }}
            style={
              desktop
                ? {
                    position: 'fixed',
                    zIndex: 'var(--z-sheet)',
                    top: '50%',
                    left: '50%',
                    translate: '-50% -50%',
                    width: 'min(440px, 92vw)',
                    maxHeight: '86dvh',
                    borderRadius: 'var(--r-xl)',
                    padding: 'var(--s5)',
                    display: 'flex',
                    flexDirection: 'column',
                  }
                : {
                    position: 'fixed',
                    zIndex: 'var(--z-sheet)',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    maxHeight: '88dvh',
                    display: 'flex',
                    flexDirection: 'column',
                  }
            }
          >
            {!desktop && (
              <div
                onPointerDown={(e) => dragControls.start(e)}
                style={{ padding: '2px 0 var(--s3)', cursor: 'grab', touchAction: 'none', flexShrink: 0 }}
              >
                <div className="sheet__grabber" style={{ margin: '0 auto' }} />
              </div>
            )}
            <button className="iconbtn iconbtn--sm sheet__close" onClick={onClose} aria-label="Close">
              <X size={17} />
            </button>
            <div className="scroll" style={{ overflowY: 'auto', minHeight: 0 }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
