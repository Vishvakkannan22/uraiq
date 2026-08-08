import { useSyncExternalStore } from 'react'

/**
 * The visual theme, as a single switch.
 *
 * Every component in this app already renders through CSS custom properties
 * (`var(--surface)`, `var(--e1)`, `var(--border)` …) rather than hardcoded
 * colors — that's what makes a whole second visual language possible without
 * touching a single component. Switching themes means redefining those tokens
 * under `:root[data-theme="neumorphism"]` in one stylesheet (see
 * styles/theme-neumorphism.css) and flipping an attribute on `<html>`. Nothing
 * else in the app needs to know a second theme exists.
 *
 * "Default" is the only theme most people will ever see — this exists as an
 * opt-in in Settings, not a redesign of the app.
 */

export const THEMES = ['default', 'neumorphism', 'dark']
const STORAGE_KEY = 'uraiq.theme'

/* Mirrors each theme's `--bg` token (tokens.css / theme-neumorphism.css /
   theme-dark.css). Duplicated rather than read from computed styles because
   the meta tag has to be right on the very first paint, before the
   stylesheet has necessarily been parsed — see the module-load call below. */
const THEME_COLOR = {
  default: '#F7F5FC',
  neumorphism: '#E9E4F5',
  dark: '#08080D',
}

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') {
      localStorage.setItem(STORAGE_KEY, 'default')
      return 'default'
    }
    return THEMES.includes(stored) ? stored : 'default'
  } catch {
    /* Private mode, or storage disabled — default theme, this tab only. */
    return 'default'
  }
}

let theme = readStored()
const listeners = new Set()

function applyToDocument(next) {
  if (typeof document === 'undefined') return
  if (next === 'default') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', next)

  /* The browser chrome (mobile status bar / task switcher card) otherwise
     stays whatever color index.html shipped with, which reads as a visible
     seam around the app's own chrome the instant it doesn't match — most
     obvious switching into the dark theme, where a light status bar sits
     directly above a near-black header. */
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[next] ?? THEME_COLOR.default)
}

/* Applied at module load — before React ever renders — so the correct theme
   is on screen for the very first paint instead of flashing default-then-
   neumorphism a moment later. */
applyToDocument(theme)

export function getTheme() {
  return theme
}

export function setTheme(next) {
  if (!THEMES.includes(next) || next === theme) return
  theme = next
  applyToDocument(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* Not persisting is survivable — the tab keeps the theme until reload. */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  const current = useSyncExternalStore(subscribe, getTheme, () => 'default')
  return [current, setTheme]
}
