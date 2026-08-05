import type { Env, ModerationResult } from '../types'
import type { Logger } from '../utils/logger'

/**
 * The safety agent. Runs before a message is persisted or delivered.
 *
 * Two independent checks run in parallel and the strictest verdict wins:
 *
 *  1. Llama Guard 3 (8B) on Workers AI, classifying against the MLCommons
 *     hazard taxonomy — violent crime, CSAM, hate against protected groups.
 *  2. A local rule net for everyday incivility.
 *
 * The second is not a fallback. Verified against a live endpoint: the message
 * "you are a pathetic idiot and I will destroy you" comes back SAFE from Llama
 * Guard, because ordinary insults are not a listed *hazard*. That is correct
 * behaviour for Llama Guard and insufficient for a product whose whole promise
 * is civil conversation, so both run on every message.
 *
 * TODO: replace MODEL with your fine-tuned agent when it is ready. The rest of
 * the system depends only on the returned `ModerationResult` shape. When you
 * do, revisit SIGNALS below — see the note there.
 */
const MODEL = '@cf/meta/llama-guard-3-8b'

/** MLCommons hazard codes -> the standards this product names in its UI. */
const HAZARD_TO_STANDARD: Record<string, { standard: string; severity: 'guidance' | 'blocked' }> = {
  S1: { standard: 'threats', severity: 'blocked' },      // Violent crimes
  S2: { standard: 'threats', severity: 'blocked' },      // Non-violent crimes
  S3: { standard: 'sexual', severity: 'blocked' },       // Sex-related crimes
  S4: { standard: 'sexual', severity: 'blocked' },       // Child exploitation
  S5: { standard: 'harassment', severity: 'guidance' },  // Defamation
  S6: { standard: 'harassment', severity: 'guidance' },  // Specialised advice
  S8: { standard: 'spam', severity: 'guidance' },        // Intellectual property
  S10: { standard: 'hate', severity: 'blocked' },        // Hate
  S11: { standard: 'selfharm', severity: 'guidance' },   // Suicide & self-harm
  S12: { standard: 'sexual', severity: 'blocked' },      // Sexual content
  S13: { standard: 'spam', severity: 'guidance' },       // Elections
}

const REPHRASINGS: Record<string, string[]> = {
  harassment: [
    'I disagree with this, and here is why.',
    'This is not landing for me — can we talk it through?',
    'I would rather not go back and forth on this.',
  ],
  hate: ['I strongly disagree with that view.'],
  threats: ['I am frustrated and stepping away from this conversation.'],
  spam: ['Sharing a link — happy to explain the context first.'],
  selfharm: [],
  sexual: [],
}

const REASONS: Record<string, string> = {
  harassment: 'This may read as harassment.',
  hate: 'This may breach the hateful content standard.',
  threats: 'This looks like it breaches threats and violence.',
  sexual: 'This breaches the adult content standard.',
  selfharm: 'It sounds like this is a hard moment. Support options are available.',
  spam: 'This looks like spam or a scam.',
}

export const CLEAR: ModerationResult = {
  severity: 'clear',
  standard: null,
  reason: null,
  suggestions: [],
}

const RANK: Record<ModerationResult['severity'], number> = { clear: 0, guidance: 1, blocked: 2 }

function strictest(a: ModerationResult, b: ModerationResult): ModerationResult {
  return RANK[b.severity] > RANK[a.severity] ? b : a
}

export async function moderate(
  env: Env,
  text: string,
  logger?: Logger
): Promise<ModerationResult> {
  const body = text.trim()
  if (!body) return CLEAR

  const [aiVerdict, ruleVerdict] = await Promise.all([
    classifyWithAi(env, body, logger),
    Promise.resolve(localRules(body)),
  ])

  return strictest(aiVerdict, ruleVerdict)
}

async function classifyWithAi(
  env: Env,
  body: string,
  logger?: Logger
): Promise<ModerationResult> {
  if (!env.AI) return CLEAR

  try {
    const response = (await env.AI.run(MODEL as keyof AiModels, {
      messages: [{ role: 'user', content: body }],
    } as never)) as { response?: string }

    const raw = (response?.response ?? '').trim()
    if (!raw || raw.toLowerCase().startsWith('safe')) return CLEAR

    const code = raw.match(/S\d{1,2}/)?.[0] ?? ''
    const mapped = HAZARD_TO_STANDARD[code]

    if (!mapped) {
      /* Unsafe but uncategorised. Warn rather than block, so an unmapped new
         taxonomy code degrades into guidance instead of a hard wall in front
         of a message that may be fine. */
      logger?.warn('unmapped moderation code', { code, raw })
      return {
        severity: 'guidance',
        standard: 'harassment',
        reason: 'This may breach community standards.',
        suggestions: REPHRASINGS.harassment,
      }
    }

    return {
      severity: mapped.severity,
      standard: mapped.standard,
      reason: REASONS[mapped.standard] ?? 'This may breach community standards.',
      suggestions: REPHRASINGS[mapped.standard] ?? [],
    }
  } catch (err) {
    /* An outage must not silently disable moderation. Returning CLEAR here is
       safe *only* because localRules() runs unconditionally alongside this and
       still applies. If you ever make the AI the sole check, this has to fail
       closed instead. */
    logger?.error('moderation model unavailable', err)
    return CLEAR
  }
}

/**
 * Everyday incivility, which the hazard taxonomy does not cover.
 *
 * This is a small, obvious net and it is doing load-bearing work — it is the
 * only thing catching plain insults. It is NOT a classifier and will not scale
 * to real abuse: no obfuscation handling, no context, English only.
 *
 * TODO: replace with a real lexicon or the fine-tuned agent before launch. Ship
 * this as-is and users will route around it within a day.
 */
const SIGNALS: Array<{ re: RegExp; standard: string; severity: 'guidance' | 'blocked' }> = [
  { re: /\b(idiot|stupid|moron|loser|pathetic)\b/i, standard: 'harassment', severity: 'guidance' },
  { re: /\b(kill|hurt|destroy)\s+(you|him|her|them)\b/i, standard: 'threats', severity: 'blocked' },
  { re: /\b(free money|crypto giveaway|click this link)\b/i, standard: 'spam', severity: 'blocked' },
]

function localRules(text: string): ModerationResult {
  /* Every signal is evaluated and the strictest wins. Returning on first match
     made array order load-bearing: "pathetic idiot ... destroy you" trips both
     harassment (guidance) and threats (blocked), and first-match downgraded a
     threat to a warning purely because harassment was listed first. */
  let worst: ModerationResult = CLEAR

  for (const signal of SIGNALS) {
    if (!signal.re.test(text)) continue
    worst = strictest(worst, {
      severity: signal.severity,
      standard: signal.standard,
      reason: REASONS[signal.standard] ?? 'This may breach community standards.',
      suggestions: REPHRASINGS[signal.standard] ?? [],
    })
  }

  return worst
}
