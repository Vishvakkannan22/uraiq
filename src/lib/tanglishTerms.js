/**
 * Tamil / Tanglish targeted-insult and slur lexicon — client mirror.
 *
 * This MUST stay identical to worker/src/services/tanglishTerms.ts, which is
 * the file that actually enforces this on send. This copy only makes the
 * composer's instant, pre-network check (see useModeration.js) catch the same
 * terms the server will, rather than waiting on a round trip to flag
 * something the client already knows about.
 *
 * See the server copy for the full explanation of why this is stems rather
 * than the ~300 literal phrases supplied, and for the false-positive notes on
 * "mental", "thokku", "poda", "pasu", and why bare "pool" is deliberately
 * excluded.
 */
export const TANGLISH_BLOCK_TERMS = [
  'punda',
  'sunni',
  'thevidi',
  'mairu',
  'mayir',
  'thayol',
  'panni',
  'kuthi',
  'kuththi',
  'gundu',
  'loosu',
  'losu',
  'mokka',
  'kalla',
  'naai',
  'naaya',
  'omala',
  'erumai',
  'kazhudha',
  'pasu',
  'thiruttu',
  'veshti',
  'poolu',
  'poruki',
  'porukki',
  'thokku',
  'mental',
  'poda',
  'body shame',
]

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const TANGLISH_TERMS_RE = new RegExp(TANGLISH_BLOCK_TERMS.map(escapeRegExp).join('|'), 'i')
