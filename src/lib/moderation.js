/**
 * Client-side surface for the moderation agents.
 *
 * The real classification runs server-side; this module only decides what the
 * UI shows and when. It is deliberately conservative about vocabulary — the
 * interface talks about *community standards*, *review* and *guidance*, never
 * about labelling a person. A message can breach a standard; a user is told
 * what to change.
 *
 * Replace `evaluate()` with the API call when wiring the backend. Everything
 * downstream reads the returned shape, not the heuristic.
 */

export const STANDARDS = [
  { id: 'harassment', label: 'Harassment', blurb: 'Targeted insults or pile-ons' },
  { id: 'hate', label: 'Hateful content', blurb: 'Attacks on identity or protected groups' },
  { id: 'threats', label: 'Threats & violence', blurb: 'Intent to harm, direct or implied' },
  { id: 'sexual', label: 'Adult content', blurb: 'Explicit material and solicitation' },
  { id: 'selfharm', label: 'Self-harm', blurb: 'Routes to support rather than removal' },
  { id: 'spam', label: 'Spam & scams', blurb: 'Bulk messaging, phishing, impersonation' },
  { id: 'slurs', label: 'Targeted slurs', blurb: 'Caste, body or sexual insults' },
]

export const SEVERITY = {
  clear: { id: 'clear', label: 'Clear', tone: 'ok' },
  guidance: { id: 'guidance', label: 'Needs a second look', tone: 'warn' },
  blocked: { id: 'blocked', label: 'Held for review', tone: 'stop' },
}

import { TANGLISH_TERMS_RE } from './tanglishTerms'

/* Stand-in signals until the agent endpoint is connected. Kept intentionally
   small and obvious so nobody mistakes it for the real classifier. */
const SIGNALS = [
  { re: /\b(idiot|stupid|moron|loser|pathetic)\b/i, standard: 'harassment', severity: 'guidance' },
  { re: /\b(shut up|get lost|nobody likes you)\b/i, standard: 'harassment', severity: 'guidance' },
  { re: /\b(kill|hurt|destroy) (you|him|her|them)\b/i, standard: 'threats', severity: 'blocked' },
  { re: /\b(free money|click this link|crypto giveaway)\b/i, standard: 'spam', severity: 'blocked' },
  /* Real enforcement happens server-side (moderation.service.ts) on send.
     This copy exists so the composer flags the same terms instantly, before
     the debounced network check ever fires — see tanglishTerms.js. */
  { re: TANGLISH_TERMS_RE, standard: 'slurs', severity: 'blocked' },
]

const REPHRASINGS = {
  harassment: [
    'I disagree with this, and here’s why.',
    'This isn’t landing for me — can we talk it through?',
    'I’d rather not go back and forth on this.',
  ],
  threats: ['I’m frustrated and stepping away from this conversation.'],
  spam: ['Sharing a link — happy to explain the context first.'],
  slurs: [
    'I am really frustrated right now — can we talk about this calmly?',
    'I would rather not use that word. Let me say this differently.',
  ],
}

/**
 * @returns {{severity:string, standard:string|null, reason:string|null, suggestions:string[]}}
 */
export function evaluate(text) {
  const body = (text || '').trim()
  if (!body) return { severity: 'clear', standard: null, reason: null, suggestions: [] }

  for (const signal of SIGNALS) {
    if (signal.re.test(body)) {
      const standard = STANDARDS.find((s) => s.id === signal.standard)
      return {
        severity: signal.severity,
        standard: signal.standard,
        reason:
          signal.severity === 'blocked'
            ? `This looks like it breaches ${standard.label.toLowerCase()}. It won't be delivered.`
            : `This may read as ${standard.label.toLowerCase()}. You can send it anyway, or try another wording.`,
        suggestions: REPHRASINGS[signal.standard] || [],
      }
    }
  }

  return { severity: 'clear', standard: null, reason: null, suggestions: [] }
}

export const REPORT_REASONS = STANDARDS.map((s) => ({ id: s.id, label: s.label, blurb: s.blurb }))

/** Account standing, shown in Settings → Safety. */
export const standing = {
  state: 'good',
  label: 'Good standing',
  detail: 'No standards breaches in the last 90 days.',
  reviewed: 1284,
  flagged: 3,
  upheld: 0,
}
