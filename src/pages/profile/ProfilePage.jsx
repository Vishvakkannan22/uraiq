import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, MessagesSquare, QrCode, Settings, Share2 } from 'lucide-react'
import Header from '../../layout/Header'
import Avatar from '../../components/ui/Avatar'
import SettingsSheet from './SettingsSheet'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { useScrolled } from '../../lib/useScrolled'
import { useMe } from '../../lib/useMe'
import { setUser } from '../../lib/auth'
import { usersApi } from '../../lib/api'
import { useChatList } from '../../lib/chat/useChatList'

export default function ProfilePage() {
  const isDesktop = useIsDesktop()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsPanel, setSettingsPanel] = useState('root')
  const scrollRef = useRef(null)
  const scrolled = useScrolled(scrollRef)

  const me = useMe()
  /* The only real, honest metric this milestone has about a person: how many
     conversations they're in. Posts/followers/following belonged to the
     feed prototype and had no backend behind them — showing invented numbers
     on a real signed-in profile is exactly the kind of thing this page used
     to do that made it read as a demo rather than a product. */
  const { chats } = useChatList()

  function openSettings(panel) {
    setSettingsPanel(panel)
    setSettingsOpen(true)
  }

  /**
   * Persists via PATCH /users/me, then writes the response into the shared
   * session cache. That one `setUser` call is what makes the new name and
   * avatar appear immediately in the tab bar, the nav rail and this page —
   * they all read from the same cache through `useMe()`/`useAuth()`.
   *
   * A conversation someone else has open with this account picks up the
   * change the next time they open or reload it — the peer's profile is read
   * fresh from the database on every such request, never cached past that.
   */
  async function handleSaveProfile(patch) {
    const { user: updated } = await usersApi.update(patch)
    setUser(updated)
  }

  if (!me) {
    return (
      <div className="col grow" style={{ minWidth: 0, minHeight: 0 }}>
        <Header title="Profile" scrolled={scrolled} />
        <div className="scroll grow" style={{ padding: '0 var(--gutter)' }} />
      </div>
    )
  }

  return (
    <div className="col grow" style={{ minWidth: 0, minHeight: 0 }}>
      <Header
        title={me.handle}
        scrolled={scrolled}
        actions={
          <>
            <Link to="/notifications" className="iconbtn" aria-label="Activity"><Bell size={19} /></Link>
            <button className="iconbtn" onClick={() => openSettings('code')} aria-label="Profile code"><QrCode size={19} /></button>
            <button className="iconbtn" onClick={() => openSettings('root')} aria-label="Settings"><Settings size={19} /></button>
          </>
        }
      />

      <div ref={scrollRef} className="scroll grow" style={{ padding: '0 var(--gutter) var(--s7)' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ maxWidth: 680 }}
        >
          <div className="row" style={{ gap: 'var(--s4)', padding: 'var(--s5) 0' }}>
            <Avatar gradient={me.avatarGradient} size={72} ring="unseen" />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="truncate" style={{ fontWeight: 680, fontSize: 'var(--fs-20)', color: 'var(--text)', letterSpacing: '-0.022em' }}>
                {me.displayName}
              </div>
              {me.bio && (
                <p style={{ fontSize: 'var(--fs-14)', color: 'var(--text-3)', marginTop: 4 }}>{me.bio}</p>
              )}
            </div>
          </div>

          <div className="stat-tile" style={{ maxWidth: 200 }}>
            <span className="stat-tile__value tnum">{chats.length}</span>
            <span className="stat-tile__label">Conversations</span>
          </div>

          <div className="row" style={{ gap: 'var(--s2)', margin: 'var(--s5) 0' }}>
            <button className="btn btn--secondary btn--sm grow" onClick={() => openSettings('edit')}>Edit profile</button>
            <button className="btn btn--secondary btn--sm grow" onClick={() => openSettings('code')}>
              <Share2 size={15} /> Share profile
            </button>
          </div>

          <div
            className="col"
            style={{
              alignItems: 'center', gap: 'var(--s2)', padding: 'var(--s8) var(--s5)',
              color: 'var(--text-4)', textAlign: 'center',
            }}
          >
            <MessagesSquare size={28} strokeWidth={1.6} />
            <p style={{ fontSize: 'var(--fs-13)', maxWidth: 260 }}>
              Your posts and saved items will show up here once that part of UraiQ is live.
            </p>
          </div>
        </motion.div>
      </div>

      <SettingsSheet
        key={settingsPanel}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        desktop={isDesktop}
        user={me}
        onSaveProfile={handleSaveProfile}
        initialPanel={settingsPanel}
      />
    </div>
  )
}
