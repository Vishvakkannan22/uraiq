import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Flame, Forward, Languages, Pause, Pencil, Pin, Play, Reply, Star, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { ease, messageIn, spring, springSnap } from '../../lib/motion'

const EMOJI = ['❤️', '😂', '👍', '😮', '😢', '🔥']

/* Deterministic waveform so a voice note looks the same on every render. */
function bars(seed, n = 28) {
  const out = []
  let x = seed * 9301 + 49297
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280
    out.push(0.25 + (x / 233280) * 0.75)
  }
  return out
}

function BurnRing({ seconds }) {
  const r = 6.5
  const c = 2 * Math.PI * r
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.6" />
      <motion.circle
        cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
        transform="rotate(-90 8 8)" strokeDasharray={c}
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: c }}
        transition={{ duration: seconds, ease: 'linear' }}
      />
    </svg>
  )
}

function VoiceNote({ id, duration, out }) {
  const [playing, setPlaying] = useState(false)
  const wave = bars(id)
  return (
    <div className="row" style={{ gap: 'var(--s3)', minWidth: 190, padding: '2px 0' }}>
      <button
        onClick={() => setPlaying((p) => !p)}
        className="row"
        style={{
          justifyContent: 'center', width: 34, height: 34, borderRadius: 999, flexShrink: 0,
          background: out ? 'rgba(255,255,255,.22)' : 'var(--brand-100)',
          color: out ? '#fff' : 'var(--brand-600)',
        }}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: 2 }} />}
      </button>
      <div className="row grow" style={{ gap: 2, height: 26 }}>
        {wave.map((h, i) => (
          <motion.span
            key={i}
            animate={playing ? { scaleY: [h, Math.min(1, h * 1.5), h] } : { scaleY: h }}
            transition={playing ? { duration: 0.7, repeat: Infinity, delay: i * 0.03 } : { duration: 0.2 }}
            style={{
              flex: 1, height: '100%', borderRadius: 2, transformOrigin: 'center',
              background: out ? 'rgba(255,255,255,.62)' : 'var(--brand-300)',
            }}
          />
        ))}
      </div>
      <span className="tnum" style={{ fontSize: 'var(--fs-11)', opacity: 0.75, flexShrink: 0 }}>{duration}</span>
    </div>
  )
}

function pulseState(status) {
  if (status === 'seen' || status === 'read') return 'seen'
  if (status === 'received' || status === 'delivered') return 'received'
  return 'sending'
}

function MessagePulse({ status, time, onOpen }) {
  const state = pulseState(status)
  const label = state === 'seen' ? 'Seen' : state === 'received' ? 'Received' : 'Sending'

  return (
    <button
      className={`message-pulse message-pulse--${state}`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen?.()
      }}
      aria-label={`${label} at ${time}`}
    >
      <span className="message-pulse__mark" aria-hidden>
        {state === 'sending' && (
          <>
            <span className="message-pulse__orbit" />
            <span className="message-pulse__dot" />
          </>
        )}
        {state === 'received' && (
          <>
            <span className="message-pulse__ring" />
            <span className="message-pulse__core" />
          </>
        )}
        {state === 'seen' && (
          <>
            <span className="message-pulse__spark" />
            <span className="message-pulse__flare" />
          </>
        )}
      </span>
      <span className="message-pulse__label">{label}</span>
      <span className="message-pulse__time">{time}</span>
    </button>
  )
}

