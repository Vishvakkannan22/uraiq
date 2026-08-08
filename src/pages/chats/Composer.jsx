import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Flame, Mic, Paperclip, SendHorizontal, ShieldAlert, ShieldX, Smile, Sparkles, X } from 'lucide-react'
import { ease, spring, springSnap } from '../../lib/motion'
import { useModeration } from '../../lib/useModeration'
import { getDraft, setDraft as persistDraft, clearDraft } from '../../lib/drafts'

const BURN_OPTIONS = ['Off', '5s', '10s', '30s', '1m']

export default function Composer({ conversationId, onSend, onTyping, replyTo, onCancelReply, peerName, onGuidance }) {
  /* Seeded from the store so switching threads — or reloading entirely —
     restores what was half-written. Keyed by conversationId in useState's
     initialiser *and* re-seeded in an effect below, because the initialiser
     only runs on the first mount and this component is reused across
     conversations rather than remounted. */
  const [draft, setDraft] = useState(() => getDraft(conversationId))
  const [burn, setBurn] = useState('Off')
  const [burnOpen, setBurnOpen] = useState(false)
  const ref = useRef(null)
  const typingSent = useRef(false)

  useEffect(() => {
    if (replyTo) ref.current?.focus()
  }, [replyTo])

  /* Re-seed on every conversation change. Also resizes the textarea, since
     restoring three lines of draft into a box still sized for one would clip
     it until the next keystroke. */
  useEffect(() => {
    const stored = getDraft(conversationId)
    setDraft(stored)
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    if (stored) el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [conversationId])

  /* One typing signal per burst, not one per keystroke. The socket auto-expires
     it after a few seconds, so the only edges that matter are empty -> typing
     and typing -> empty. */
  function signalTyping(value) {
    const typing = value.trim().length > 0
    if (typing === typingSent.current) return
    typingSent.current = typing
    onTyping?.(typing)
  }

  useEffect(
    () => () => {
      if (typingSent.current) onTyping?.(false)
    },
    [onTyping]
  )

  function autosize(el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  /* Debounced: every keystroke writing to localStorage would also notify the
     drafts store, re-rendering the whole chat list mid-word. A short delay
     costs nothing — the only reader is a list you are not looking at while
     typing — and the flush-on-unmount below covers leaving before it fires. */
  const persistTimer = useRef(null)
  function scheduleDraftSave(value) {
    clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => persistDraft(conversationId, value), 300)
  }

  /* `draft` is read through a ref so this effect can flush the latest value
     without re-subscribing on every keystroke. */
  const latestDraft = useRef(draft)
  latestDraft.current = draft
  useEffect(
    () => () => {
      clearTimeout(persistTimer.current)
      persistDraft(conversationId, latestDraft.current)
    },
    [conversationId]
  )

  /* The guidance pass runs on the draft, before send — the point is to catch
     it while it is still editable, not to remove it afterwards. */
  const { check } = useModeration(draft)
  const blocked = check.severity === 'blocked'
  const flagged = check.severity !== 'clear'

  /* Report each distinct flagged draft once, so the thread can offer a pause
     after repeated hits rather than after repeated keystrokes. */
  const lastReported = useRef(null)
  useEffect(() => {
    if (!flagged) return
    const key = `${check.standard}:${check.severity}`
    if (lastReported.current === key) return
    lastReported.current = key
    onGuidance?.()
  }, [flagged, check.standard, check.severity, onGuidance])
  useEffect(() => {
    if (!flagged) lastReported.current = null
  }, [flagged])

  /* Deliberately not gated on an in-flight model call. The server re-runs the
     same classifier on send and refuses there, so waiting here only delayed a
     decision that gets made again anyway. */
  const hasText = draft.trim().length > 0 && !blocked

  function submit() {
    if (!draft.trim() || blocked) return
    onSend(draft.trim(), burn)
    setDraft('')
    /* Cancel the pending save before clearing, or the debounced write from the
       last keystroke lands *after* this and resurrects the sent text as a
       draft. */
    clearTimeout(persistTimer.current)
    clearDraft(conversationId)
    signalTyping('')
    if (ref.current) ref.current.style.height = 'auto'
  }

  return (
    <div style={{ flexShrink: 0 }}>
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', padding: '0 var(--s4)' }}
          >
            <div
              className="row"
              style={{
                gap: 'var(--s3)', padding: '9px 12px', marginBottom: 2,
                background: 'var(--surface)', borderRadius: 'var(--r-md)',
                borderLeft: '3px solid var(--brand-500)', boxShadow: 'var(--e1)',
              }}
            >
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-12)', fontWeight: 650, color: 'var(--brand-600)' }}>
                  Replying to {replyTo.from === 'me' ? 'yourself' : replyTo.author || peerName}
                </div>
                <div className="truncate" style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)' }}>
                  {replyTo.text || replyTo.caption || (replyTo.kind === 'voice' ? 'Voice message' : 'Photo')}
                </div>
              </div>
              <button className="iconbtn iconbtn--sm" onClick={onCancelReply} aria-label="Cancel reply">
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flagged && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease }}
            style={{ overflow: 'hidden', padding: '0 var(--gutter)' }}
          >
            <div className={`guard guard--${blocked ? 'stop' : 'warn'}`}>
              <div className="guard__head">
                {blocked ? <ShieldX size={16} /> : <ShieldAlert size={16} />}
                <span className="grow">{check.reason}</span>
              </div>

              {check.suggestions.length > 0 && (
                <div className="guard__alts">
                  <span className="guard__altsLabel">
                    <Sparkles size={12} /> Try instead
                  </span>
                  <div className="no-scrollbar guard__altsScroll">
                    {check.suggestions.map((alt) => (
                      <button
                        key={alt}
                        className="chip chip--ai"
                        onClick={() => {
                          setDraft(alt)
                          ref.current?.focus()
                        }}
                      >
                        {alt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="composer">
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <AnimatePresence>
            {burnOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.94 }}
                transition={springSnap}
                className="popover"
                style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, width: 170 }}
              >
                <div style={{ padding: '6px 10px 8px', fontSize: 'var(--fs-11)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-4)' }}>
                  Burn after reading
                </div>
                {BURN_OPTIONS.map((o) => (
                  <button
                    key={o}
                    className="popover__item"
                    onClick={() => { setBurn(o); setBurnOpen(false) }}
                    style={o === burn ? { background: 'var(--brand-50)', color: 'var(--brand-800)', fontWeight: 650 } : undefined}
                  >
                    {o === 'Off' ? 'Off' : `Destroy after ${o}`}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            className="iconbtn composer__btn"
            onClick={() => setBurnOpen((v) => !v)}
            aria-label="Burn timer"
            style={burn !== 'Off' ? { background: 'var(--brand-100)', color: 'var(--brand-700)' } : undefined}
          >
            <Flame size={19} />
          </button>
        </div>

        <button className="iconbtn composer__btn iconbtn--muted" disabled aria-label="Attach unavailable">
          <Paperclip size={19} />
        </button>

        <div className="composer__input">
          <textarea
            ref={ref}
            rows={1}
            value={draft}
            placeholder={`Message ${peerName}…`}
            onChange={(e) => {
              setDraft(e.target.value)
              autosize(e.target)
              signalTyping(e.target.value)
              scheduleDraftSave(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
            }}
            aria-label="Message"
          />
          <button className="iconbtn iconbtn--sm iconbtn--muted" disabled aria-label="Emoji unavailable" style={{ marginRight: -4 }}>
            <Smile size={18} />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {hasText ? (
            <motion.button
              key="send"
              initial={{ scale: 0.5, opacity: 0, rotate: -25 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={spring}
              className="iconbtn composer__btn iconbtn--brand"
              onClick={submit}
              aria-label="Send"
            >
              <SendHorizontal size={18} />
            </motion.button>
          ) : (
            <motion.button
              key="mic"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={spring}
              className="iconbtn composer__btn iconbtn--muted"
              disabled
              aria-label="Voice messages unavailable"
            >
              <Mic size={19} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
