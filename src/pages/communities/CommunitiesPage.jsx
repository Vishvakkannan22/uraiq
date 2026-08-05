import { useRef } from 'react'
import { motion } from 'framer-motion'
import { CalendarPlus, Hash, Plus, Search, Users } from 'lucide-react'
import Header from '../../layout/Header'
import { listItem, listStagger } from '../../lib/motion'
import { useScrolled } from '../../lib/useScrolled'
import { communities, events } from '../../data/mockData'

function CommunityRow({ c }) {
  return (
    <motion.button variants={listItem} className="row-item" style={{ width: '100%' }}>
      <span style={{ width: 46, height: 46, borderRadius: 'var(--r-md)', background: c.gradient, flexShrink: 0 }} />
      <div className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
        <div className="truncate" style={{ fontWeight: 640, fontSize: 'var(--fs-15)', color: 'var(--text)' }}>{c.name}</div>
        <div className="row" style={{ gap: 'var(--s3)', marginTop: 2, fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>
          <span className="row tnum" style={{ gap: 4 }}><Users size={12} />{c.members}</span>
          <span className="row tnum" style={{ gap: 4 }}><Hash size={12} />{c.channels}</span>
          <span className="pill" style={{ height: 18, fontSize: 10 }}>{c.tag}</span>
        </div>
      </div>
      {c.unread > 0 && <span className="badge" style={{ flexShrink: 0 }}>{c.unread}</span>}
    </motion.button>
  )
}

export default function CommunitiesPage() {
  const scrollRef = useRef(null)
  const scrolled = useScrolled(scrollRef)

  return (
    <div className="col grow" style={{ minWidth: 0, minHeight: 0 }}>
      <Header
        title="Communities"
        scrolled={scrolled}
        actions={
          <>
            <button className="iconbtn" aria-label="Search communities"><Search size={19} /></button>
            <button className="iconbtn iconbtn--brand" aria-label="Create community"><Plus size={19} /></button>
          </>
        }
      />

      <div ref={scrollRef} className="scroll grow" style={{ padding: '0 var(--gutter) var(--s7)' }}>
        <section className="section">
          <h2 className="section__head">
            Your groups
            <span className="section__count tnum">{communities.length}</span>
          </h2>
          <motion.div variants={listStagger} initial="hidden" animate="show" className="col" style={{ gap: 2 }}>
            {communities.map((c) => <CommunityRow key={c.id} c={c} />)}
          </motion.div>
        </section>

        <section className="section">
          <h2 className="section__head">
            Upcoming events
            <button className="btn btn--ghost btn--sm section__count" style={{ gap: 6, height: 28 }}>
              <CalendarPlus size={15} /> Add
            </button>
          </h2>
          <motion.div
            variants={listStagger}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', maxWidth: 620 }}
          >
            {events.map((e) => (
              <motion.div key={e.id} variants={listItem} className="card card--interactive row" style={{ gap: 'var(--s4)', padding: 'var(--s3)', cursor: 'pointer' }}>
                <div
                  className="col"
                  style={{
                    width: 54, height: 54, borderRadius: 'var(--r-md)', flexShrink: 0,
                    alignItems: 'center', justifyContent: 'center', gap: 0,
                    background: 'var(--grad-wash)', color: 'var(--brand-800)',
                  }}
                >
                  <span className="tnum" style={{ fontSize: 'var(--fs-17)', fontWeight: 720, lineHeight: 1 }}>{e.day}</span>
                  <span style={{ fontSize: 'var(--fs-11)', fontWeight: 660, textTransform: 'uppercase', letterSpacing: '.04em' }}>{e.month}</span>
                </div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="truncate" style={{ fontWeight: 640, fontSize: 'var(--fs-14)', color: 'var(--text)' }}>{e.title}</div>
                  <div className="truncate" style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)', marginTop: 2 }}>{e.host} · {e.where}</div>
                </div>
                <div className="col" style={{ alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                  <span className="pill pill--brand tnum">{e.going} going</span>
                  <span style={{ fontSize: 'var(--fs-11)', color: 'var(--text-4)' }}>Tap to RSVP</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </div>
    </div>
  )
}
