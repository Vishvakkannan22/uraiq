import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, Bookmark, QrCode, Settings, Share2 } from 'lucide-react'
import Header from '../../layout/Header'
import Avatar from '../../components/ui/Avatar'
import Segmented from '../../components/ui/Segmented'
import SettingsSheet from './SettingsSheet'
import { bentoItem, bentoStagger, listItem, listStagger } from '../../lib/motion'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { useScrolled } from '../../lib/useScrolled'
import { collections, currentUser, profilePosts } from '../../data/mockData'

export default function ProfilePage() {
  const isDesktop = useIsDesktop()
  const [tab, setTab] = useState('posts')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsPanel, setSettingsPanel] = useState('root')
  const [user, setUser] = useState(currentUser)
  const scrollRef = useRef(null)
  const scrolled = useScrolled(scrollRef)

  const patchUser = (patch) => setUser((u) => ({ ...u, ...patch }))

  function openSettings(panel) {
    setSettingsPanel(panel)
    setSettingsOpen(true)
  }

  return (
    <div className="col grow" style={{ minWidth: 0, minHeight: 0 }}>
      <Header
        title={user.handle}
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
          {/* Identity and metrics separated: the name/bio is one block, the
              numbers are their own boxes, so neither competes for the same row. */}
          <div className="row" style={{ gap: 'var(--s4)', padding: 'var(--s5) 0' }}>
            <Avatar initials={user.initials} gradient={user.gradient} size={72} ring="unseen" />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="truncate" style={{ fontWeight: 680, fontSize: 'var(--fs-20)', color: 'var(--text)', letterSpacing: '-0.022em' }}>
                {user.name}
              </div>
              <p style={{ fontSize: 'var(--fs-14)', color: 'var(--text-3)', marginTop: 4 }}>{user.bio}</p>
            </div>
          </div>

          <motion.div
            variants={bentoStagger}
            initial="hidden"
            animate="show"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--s2)' }}
          >
            {[
              ['Posts', user.stats.posts],
              ['Followers', user.stats.followers.toLocaleString()],
              ['Following', user.stats.following],
            ].map(([label, value]) => (
              <motion.div key={label} variants={bentoItem} className="stat-tile">
                <span className="stat-tile__value tnum">{value}</span>
                <span className="stat-tile__label">{label}</span>
              </motion.div>
            ))}
          </motion.div>

          <div className="row" style={{ gap: 'var(--s2)', margin: 'var(--s5) 0' }}>
            <button className="btn btn--secondary btn--sm grow" onClick={() => openSettings('edit')}>Edit profile</button>
            <button className="btn btn--secondary btn--sm grow" onClick={() => openSettings('code')}>
              <Share2 size={15} /> Share profile
            </button>
          </div>

          <div className="row" style={{ justifyContent: 'center', paddingBottom: 'var(--s4)' }}>
            <Segmented
              id="profile"
              value={tab}
              onChange={setTab}
              items={[{ value: 'posts', label: 'Posts' }, { value: 'saved', label: 'Saved' }]}
            />
          </div>

          {tab === 'posts' ? (
            <motion.div
              key="posts"
              variants={listStagger}
              initial="hidden"
              animate="show"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--s1)' }}
            >
              {profilePosts.map((g, i) => (
                <motion.div
                  key={i}
                  variants={listItem}
                  whileHover={{ scale: 0.985 }}
                  style={{ aspectRatio: '1 / 1', background: g, borderRadius: 'var(--r-sm)', cursor: 'pointer' }}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="saved"
              variants={bentoStagger}
              initial="hidden"
              animate="show"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--s3)' }}
            >
              {collections.map((c) => (
                <motion.button key={c.id} variants={bentoItem} whileHover={{ y: -3 }} className="collection-card">
                  <span className="collection-card__cover" style={{ background: c.gradient }}>
                    <Bookmark size={18} />
                  </span>
                  <span className="collection-card__name truncate">{c.name}</span>
                  <span className="collection-card__count tnum">{c.count} saved</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      <SettingsSheet
        key={settingsPanel}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        desktop={isDesktop}
        user={user}
        onUser={patchUser}
        initialPanel={settingsPanel}
      />
    </div>
  )
}
