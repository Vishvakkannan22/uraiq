import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useMatch } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import TabBar from './TabBar'
import AppBackdrop from '../components/AppBackdrop'
import CommandPalette from '../components/ui/CommandPalette'
import { navItems } from './navItems'
import { sectionSwipe } from '../lib/motion'
import { useInbox } from '../lib/realtime/inbox'

/** Tab-bar order, which is also the left-to-right axis screens travel along. */
const ORDER = navItems.map((n) => n.to)

export default function AppShell() {
  /* Session-wide delivery channel — see lib/realtime/inbox.js for why this
     has to live above any single thread. */
  useInbox()

  const location = useLocation()
  const inThread = useMatch('/chats/:chatId')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const reduced = useReducedMotion()

  /* Cmd/Ctrl+K from anywhere. Bound on the shell rather than per-screen so it
     survives navigation, and toggles so the same chord closes it. */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Threads take over the phone frame, so the dock steps aside for the composer.
  const showTabBar = !inThread

  // Animate between top-level sections only — not between chats in the same list,
  // which would re-run the transition on every row tap.
  const sectionKey = '/' + (location.pathname.split('/')[1] || '')

  /* Which way the next screen should travel. Routes that aren't tabs
     (Groups, Activity) hold the last index so they don't fling sideways
     from an arbitrary position. */
  const prevIndex = useRef(0)
  const found = ORDER.indexOf(sectionKey)
  const index = found === -1 ? prevIndex.current : found
  const dir = index >= prevIndex.current ? 1 : -1
  useEffect(() => { prevIndex.current = index }, [index])

  return (
    <div className="app-shell">
      <AppBackdrop />

      {/* The rail is a flex sibling again, so this column simply takes the
          remaining width — no reserved padding, and no gutter between the
          rail and the chat list. */}
      <div className="app-shell__phone">
        <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={sectionKey}
              {...sectionSwipe(dir, reduced)}
              style={{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>

        {showTabBar && <TabBar />}
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
