import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, Check, ChevronLeft, ChevronRight, FileText, Ghost, HardDrive, Loader2,
  Lock, LogOut, Palette, QrCode, ScanEye, ShieldCheck, ShieldOff, Timer,
  Trash2, UserPen,
} from 'lucide-react'
import Sheet from '../../components/ui/Sheet'
import Avatar from '../../components/ui/Avatar'
import Segmented from '../../components/ui/Segmented'
import Toggle from '../../components/ui/Toggle'
import { ease, springPop } from '../../lib/motion'
import { STANDARDS, standing } from '../../lib/moderation'
import { auth } from '../../lib/api'
import { useTheme } from '../../lib/theme'
import { blockedUsers, notificationPrefs, storageBreakdown } from '../../data/mockData'

const APPEARANCES = [
  { id: 'default', label: 'Default', blurb: 'The standard UraiQ look — flat surfaces, layered shadow.' },
  { id: 'neumorphism', label: 'Neumorphism', blurb: 'Soft, extruded surfaces that look pressed from the same material.' },
]

const FILTER_LEVELS = [
  { id: 'standard', label: 'Standard', blurb: 'Blocks clear breaches, warns on borderline wording' },
  { id: 'strict', label: 'Strict', blurb: 'Also holds anything borderline until you confirm it' },
]

const AVATAR_SWATCHES = [
  'linear-gradient(135deg, #F0ABFC, #A855F7)',
  'linear-gradient(135deg, #A5B4FC, #4F46E5)',
  'linear-gradient(135deg, #C4B5FD, #6D28D9)',
  'linear-gradient(135deg, #FDA4AF, #E11D48)',
  'linear-gradient(135deg, #FDE68A, #F59E0B)',
  'linear-gradient(135deg, #D9F99D, #65A30D)',
]

const BURN_OPTIONS = ['Off', '10s', '30s', '1m', '1h']

/** The three fields this panel can change, seeded from the real signed-in user. */
function toDraft(user) {
  return {
    displayName: user?.displayName ?? '',
    bio: user?.bio ?? '',
    avatarGradient: user?.avatarGradient ?? AVATAR_SWATCHES[0],
  }
}

function Row({ icon: Icon, title, body, onClick, value, tint }) {
  return (
    <button className="set-row" onClick={onClick}>
      <span className="set-row__icon" style={tint ? { background: tint } : undefined}>
        <Icon size={17} />
      </span>
      <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
        <span className="set-row__title">{title}</span>
        {body && <span className="set-row__body">{body}</span>}
      </span>
      {value && <span className="set-row__value truncate">{value}</span>}
      <ChevronRight size={16} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
    </button>
  )
}

function Panel({ title, onBack, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ duration: 0.22, ease }}
    >
      <div className="row" style={{ gap: 'var(--s2)', marginBottom: 'var(--s4)' }}>
        <button className="iconbtn iconbtn--sm" onClick={onBack} aria-label="Back" style={{ marginLeft: -6 }}>
          <ChevronLeft size={18} />
        </button>
        <h3 style={{ fontSize: 'var(--fs-17)' }}>{title}</h3>
      </div>
      {children}
    </motion.div>
  )
}

/* A deterministic pattern derived from the handle. Decorative — it encodes
   nothing and no scanner will read it. Kept because the identity-code
   surface is the point; swap in a real encoder when there's a key to encode. */
function ProfileCode({ seed }) {
  const cells = []
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  for (let i = 0; i < 49; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    cells.push((h >>> 16) % 3 !== 0)
  }
  return (
    <div className="profile-code">
      {cells.map((on, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.006, ...springPop }}
          className={on ? 'profile-code__cell profile-code__cell--on' : 'profile-code__cell'}
        />
      ))}
    </div>
  )
}

