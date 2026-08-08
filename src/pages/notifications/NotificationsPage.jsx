import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AtSign, Bell, CalendarClock, CheckCheck, Heart, ShieldAlert, Sparkles, UserPlus,
} from 'lucide-react'
import Header from '../../layout/Header'
import Avatar from '../../components/ui/Avatar'
import StatePanel from '../../components/ui/StatePanel'
import Segmented from '../../components/ui/Segmented'
import { listItem, listStagger } from '../../lib/motion'
import { useScrolled } from '../../lib/useScrolled'
import { notifications as seed } from '../../data/mockData'

const ICONS = {
  reaction: { icon: Heart, tint: '#F43F5E' },
  mention: { icon: AtSign, tint: 'var(--brand-500)' },
  ai: { icon: Sparkles, tint: 'var(--brand-500)' },
  follow: { icon: UserPlus, tint: '#0EA5E9' },
  story: { icon: Bell, tint: 'var(--n-500)' },
  event: { icon: CalendarClock, tint: '#F59E0B' },
  security: { icon: ShieldAlert, tint: '#EF4444' },
}

export default function NotificationsPage() {
  const [items, setItems] = useState(seed)
  const [tab, setTab] = useState('all')
  const scrollRef = useRef(null)
  const scrolled = useScrolled(scrollRef)

  const shown = tab === 'unread' ? items.filter((n) => n.unread) : items
  const unreadCount = items.filter((n) => n.unread).length

  return (
    <div className="col grow" style={{ minWidth: 0, minHeight: 0 }}>
      <Header
        title="Activity"
        scrolled={scrolled}
        actions={
          unreadCount > 0 && (
            <button className="btn btn--ghost btn--sm" style={{ gap: 6 }} onClick={() => setItems((p) => p.map((n) => ({ ...n, unread: false })))}>
              <CheckCheck size={15} /> Mark all read
            </button>
          )
        }
      />

      <div ref={scrollRef} className="scroll grow" style={{ padding: '0 var(--list-inset) var(--s7)' }}>
        <div style={{ padding: 'var(--s1) var(--s3) var(--s4)' }}>
          <Segmented
            id="activity"
            value={tab}
            onChange={setTab}
            items={[{ value: 'all', label: 'All' }, { value: 'unread', label: `Unread${unreadCount ? ` · ${unreadCount}` : ''}` }]}
          />
        </div>

        {shown.length === 0 ? (
          <StatePanel compact icon={CheckCheck} title="All caught up" body="You have no unread activity." />
        ) : (
          <motion.div variants={listStagger} initial="hidden" animate="show" key={tab}>
            {shown.map((n) => {
              const meta = ICONS[n.type] || ICONS.story
              const Icon = meta.icon
              return (
                <motion.button
                  key={n.id}
                  variants={listItem}
                  className={`row-item ${n.unread ? 'row-item--unread' : ''}`}
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => setItems((p) => p.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar initials={n.initials} gradient={n.gradient} size={44} />
                    <span
                      className="row"
                      style={{
                        position: 'absolute', right: -3, bottom: -3, width: 21, height: 21,
                        justifyContent: 'center', borderRadius: 999,
                        background: 'var(--surface)', color: meta.tint,
                        boxShadow: 'var(--e1)',
                      }}
                    >
                      <Icon size={11} strokeWidth={2.4} fill={n.type === 'reaction' ? 'currentColor' : 'none'} />
                    </span>
                  </div>

                  <div className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--fs-14)', color: 'var(--text-2)', lineHeight: 1.4 }}>
                      <b style={{ fontWeight: 660, color: 'var(--text)' }}>{n.name}</b>{' '}
                      {n.text}
                    </div>
                    <div className="row" style={{ gap: 6, marginTop: 3 }}>
                      <span style={{ fontSize: 'var(--fs-11)', color: 'var(--text-4)' }}>{n.time}</span>
                      {n.ai && <span className="pill" style={{ height: 19, fontSize: 'var(--fs-11)', background: 'var(--brand-100)', color: 'var(--brand-700)' }}>UraiQ</span>}
                    </div>
                  </div>

                  {n.unread && <span className="badge badge--dot" style={{ flexShrink: 0 }} />}
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
