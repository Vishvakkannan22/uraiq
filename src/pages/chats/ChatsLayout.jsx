import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ChatListPane from './ChatListPane'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { ease } from '../../lib/motion'

const KEY = 'uraiq.listWidth'
const MIN = 280
const MAX = 520
const DEFAULT = 348
const STEP = 16

const clamp = (n) => Math.min(MAX, Math.max(MIN, Math.round(n)))

function readWidth() {
  try {
    const stored = Number(localStorage.getItem(KEY))
    return stored ? clamp(stored) : DEFAULT
  } catch {
    return DEFAULT
  }
}

export default function ChatsLayout() {
  const isDesktop = useIsDesktop()
  const inThread = useMatch('/chats/:chatId')
  const [width, setWidth] = useState(readWidth)
  const paneRef = useRef(null)
  const dragging = useRef(false)

  const persist = useCallback((w) => {
    try {
      localStorage.setItem(KEY, String(w))
    } catch {
      /* not persisting is survivable; the session keeps the width */
    }
  }, [])

  /* Pointer capture rather than window listeners: the handle keeps receiving
     moves even when the cursor outruns it, which is exactly what happens on a
     fast drag. */
  function onPointerDown(e) {
    e.preventDefault()
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function onPointerMove(e) {
    if (!dragging.current) return
    const left = paneRef.current?.getBoundingClientRect().left ?? 0
    setWidth(clamp(e.clientX - left))
  }

  function endDrag(e) {
    if (!dragging.current) return
    dragging.current = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    persist(width)
  }

  function onKeyDown(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const next = clamp(width + (e.key === 'ArrowRight' ? STEP : -STEP))
    setWidth(next)
    persist(next)
  }

  function reset() {
    setWidth(DEFAULT)
    persist(DEFAULT)
  }

  /* Never leave the cursor stuck as col-resize if this unmounts mid-drag. */
  useEffect(
    () => () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    },
    []
  )

  if (isDesktop) {
    return (
      <>
        <div
          ref={paneRef}
          style={{
            width,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            background: 'var(--pane)',
          }}
        >
          <ChatListPane onResetWidth={reset} canResetWidth={width !== DEFAULT} />
        </div>

        <div
          className="pane-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat list"
          aria-valuenow={width}
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={reset}
          onKeyDown={onKeyDown}
          title="Drag to resize · double-click to reset"
        >
          <span className="pane-resizer__grip" aria-hidden />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <Outlet />
        </div>
      </>
    )
  }

  // Phones: the thread pushes in over the list, the way a native stack does.
  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
      <AnimatePresence initial={false}>
        <motion.div
          key={inThread ? 'thread' : 'list'}
          initial={{ x: inThread ? '100%' : '-28%', opacity: inThread ? 1 : 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: inThread ? '-28%' : '100%', opacity: inThread ? 0.6 : 1 }}
          transition={{ duration: 0.3, ease }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {inThread ? <Outlet /> : <ChatListPane />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