export default function MessageBubble({
  msg, grouped, showAuthor, onReply, onReact, active, onActivate, onOpenStatus,
  starred, pinned, match, dimmed, onStar, onPin, onCopy, onDelete, onForward, onEdit,
}) {
  const [draft, setDraft] = useState(null)
  const out = msg.from === 'me'

  return (
    <motion.div
      layout="position"
      {...messageIn}
      onMouseEnter={() => onActivate(msg.id)}
      onMouseLeave={() => onActivate(null)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: out ? 'flex-end' : 'flex-start',
        marginTop: grouped ? 2 : 'var(--s3)',
      }}
    >
      {showAuthor && !out && (
        <span style={{ fontSize: 'var(--fs-12)', fontWeight: 620, color: 'var(--brand-600)', margin: '0 0 3px 13px' }}>
          {msg.author}
        </span>
      )}

      {/* Full width, with row-reverse doing the side placement. The bubble's
          `max-width: 74%` needs a definite containing block to resolve
          against, otherwise it measures off a shrink-to-fit parent. */}
      <div className="row" style={{ flexDirection: out ? 'row-reverse' : 'row', width: '100%' }}>
        {/* width:100% above makes this wrapper's containing block definite,
            which is the only reason the 74% below resolves at all. */}
        <div style={{ position: 'relative', maxWidth: 'min(560px, 74%)', minWidth: 0 }}>
          <AnimatePresence>
            {active && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 6 }}
                transition={springSnap}
                /* Padding (not margin) keeps the gap hoverable so the bar
                   doesn't dismiss as the cursor travels up to it. */
                style={{
                  position: 'absolute', bottom: '100%', [out ? 'right' : 'left']: 0,
                  paddingBottom: 8, zIndex: 'var(--z-popover)',
                }}
              >
                <div className="popover row" style={{ gap: 1, padding: 4, borderRadius: 999 }}>
                  {EMOJI.map((e) => (
                    <motion.button
                      key={e}
                      whileHover={{ scale: 1.3, y: -2 }}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => onReact(msg.id, e)}
                      style={{ fontSize: 17, lineHeight: 1, padding: 4 }}
                      aria-label={`React ${e}`}
                    >
                      {e}
                    </motion.button>
                  ))}
                  <span style={{ width: 1, height: 18, background: 'var(--divider)', margin: '0 3px' }} />
                  <button className="iconbtn iconbtn--sm" onClick={() => onReply(msg)} aria-label="Reply">
                    <Reply size={15} />
                  </button>
                  <button
                    className="iconbtn iconbtn--sm"
                    onClick={() => onStar?.(msg.id)}
                    aria-label={starred ? 'Unstar' : 'Star'}
                    style={starred ? { color: 'var(--warning)' } : undefined}
                  >
                    <Star size={15} fill={starred ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="iconbtn iconbtn--sm"
                    onClick={() => onPin?.(msg.id)}
                    aria-label={pinned ? 'Unpin' : 'Pin'}
                    style={pinned ? { color: 'var(--brand-700)' } : undefined}
                  >
                    <Pin size={15} fill={pinned ? 'currentColor' : 'none'} />
                  </button>
                  <button className="iconbtn iconbtn--sm" onClick={() => onForward?.(msg)} aria-label="Forward">
                    <Forward size={15} />
                  </button>
                  <button className="iconbtn iconbtn--sm" onClick={() => onCopy?.(msg)} aria-label="Copy text">
                    <Copy size={15} />
                  </button>
                  {out && msg.text && (
                    <button className="iconbtn iconbtn--sm" onClick={() => setDraft(msg.text)} aria-label="Edit message">
                      <Pencil size={15} />
                    </button>
                  )}
                  <button
                    className="iconbtn iconbtn--sm"
                    onClick={() => onDelete?.(msg.id)}
                    aria-label="Delete message"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className={[
              'bubble',
              out ? 'bubble--out' : 'bubble--in',
              match && 'bubble--match',
            ].filter(Boolean).join(' ')}
            style={dimmed ? { opacity: 0.4 } : undefined}
            onClick={() => onActivate(active ? null : msg.id)}
          >
            {(starred || pinned) && (
              <span className="bubble__flags" aria-hidden>
                {pinned && <Pin size={11} fill="currentColor" />}
                {starred && <Star size={11} fill="currentColor" />}
              </span>
            )}
            {msg.replyTo && (
              <span className="bubble__quote">
                <b style={{ display: 'block', fontWeight: 650 }}>{msg.replyTo.author}</b>
                <span className="truncate" style={{ display: 'block', opacity: 0.85 }}>{msg.replyTo.text}</span>
              </span>
            )}

            {msg.kind === 'image' && (
              <div
                style={{
                  width: 'min(260px, 62vw)', aspectRatio: '4 / 3', borderRadius: 'var(--r-md)',
                  background: msg.gradient, marginBottom: msg.caption ? 7 : 2,
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)',
                }}
              />
            )}

            {msg.kind === 'voice' && <VoiceNote id={msg.id} duration={msg.duration} out={out} />}

            {msg.kind === 'translated' && (
              <>
                <div style={{ opacity: 0.7, fontSize: 'var(--fs-14)' }}>{msg.text}</div>
                <div style={{ height: 1, background: 'var(--divider)', margin: '7px 0' }} />
                <div>{msg.translation}</div>
                <div className="row" style={{ gap: 4, marginTop: 5, fontSize: 'var(--fs-11)', color: 'var(--brand-600)', fontWeight: 600 }}>
                  <Languages size={11} /> Translated by UraiQ
                </div>
              </>
            )}

            {draft !== null ? (
              <span className="bubble__edit" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { onEdit?.(msg.id, draft); setDraft(null) }
                    if (e.key === 'Escape') setDraft(null)
                  }}
                  aria-label="Edit message"
                />
                <button onClick={() => setDraft(null)} aria-label="Cancel edit"><X size={14} /></button>
                <button onClick={() => { onEdit?.(msg.id, draft); setDraft(null) }} aria-label="Save edit"><Check size={14} /></button>
              </span>
            ) : (
              (msg.caption || (msg.text && msg.kind !== 'translated')) && (
                <span>{msg.caption || msg.text}</span>
              )
            )}

            <span className="bubble__meta tnum">
              {msg.edited && <span className="bubble__edited">edited</span>}
              {msg.burnSeconds && (
                <span className="row" style={{ gap: 3, marginRight: 2 }}>
                  <BurnRing seconds={msg.burnSeconds} />
                  <Flame size={11} />
                </span>
              )}
              {out ? (
                <MessagePulse status={msg.status} time={msg.time} onOpen={() => onOpenStatus?.(msg)} />
              ) : (
                msg.time
              )}
            </span>
          </div>
        </div>
      </div>

      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={springSnap}
          className="row"
          style={{ gap: 4, marginTop: -6, marginLeft: out ? 0 : 10, marginRight: out ? 10 : 0, zIndex: 1 }}
        >
          {Object.entries(msg.reactions).map(([emoji, r]) => (
            <button key={emoji} className={`reaction ${r.mine ? 'reaction--mine' : ''}`} onClick={() => onReact(msg.id, emoji)}>
              <span>{emoji}</span>
              {r.count > 1 && <span className="tnum" style={{ color: 'var(--text-3)', fontWeight: 600 }}>{r.count}</span>}
            </button>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

export function DateDivider({ label }) {
  return (
    <div className="row" style={{ justifyContent: 'center', margin: 'var(--s5) 0 var(--s3)' }}>
      <span
        style={{
          padding: '4px 12px', borderRadius: 999,
          background: 'var(--surface)', boxShadow: 'var(--e1), inset 0 0 0 1px var(--border)',
          fontSize: 'var(--fs-11)', fontWeight: 640, color: 'var(--text-4)',
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </span>
    </div>
  )
}

export function TypingBubble() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.24, ease }}>
      <div className="bubble bubble--in bubble--typing" style={{ gap: 4, padding: '13px 15px', width: 'fit-content' }}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
            transition={{ duration: 1.15, repeat: Infinity, delay: i * 0.15 }}
            style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--n-400)' }}
          />
        ))}
      </div>
    </motion.div>
  )
}