export default function SettingsSheet({ open, onClose, desktop, user, onSaveProfile, initialPanel = 'root' }) {
  const navigate = useNavigate()
  const [panel, setPanel] = useState(initialPanel)
  const [filterLevel, setFilterLevel] = useState('standard')
  const [appearance, setAppearance] = useTheme()

  /* A local draft, separate from the committed `user` — typing updates this on
     every keystroke, but nothing reaches the server (or the shared session
     cache everyone else's view reads from) until Save. Reset whenever the
     sheet opens or the underlying user changes, so a previous edit never
     leaks into a fresh open. */
  const [draft, setDraft] = useState(() => toDraft(user))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (open) {
      setDraft(toDraft(user))
      setSaveError(null)
    }
  }, [open, user])

  async function saveProfile() {
    setSaving(true)
    setSaveError(null)
    try {
      await onSaveProfile({
        displayName: draft.displayName.trim(),
        bio: draft.bio,
        avatarGradient: draft.avatarGradient,
      })
      back()
    } catch (err) {
      /* Left open on failure — the server's message (e.g. "Name must be at
         least 2 characters") names exactly what to fix, and closing would
         throw the edit away along with it. */
      setSaveError(err.message || 'Could not save your profile')
    } finally {
      setSaving(false)
    }
  }
  const [standards, setStandards] = useState(() =>
    Object.fromEntries(STANDARDS.map((x) => [x.id, true]))
  )

  const [privacy, setPrivacy] = useState({ ghost: true, screenshot: false })
  const [burn, setBurn] = useState('30s')
  const [ghostFrom, setGhostFrom] = useState('22:00')
  const [ghostTo, setGhostTo] = useState('07:00')
  const [notifs, setNotifs] = useState({ messages: true, mentions: true, reactions: false, stories: true, events: true, security: true })
  const [blocked, setBlocked] = useState(blockedUsers)
  const [cleared, setCleared] = useState([])

  const back = () => setPanel('root')
  const totalMb = storageBreakdown
    .filter((s) => !cleared.includes(s.id))
    .reduce((a, s) => a + s.mb, 0)

  function close() {
    onClose()
    /* Reset after the exit animation so the panel doesn't visibly snap back. */
    setTimeout(() => setPanel(initialPanel), 260)
  }

  return (
    <Sheet open={open} onClose={close} desktop={desktop}>
      <AnimatePresence mode="wait" initial={false}>
        {panel === 'root' && (
          <motion.div key="root" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2, ease }}>
            <h3 style={{ fontSize: 'var(--fs-17)', marginBottom: 'var(--s4)' }}>Settings</h3>
            <div className="col" style={{ gap: 2 }}>
              <Row icon={UserPen} title="Edit profile" body="Name, handle, bio and avatar" onClick={() => setPanel('edit')} />
              <Row
                icon={Palette}
                title="Appearance"
                body="Switch the app's visual style"
                value={APPEARANCES.find((a) => a.id === appearance)?.label}
                onClick={() => setPanel('appearance')}
              />
              <Row icon={ShieldCheck} title="Safety & moderation" body="How conversations are kept respectful" value={standing.label} onClick={() => setPanel('safety')} />
              <Row icon={Bell} title="Notifications" body="What reaches you, and when" onClick={() => setPanel('notifications')} />
              <Row icon={Lock} title="Privacy & security" body="Encryption, ghost mode, burn timer" onClick={() => setPanel('privacy')} />
              <Row icon={ShieldOff} title="Blocked" body="People who can't reach you" value={String(blocked.length)} onClick={() => setPanel('blocked')} />
              <Row icon={HardDrive} title="Storage" body="What this app keeps on your device" value={`${totalMb.toFixed(0)} MB`} onClick={() => setPanel('storage')} />
              <Row icon={QrCode} title="Profile code" body="Share your handle in person" onClick={() => setPanel('code')} />
              <Row icon={FileText} title="Community standards" body="What is and isn't allowed here" onClick={() => setPanel('standards')} />
            </div>

            <button className="btn btn--danger btn--block btn--sm" style={{ marginTop: 'var(--s5)', gap: 8 }} onClick={async () => { await auth.logout(); navigate('/login') }}>
              <LogOut size={16} /> Sign out
            </button>
          </motion.div>
        )}

        {panel === 'edit' && (
          <Panel key="edit" title="Edit profile" onBack={back}>
            <div className="col" style={{ alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
              <Avatar gradient={draft.avatarGradient} size={78} ring="unseen" />
              <div className="row" style={{ gap: 7 }}>
                {AVATAR_SWATCHES.map((s) => (
                  <motion.button
                    key={s}
                    whileTap={{ scale: 0.9 }}
                    className={`swatch ${draft.avatarGradient === s ? 'swatch--on' : ''}`}
                    style={{ background: s }}
                    onClick={() => setDraft((d) => ({ ...d, avatarGradient: s }))}
                    aria-label="Pick avatar colour"
                    aria-pressed={draft.avatarGradient === s}
                  />
                ))}
              </div>
            </div>

            <div className="col" style={{ gap: 'var(--s4)' }}>
              <div className="field">
                <label className="field__label" htmlFor="p-name">Display name</label>
                <input
                  id="p-name"
                  className="field__input"
                  value={draft.displayName}
                  onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                  maxLength={60}
                />
              </div>
              {/* Handle is not editable here: it's how people find you in
                  search, and it's tied to the account id, not the display
                  name. Shown for reference only. */}
              <div className="field">
                <span className="field__label">Handle</span>
                <div
                  className="field__input"
                  style={{ display: 'flex', alignItems: 'center', color: 'var(--text-4)' }}
                >
                  @{user.handle}
                </div>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="p-bio">Bio</label>
                <textarea
                  id="p-bio"
                  className="field__input"
                  style={{ height: 84, padding: 'var(--s3) var(--s4)', resize: 'none', lineHeight: 1.5 }}
                  value={draft.bio}
                  onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                  maxLength={280}
                />
              </div>
            </div>

            {saveError && (
              <div className="notice notice--error" role="alert" style={{ marginTop: 'var(--s4)' }}>
                {saveError}
              </div>
            )}

            <button
              className="btn btn--primary btn--block"
              style={{ marginTop: 'var(--s5)' }}
              onClick={saveProfile}
              disabled={saving || !draft.displayName.trim()}
            >
              {saving ? <Loader2 size={16} className="spin" /> : 'Save'}
            </button>
          </Panel>
        )}

        {panel === 'appearance' && (
          <Panel key="appearance" title="Appearance" onBack={back}>
            <p style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)', marginBottom: 'var(--s4)', lineHeight: 1.5 }}>
              Applies instantly, on this device only.
            </p>
            <div className="col" style={{ gap: 'var(--s1)' }}>
              {APPEARANCES.map((a) => (
                <button
                  key={a.id}
                  className={`choice ${appearance === a.id ? 'choice--on' : ''}`}
                  onClick={() => setAppearance(a.id)}
                  aria-pressed={appearance === a.id}
                >
                  <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                    <span className="choice__title">{a.label}</span>
                    <span className="choice__body">{a.blurb}</span>
                  </span>
                  {appearance === a.id && (
                    <span className="choice__check"><Check size={13} strokeWidth={3.2} /></span>
                  )}
                </button>
              ))}
            </div>
          </Panel>
        )}

        {panel === 'safety' && (
          <Panel key="safety" title="Safety & moderation" onBack={back}>
            <div className="standing">
              <span className="standing__badge"><ShieldCheck size={20} /></span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="standing__title">{standing.label}</div>
                <div className="standing__detail">{standing.detail}</div>
              </div>
            </div>

            <div className="row" style={{ gap: 'var(--s2)', marginTop: 'var(--s3)' }}>
              {[
                ['Reviewed', standing.reviewed.toLocaleString()],
                ['Flagged', standing.flagged],
                ['Upheld', standing.upheld],
              ].map(([label, value]) => (
                <div key={label} className="stat-tile grow">
                  <span className="stat-tile__value tnum">{value}</span>
                  <span className="stat-tile__label">{label}</span>
                </div>
              ))}
            </div>

            <div className="set-label" style={{ marginTop: 'var(--s6)' }}>Filter level</div>
            <div className="col" style={{ gap: 'var(--s1)' }}>
              {FILTER_LEVELS.map((f) => (
                <button
                  key={f.id}
                  className={`choice ${filterLevel === f.id ? 'choice--on' : ''}`}
                  onClick={() => setFilterLevel(f.id)}
                  aria-pressed={filterLevel === f.id}
                >
                  <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                    <span className="choice__title">{f.label}</span>
                    <span className="choice__body">{f.blurb}</span>
                  </span>
                  {filterLevel === f.id && (
                    <span className="choice__check"><ShieldCheck size={13} /></span>
                  )}
                </button>
              ))}
            </div>

            <div className="set-label" style={{ marginTop: 'var(--s6)' }}>What's checked</div>
            <div className="col" style={{ gap: 'var(--s1)' }}>
              {STANDARDS.map((x) => (
                <div key={x.id} className="row" style={{ gap: 'var(--s3)', padding: 'var(--s2) 0' }}>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--fs-14)', fontWeight: 620, color: 'var(--text)' }}>{x.label}</div>
                    <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>{x.blurb}</div>
                  </div>
                  {x.id === 'threats' || x.id === 'selfharm' || x.id === 'slurs' ? (
                    <span className="pill pill--success">Always on</span>
                  ) : (
                    <Toggle
                      checked={standards[x.id]}
                      onChange={(v) => setStandards((st) => ({ ...st, [x.id]: v }))}
                      label={x.label}
                    />
                  )}
                </div>
              ))}
            </div>

            <p style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)', marginTop: 'var(--s4)' }}>
              Checks run before a message is delivered. Threats, self-harm and targeted
              slurs can't be switched off — the first protects other people, the second
              routes to support, the third keeps this space free of caste, body and
              sexual insults.
            </p>
          </Panel>
        )}

        {panel === 'standards' && (
          <Panel key="standards" title="Community standards" onBack={back}>
            <p style={{ fontSize: 'var(--fs-14)', color: 'var(--text-3)', lineHeight: 1.55, marginBottom: 'var(--s5)' }}>
              These apply everywhere on the platform — messages, groups, posts and comments.
              Enforcement is on content, not on people: a message can breach a standard, and
              you'll always be told which one and what to change.
            </p>
            <div className="col" style={{ gap: 'var(--s3)' }}>
              {STANDARDS.map((x) => (
                <div key={x.id} className="standard-card">
                  <div className="standard-card__title">{x.label}</div>
                  <div className="standard-card__body">{x.blurb}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {panel === 'notifications' && (
          <Panel key="notifications" title="Notifications" onBack={back}>
            <div className="col" style={{ gap: 'var(--s1)' }}>
              {notificationPrefs.map((n) => (
                <div key={n.key} className="row" style={{ gap: 'var(--s3)', padding: 'var(--s3) 0' }}>
                  <span className="set-row__icon"><Bell size={16} /></span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--fs-14)', fontWeight: 620, color: 'var(--text)' }}>{n.title}</div>
                    <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>{n.body}</div>
                  </div>
                  {n.locked ? (
                    <span className="pill pill--success">Always on</span>
                  ) : (
                    <Toggle checked={notifs[n.key]} onChange={(v) => setNotifs((s) => ({ ...s, [n.key]: v }))} label={n.title} />
                  )}
                </div>
              ))}
            </div>
          </Panel>
        )}

        {panel === 'privacy' && (
          <Panel key="privacy" title="Privacy & security" onBack={back}>
            <div className="row" style={{ gap: 'var(--s3)', padding: 'var(--s3) 0' }}>
              <span className="set-row__icon"><Lock size={17} /></span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-14)', fontWeight: 620, color: 'var(--text)' }}>End-to-end encryption</div>
                <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>Messages are encrypted on this device before sending</div>
              </div>
              <span className="pill pill--success">Always on</span>
            </div>

            <div className="row" style={{ gap: 'var(--s3)', padding: 'var(--s3) 0' }}>
              <span className="set-row__icon"><Ghost size={17} /></span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-14)', fontWeight: 620, color: 'var(--text)' }}>Ghost Mode</div>
                <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>Hide online status, typing and read receipts</div>
              </div>
              <Toggle checked={privacy.ghost} onChange={(v) => setPrivacy((s) => ({ ...s, ghost: v }))} label="Ghost Mode" />
            </div>

            <AnimatePresence>
              {privacy.ghost && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="set-inset">
                    <div style={{ fontSize: 'var(--fs-12)', fontWeight: 640, color: 'var(--text-3)', marginBottom: 'var(--s2)' }}>
                      Schedule
                    </div>
                    <div className="row" style={{ gap: 'var(--s2)' }}>
                      <input type="time" className="field__input grow" value={ghostFrom} onChange={(e) => setGhostFrom(e.target.value)} aria-label="Ghost mode from" />
                      <span style={{ color: 'var(--text-4)', fontSize: 'var(--fs-13)' }}>to</span>
                      <input type="time" className="field__input grow" value={ghostTo} onChange={(e) => setGhostTo(e.target.value)} aria-label="Ghost mode until" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="row" style={{ gap: 'var(--s3)', padding: 'var(--s3) 0' }}>
              <span className="set-row__icon"><ScanEye size={17} /></span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-14)', fontWeight: 620, color: 'var(--text)' }}>Screenshot alerts</div>
                <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>Get notified when a screenshot is detected</div>
              </div>
              <Toggle checked={privacy.screenshot} onChange={(v) => setPrivacy((s) => ({ ...s, screenshot: v }))} label="Screenshot alerts" />
            </div>

            <div className="set-label" style={{ marginTop: 'var(--s4)' }}>Default burn timer</div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {BURN_OPTIONS.map((o) => (
                <button key={o} className={`chip ${burn === o ? 'chip--ai' : ''}`} onClick={() => setBurn(o)} aria-pressed={burn === o}>
                  <Timer size={13} /> {o}
                </button>
              ))}
            </div>
          </Panel>
        )}

        {panel === 'blocked' && (
          <Panel key="blocked" title="Blocked" onBack={back}>
            {blocked.length === 0 ? (
              <p style={{ fontSize: 'var(--fs-14)', color: 'var(--text-4)', padding: 'var(--s6) 0', textAlign: 'center' }}>
                Nobody is blocked.
              </p>
            ) : (
              <div className="col" style={{ gap: 'var(--s1)' }}>
                {blocked.map((b) => (
                  <div key={b.id} className="row" style={{ gap: 'var(--s3)', padding: 'var(--s2) 0' }}>
                    <Avatar initials={b.initials} gradient={b.gradient} size={40} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="truncate" style={{ fontSize: 'var(--fs-14)', fontWeight: 620, color: 'var(--text)' }}>{b.name}</div>
                      <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>{b.since}</div>
                    </div>
                    <button className="btn btn--secondary btn--sm" onClick={() => setBlocked((l) => l.filter((x) => x.id !== b.id))}>
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {panel === 'storage' && (
          <Panel key="storage" title="Storage" onBack={back}>
            <div className="storage-total">
              <span className="tnum storage-total__value">{totalMb.toFixed(1)} MB</span>
              <span className="storage-total__label">on this device</span>
            </div>

            <div className="storage-bar" aria-hidden>
              {storageBreakdown.filter((s) => !cleared.includes(s.id)).map((s) => (
                <motion.span
                  key={s.id}
                  layout
                  style={{ background: s.tint, flexGrow: s.mb }}
                  transition={{ duration: 0.3, ease }}
                />
              ))}
            </div>

            <div className="col" style={{ gap: 'var(--s1)', marginTop: 'var(--s4)' }}>
              {storageBreakdown.map((s) => {
                const gone = cleared.includes(s.id)
                return (
                  <div key={s.id} className="row" style={{ gap: 'var(--s3)', padding: 'var(--s2) 0' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: s.tint, flexShrink: 0 }} />
                    <span className="grow" style={{ fontSize: 'var(--fs-14)', color: 'var(--text-2)' }}>{s.label}</span>
                    <span className="tnum" style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)' }}>
                      {gone ? '0 MB' : `${s.mb < 1 ? (s.mb * 1000).toFixed(0) + ' KB' : s.mb.toFixed(1) + ' MB'}`}
                    </span>
                    {s.clearable && !gone ? (
                      <button className="iconbtn iconbtn--sm" onClick={() => setCleared((c) => [...c, s.id])} aria-label={`Clear ${s.label}`}>
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <span style={{ width: 32, flexShrink: 0 }} />
                    )}
                  </div>
                )
              })}
            </div>

            <p style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)', marginTop: 'var(--s4)' }}>
              Messages and keys can't be cleared here — removing them would lock you out of your own history.
            </p>
          </Panel>
        )}

        {panel === 'code' && (
          <Panel key="code" title="Profile code" onBack={back}>
            <div className="col" style={{ alignItems: 'center', gap: 'var(--s4)' }}>
              <div className="code-card">
                <ProfileCode seed={user.handle} />
                <Avatar gradient={user.avatarGradient} size={44} style={{ marginTop: 'var(--s3)' }} />
                <div style={{ fontSize: 'var(--fs-15)', fontWeight: 680, color: 'var(--text)', marginTop: 'var(--s2)' }}>{user.displayName}</div>
                <div style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)' }}>{user.handle}</div>
              </div>
              <p style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)', textAlign: 'center', maxWidth: 260 }}>
                Decorative in this build — the pattern is derived from your handle but encodes nothing scannable yet.
              </p>
            </div>
          </Panel>
        )}
      </AnimatePresence>
    </Sheet>
  )
}
