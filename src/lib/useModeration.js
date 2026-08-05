import { useEffect, useMemo, useRef, useState } from 'react'
import { agents } from './api'
import { evaluate as evaluateLocally } from './moderation'

const CLEAR = { severity: 'clear', standard: null, reason: null, suggestions: [] }

/**
 * Long. The local check below already gives instant feedback, so this only
 * needs to catch what the rules miss — and each call is a 2-3 second round trip
 * to a model. At 350ms a normal typist generated one of those per pause, which
 * made the composer feel slow and put the whole thread's latency on the writer.
 */
const DEBOUNCE_MS = 1200

/** Verdicts are pure functions of the text, so re-checking is free. */
const cache = new Map()
const CACHE_LIMIT = 50

function remember(text, verdict) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value)
  cache.set(text, verdict)
}

const RANK = { clear: 0, guidance: 1, blocked: 2 }

/**
 * Pre-send moderation, in two tiers.
 *
 * 1. The local rule net runs synchronously on every keystroke. No network, no
 *    delay — obvious problems are flagged as they are typed.
 * 2. The model runs on a long debounce and can only make the verdict stricter.
 *    It catches what the rules miss.
 *
 * Crucially this is advisory. `pending` is no longer something the composer
 * blocks on, because the server re-runs the identical classifier on send and is
 * the actual gate — a blocked message is refused there and never written.
 * Making the user wait on an advisory call for a decision that gets made again
 * server-side bought nothing and cost three seconds a message.
 */
export function useModeration(draft) {
  const text = draft.trim()

  /* Instant, synchronous, and recomputed only when the text changes. */
  const local = useMemo(() => (text ? evaluateLocally(text) : CLEAR), [text])

  const [remote, setRemote] = useState(CLEAR)
  const [pending, setPending] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    if (!text) {
      setRemote(CLEAR)
      setPending(false)
      return
    }

    const cached = cache.get(text)
    if (cached) {
      setRemote(cached)
      setPending(false)
      return
    }

    const id = ++seq.current
    const controller = new AbortController()
    setPending(true)

    const timer = setTimeout(async () => {
      try {
        const result = (await agents.moderate(text, { signal: controller.signal })) || CLEAR
        remember(text, result)
        /* A later draft has already superseded this one — discard the verdict
           rather than letting a slow early call overwrite a fresh one. */
        if (id !== seq.current) return
        setRemote(result)
      } catch {
        /* Leave the local verdict standing. Never downgrade to clear on a
           failure — that would quietly disable the check. */
        if (id === seq.current) setRemote(CLEAR)
      } finally {
        if (id === seq.current) setPending(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [text])

  /* Strictest wins, exactly as the server combines the same two signals. */
  const check = RANK[remote.severity] > RANK[local.severity] ? remote : local

  return { check, pending }
}
