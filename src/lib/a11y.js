import { useSyncExternalStore } from 'react'

/**
 * Accessibility preferences.
 *
 * Deliberately a separate axis from the visual theme (lib/theme.js), not more
 * entries in THEMES. A theme is a look you pick; these are needs you have, and
 * they compose — someone can want the dark theme *and* high contrast *and*
 * larger text at once. Modelling them as one list would force a choice between
 * things that were never alternatives to each other.
 *
 * Each preference becomes an attribute on <html>, and styles/a11y.css
 * redefines the affected design tokens under those attribute selectors — the
 * same "redefine the tokens, touch no component" mechanism the themes use, so
 * a preference reaches every screen without a single component knowing it
 * exists.
 */

const STORAGE_KEY = 'uraiq.a11y'

/* `attr` is the data-attribute each preference writes to <html>; `off` is the
   value that means "nothing to apply", which is removed rather than written so
   the default state leaves no attribute behind at all. */
export const PREFERENCES = {
  contrast: { attr: 'data-contrast', off: 'normal', values: ['normal', 'high'] },
  textSize: { attr: 'data-text-size', off: 'default', values: ['default', 'large', 'larger'] },
  typeface: { attr: 'data-typeface', off: 'default', values: ['default', 'readable'] },
  transparency: { attr: 'data-transparency', off: 'normal', values: ['normal', 'reduced'] },
}

const DEFAULTS = Object.fromEntries(
  Object.entries(PREFERENCES).map(([key, spec]) => [key, spec.off])
)

function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    /* Validate every value against its own allow-list rather than trusting the
       blob — a stale key from an older build would otherwise become an
       attribute selector nothing in the CSS matches, silently doing nothing. */
    const next = { ...DEFAULTS }
    for (const [key, spec] of Object.entries(PREFERENCES)) {
      if (spec.values.includes(raw[key])) next[key] = raw[key]
    }
    return next
  } catch {
    /* Private mode, or storage disabled — defaults, this tab only. */
    return { ...DEFAULTS }
  }
}

let prefs = readStored()
const listeners = new Set()

function applyToDocument(next) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const [key, spec] of Object.entries(PREFERENCES)) {
    if (next[key] === spec.off) root.removeAttribute(spec.attr)
    else root.setAttribute(spec.attr, next[key])
  }
}

/* Applied at module load — before React renders — so someone who needs larger
   text or higher contrast gets it on the first paint rather than watching the
   page correct itself a moment later. */
applyToDocument(prefs)

export function getPreferences() {
  return prefs
}

export function setPreference(key, value) {
  const spec = PREFERENCES[key]
  if (!spec || !spec.values.includes(value) || prefs[key] === value) return
  prefs = { ...prefs, [key]: value }
  applyToDocument(prefs)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* Not persisting is survivable — the tab keeps the preference until reload. */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useA11y() {
  const current = useSyncExternalStore(subscribe, getPreferences, () => DEFAULTS)
  return [current, setPreference]
}
