/**
 * Assistant output surfaces.
 *
 * Everything here is the shape the UI renders, not the intelligence that
 * produces it. When the agents are wired, replace the three functions below
 * with API calls returning the same shapes and no component changes.
 *
 * Nothing is invented about a person: the brief only ever reports what is
 * already visible in the user's own threads.
 */

/* TODO(milestone 2): these are derived from the local seed and keyed by the old
   mock chat ids, so against real ULID conversation ids they return nothing —
   the "you were away" resume and the notes panel simply do not render. That is
   the correct failure: an assistant summary of messages nobody analysed would
   be invented. Replace with an agent endpoint before turning them back on. */
import { chats } from '../data/mockData'

function pick(id) {
  return chats.find((c) => c.id === id)
}

function person(id, extra) {
  const c = pick(id)
  return c ? { chatId: c.id, name: c.name, initials: c.initials, gradient: c.gradient, ...extra } : null
}

/** #71 daily summary + #72 reminders + #76 upcoming, as one briefing. */
export function dailyBrief() {
  return {
    window: 'since yesterday',
    counts: { messages: 47, threads: 6, mentions: 2 },

    needsYou: [
      person('marcus', { waiting: '2h', reason: 'Asked whether the export arrived before it expired.' }),
      person('mom', { waiting: '1d', reason: 'Asked you to call when you get a chance.' }),
      person('robotics', { waiting: '5h', reason: 'You were tagged about Thursday’s room change.' }),
    ].filter(Boolean),

    summary: [
      'The encryption audit closed with no findings on the key derivation path.',
      'CS Club moved the showcase vote to Friday — 51 of 97 votes so far.',
      'Design Collective shipped the new type scale to the shared library.',
    ],

    comingUp: [
      { id: 'u1', title: 'Robotics Hub meeting', when: 'Thu 6:00 PM', where: 'Rm 204', source: 'Robotics Hub' },
      { id: 'u2', title: 'Poster deadline', when: 'Friday', where: null, source: 'CS Club — Officers' },
      { id: 'u3', title: 'Grant applications close', when: 'End of month', where: null, source: 'Campus Wire' },
    ],

    quiet: [
      person('design', { days: 4 }),
      person('study', { days: 9 }),
    ].filter(Boolean),
  }
}

/**
 * #73 — shown when you open a thread with unread history.
 *
 * The per-conversation bullets that used to live here were written against the
 * seed data and described conversations that do not exist. They are gone: this
 * now reports only what is actually known, which is how many messages arrived.
 *
 * TODO(milestone 2): replace with an agent endpoint that summarises the real
 * unread messages. Until then, counting is the most this can honestly say.
 */
export function resumeFor(chatId, unread) {
  if (!unread) return null
  return {
    awayFor: 'a while',
    bullets: [`${unread} message${unread === 1 ? '' : 's'} arrived while you were away.`],
  }
}

/**
 * #74 — decisions, dates and actions lifted out of the thread.
 *
 * Returns nothing, deliberately. The hardcoded examples this used to hold were
 * invented meeting times and action items; rendering those over somebody's real
 * conversation would be worse than rendering nothing, and the notes section
 * simply does not appear when all three lists are empty.
 *
 * TODO(milestone 2): extract these from real messages with an agent.
 */
export function notesFor() {
  return { decisions: [], dates: [], actions: [] }
}
