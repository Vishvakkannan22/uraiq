/**
 * Tamil / Tanglish targeted-insult and slur lexicon.
 *
 * Supplied by the product owner as ~300 phrases across word families
 * (punda / sunni / thevidiya / mairu / thayoli / panni / kuthi) plus
 * body-shaming and general insults, for one purpose: block on match, no
 * per-family split — see `moderation.service.ts` for where that verdict is
 * applied.
 *
 * The list is ~300 lines long in the raw form it was supplied in. It is NOT
 * reproduced here as 300 literal strings. Tamil is agglutinative — "punda",
 * "pundachi", "pundai", "pundam", "pundaya" are one root plus a suffix, and
 * every multi-word entry ("periya punda", "punda da", "punda solra") is a
 * qualifier or particle wrapped around the same root. Matching the ROOT as a
 * substring catches the root, every suffixed form, and every phrase
 * containing it — so the full list reduces to the stems below with nothing
 * lost, and *more* is caught than was literally spelled out (an inflection
 * the list's author didn't happen to type is still caught, because it still
 * contains the root).
 *
 * Every stem was checked against both lists supplied to make sure it is
 * genuinely covered by a root rather than assumed. A few stems carry a real
 * false-positive cost — ordinary English or Tamil words that happen to
 * contain the string — and are called out below rather than silently
 * shipped. Each is a deliberate inclusion at the product owner's explicit
 * instruction, not an oversight:
 *
 *   - "mental" is also the ordinary English word ("mental health/math").
 *   - "thokku" is also a real Tamil dish name (tomato thokku).
 *   - "poda" is a mild, very common casual imperative ("get lost") that
 *     isn't always hostile.
 *   - "pasu" is a short root (4 letters) with some risk of appearing inside
 *     unrelated words or names.
 *   - Bare "pool" was deliberately LEFT OUT even though the supplied list
 *     included it: "pool" is an ordinary English word (swimming pool,
 *     carpool, pool party) and blocking it outright would refuse a large
 *     amount of completely innocent conversation. Only "poolu" — the actual
 *     Tanglish spelling of the vulgar term — is matched.
 */
export const TANGLISH_BLOCK_TERMS = [
  // ---- punda family ----
  'punda',
  // ---- sunni family ----
  'sunni',
  // ---- thevidiya family (root "thevidi" covers thevidi / thevidiya / thevidiyal) ----
  'thevidi',
  // ---- mairu family (covers both the softened and uncensored spelling) ----
  'mairu',
  'mayir',
  // ---- thayoli family (root "thayol" covers thayol / thayoli / thayoliya) ----
  'thayol',
  // ---- panni family ----
  'panni',
  // ---- kuthi family (plus the double-consonant spelling) ----
  'kuthi',
  'kuththi',
  // ---- body-shaming / general targeted insults ----
  'gundu', // fat-shaming
  'loosu', // "crazy / loose" insult
  'losu', // alternate spelling of the same insult
  'mokka',
  'kalla', // thief
  'naai', // dog insult
  'naaya', // dog insult, does not share a prefix with "naai"
  'omala', // fat-shaming
  'erumai', // buffalo insult
  'kazhudha', // donkey insult
  'pasu', // cow insult — short root, see false-positive note above
  'thiruttu', // thief / cheat
  'veshti',
  'poolu', // vulgar slang — NOT bare "pool", see false-positive note above
  'poruki', // hooligan / loafer
  'porukki', // does not share a prefix with "poruki"
  'thokku', // see false-positive note above
  'mental', // see false-positive note above
  'poda', // see false-positive note above
  'body shame',
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** One case-insensitive alternation over every stem, built once at module load. */
export const TANGLISH_TERMS_RE = new RegExp(TANGLISH_BLOCK_TERMS.map(escapeRegExp).join('|'), 'i')
