/**
 * Conversation health — a per-thread read on how a relationship is going.
 *
 * Deliberately framed around the *conversation*, never the person: the score
 * describes an exchange, both sides own it, and it is never shown to the other
 * party as a judgement of them. Nothing here labels anyone.
 *
 * Values are derived deterministically from the chat id so a thread looks the
 * same on every render. Replace `healthOf` with the agent's response when the
 * backend is wired; every consumer reads the returned shape, not the maths.
 */

const BANDS = [
  { min: 85, id: 'thriving', label: 'Thriving', tone: 'ok', note: 'Warm, balanced and responsive.' },
  { min: 70, id: 'steady', label: 'Steady', tone: 'ok', note: 'Healthy back-and-forth.' },
  { min: 55, id: 'cooling', label: 'Cooling off', tone: 'warn', note: 'Replies have slowed and tone has flattened.' },
  { min: 0, id: 'strained', label: 'Needs care', tone: 'stop', note: 'Recent exchanges have been tense.' },
]

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/* A small deterministic PRNG so a thread's series is stable across renders. */
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) >>> 0
    return s / 4294967296
  }
}

export function bandOf(score) {
  return BANDS.find((b) => score >= b.min)
}

export function healthOf(chatId) {
  const rnd = seeded(hash(chatId))
  const score = Math.round(56 + rnd() * 40)

  /* Fourteen days of tone, ending at today's score so the sparkline and the
     ring never disagree. */
  const series = Array.from({ length: 14 }, (_, i) =>
    Math.max(38, Math.min(99, Math.round(score + (rnd() - 0.5) * 26 - (13 - i) * 0.4)))
  )
  series[series.length - 1] = score

  const signals = [
    { id: 'respect', label: 'Respectful language', value: Math.round(70 + rnd() * 30) },
    { id: 'balance', label: 'Balanced turn-taking', value: Math.round(52 + rnd() * 46) },
    { id: 'response', label: 'Reply times', value: Math.round(58 + rnd() * 40) },
    { id: 'warmth', label: 'Warmth signals', value: Math.round(60 + rnd() * 38) },
  ]

  return {
    score,
    band: bandOf(score),
    series,
    signals,
    streak: Math.round(3 + rnd() * 40),
    trend: series[13] - series[7],
  }
}

/** Shown after repeated guidance in one sitting — a pause, not a punishment. */
export const COOLDOWN_THRESHOLD = 2

export const COOLDOWN = {
  title: 'Take a moment?',
  body:
    'A few messages in a row needed rewording. Stepping away for a minute usually lands better than pushing through.',
  actions: ['Pause for 5 minutes', 'Keep writing'],
}

/** Moments worth remembering, surfaced in the health sheet. */
export function momentsOf(chatId) {
  const rnd = seeded(hash(chatId + 'm'))
  const pool = [
    'You both agreed on the plan without a single back-and-forth.',
    'A disagreement was resolved in under five messages.',
    'Longest conversation this month — 41 messages.',
    'First time you shared files in this thread.',
    'Reply times halved compared with last week.',
  ]
  return pool.filter(() => rnd() > 0.35).slice(0, 3)
}
