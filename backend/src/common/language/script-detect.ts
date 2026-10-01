/**
 * Lightweight script/language detection for multilingual answer handling.
 *
 * Deliberately heuristic and dependency-free. It answers exactly two questions
 * the answer pipeline needs cheaply and synchronously:
 *
 *   1. Which script is this text written in? (telemetry.)
 *   2. What is the coarse language tag? (Devanagari → Hindi by default.)
 *
 * NOT for choosing an answer language. Varta's answer language comes from the
 * learner's saved English/Hindi preference (answer-language.ts), never from
 * detecting the input — the "auto"/mirror mode this used to serve is gone. The
 * one live caller is the dictionary, which routes a looked-up WORD to the right
 * dictionary API by its script.
 *
 * HONEST LIMITATION: Hindi and Sanskrit share the Devanagari script, so this
 * cannot reliably tell them apart from characters alone — `detectLanguage`
 * returns 'hi' for any Devanagari-dominant text. Distinguishing Sanskrit needs
 * morphology (sandhi/vibhakti cues) and is intentionally out of scope here;
 * callers that must know should carry an explicit language tag instead of
 * guessing. This is for routing and logging, not for anything that must be
 * exact.
 */

export type Script = 'deva' | 'latin' | 'mixed' | 'unknown';
export type LanguageTag = 'hi' | 'en' | 'unknown';

const DEVANAGARI = /[ऀ-ॿ]/g;
const LATIN = /[A-Za-z]/g;

function count(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

/**
 * Which script dominates. 'mixed' when both scripts carry real weight (>15% of
 * the alphabetic characters each) — common in code-switched Hinglish questions.
 */
export function detectScript(text: string): Script {
  if (!text) return 'unknown';
  const deva = count(text, DEVANAGARI);
  const latin = count(text, LATIN);
  const total = deva + latin;
  if (total === 0) return 'unknown';
  const devaShare = deva / total;
  const latinShare = latin / total;
  if (devaShare > 0.15 && latinShare > 0.15) return 'mixed';
  return deva >= latin ? 'deva' : 'latin';
}

/** Coarse language tag. Devanagari (or Devanagari-dominant mixed) → 'hi'. */
export function detectLanguage(text: string): LanguageTag {
  const script = detectScript(text);
  if (script === 'deva') return 'hi';
  if (script === 'latin') return 'en';
  if (script === 'mixed') {
    // Code-switched: lean to the script with more characters.
    return count(text, DEVANAGARI) >= count(text, LATIN) ? 'hi' : 'en';
  }
  return 'unknown';
}
