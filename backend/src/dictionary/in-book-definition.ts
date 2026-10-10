/**
 * "What does THIS book say about it?": finds the sentence in a book's own text that defines a term, or
 * failing that where it is used. Pure text work over passages already read from the book's index, so it
 * needs no AI call and cannot invent anything: every word it returns is the book's.
 *
 * A textbook defines its terms once, usually in bold, in a sentence like "Demand is the quantity of a good
 * that ...". A generic dictionary gives the everyday sense (or none, for a term of art); this gives the
 * sense the student is being taught, with the page to read it on.
 */

export interface BookPassage {
  text: string;
  /** Printed page the passage starts on, as citations use it. */
  page: number | null;
  chapter: string | null;
}

export interface InBookResult {
  term: string;
  /** 'definition' when a sentence reads like one; otherwise 'mention', the best sentence that uses the term. */
  kind: 'definition' | 'mention';
  text: string;
  page: number | null;
  chapter: string | null;
  /** How many passages use the term, and the first few pages they are on (ascending). */
  occurrences: number;
  pages: number[];
}

/** A selection longer than this is a sentence, not a term: nothing to look up. */
export const MAX_TERM_WORDS = 6;
export const MAX_TERM_CHARS = 60;
const MAX_SNIPPET_CHARS = 520;
const MAX_PAGES_LISTED = 8;
/** A sentence must score at least this to be called a definition rather than a mention. */
const DEFINITION_SCORE = 6;

/** Lower-cased, punctuation-trimmed, single-spaced. Null when it cannot be a term. */
export function normalizeTerm(raw: string): string | null {
  const t = (raw ?? '')
    .normalize('NFC')
    .replace(/^[\s"'“”‘’(\[{.,;:!?-]+|[\s"'“”‘’)\]}.,;:!?-]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
  if (t.length < 2 || t.length > MAX_TERM_CHARS) return null;
  if (t.split(' ').length > MAX_TERM_WORDS) return null;
  return t;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The term as a regular-expression source, matching whole words only ("tax" is not in "taxi") and, for
 * Latin-script terms, common English endings ("market" finds "markets"). Devanagari terms match exactly:
 * their endings are different and a wrong guess would find the wrong word.
 */
function termSource(term: string): string {
  const body = term.split(' ').map(escapeRe).join('\\s+');
  const latin = /^[\x00-\x7f]+$/.test(term);
  return `(?<![\\p{L}\\p{M}\\p{N}])${body}${latin ? '(?:s|es|ed|d|ing)?' : ''}(?![\\p{L}\\p{M}\\p{N}])`;
}

/** Markdown the index keeps in a passage, removed for display (bold is read first, for scoring). */
function plain(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, '$1$2')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*>]\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sentences of a passage, raw (markdown intact) so bold terms can still be seen. */
function sentences(text: string): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    for (const s of para.split(/(?<=[.!?।])\s+/)) {
      const t = s.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

function scoreSentence(raw: string, T: string, indexInPassage: number): number {
  const s = plain(raw);
  let score = 1;
  const re = (src: string) => new RegExp(src, 'iu');

  // The term has to be what the sentence is ABOUT. "The layer of the atmosphere is known as the exosphere" defines the
  // exosphere, not the atmosphere: a term deep inside a sentence is not its subject, so only the first few words count.
  const SUBJECT = '^(?:\\S+\\s+){0,4}?';
  // What may follow a term that has just been named ("... is known as <term>"): the end of the phrase, not more
  // of a longer name ("known as market demand" does not define "market").
  const ENDS = '(?=\\s*(?:["”\'’)*_]|[.,;:!?]|$|\\s(?:by|in|and|or|when|if|as|because|which|that|to|of|for|is|are|means|where|while|since|from)\\b))';

  // "<term> is a/an/the ...", "<term> means / refers to / is defined as / is called ...". ("is one of" is a statement, not a definition.)
  if (re(`${SUBJECT}${T}\\s*(?:\\([^)]{0,40}\\)\\s*)?(?:(?:is|are)\\s+(?:a|an|the|that|when|where|any|those|these|defined|called|known|said|termed)|means|refers?\\s+to|denotes|can\\s+be\\s+defined\\s+as)\\b`).test(s)) score += 6;
  // "... called/known as/termed/defined as [the] <term>", "the term <term>"
  if (re(`(?:called|known\\s+as|termed|defined\\s+as|referred\\s+to\\s+as|the\\s+term|so-called|what\\s+we\\s+call)\\s+(?:the\\s+|a\\s+|an\\s+)?["“'‘]?(?:\\*\\*|__)?${T}${ENDS}`).test(s)) score += 5;
  // "<term>: ..." / "<term> — ..." at the start: a glossary-style line.
  if (re(`^["“'‘]?${T}\\s*[:–—-]\\s+\\S`).test(s)) score += 5;
  // Devanagari: "<term> वह ... है", "... कहलाता है", "<term> का अर्थ".
  if (re(`${T}\\s*(?:वह|एक|का\\s+अर्थ|कहलाता|कहलाती|कहलाते|कहते\\s+हैं)`).test(s) || (re(`${T}\\s+(?:है|हैं)\\b`).test(s) && /[\u0900-\u097F]/.test(s))) score += 4;
  // Textbooks set the term being defined in bold (or italics).
  if (re(`(?:\\*\\*|__|\\*|_)${T}(?:\\*\\*|__|\\*|_)`).test(raw)) score += 3;
  if (indexInPassage <= 1) score += 1;
  if (/\?\s*$/.test(s)) score -= 4;
  if (s.length > 420) score -= 2;
  if (s.length < 25) score -= 2;
  // A heading ("Composition and Structure of the Atmosphere") is a title, not something the book says about the term.
  if (!/[.!?।:"”'’)]\s*$/.test(s)) score -= 2;
  // A figure or table caption ("4.18 — Timeline showing ...") labels a picture; it is not the book explaining the term.
  if (/^(?:fig(?:ure)?\.?\s*|table\s*)?\d+(?:\.\d+)*\s*[—–.:-]/i.test(s)) score -= 3;
  // A sentence that starts in lower case is the tail of one cut at a passage boundary: not a statement to show.
  if (/^\p{Ll}/u.test(s)) score -= 3;
  return score;
}

/**
 * The best place in the book that explains `rawTerm`, or null when the book never uses it (or the
 * selection is not a term). Ties go to the earlier page: a book defines a term before it uses it.
 */
export function findInBookDefinition(passages: BookPassage[], rawTerm: string): InBookResult | null {
  const term = normalizeTerm(rawTerm);
  if (!term) return null;
  const T = termSource(term);
  const has = new RegExp(T, 'iu');

  type Best = { score: number; page: number | null; chapter: string | null; text: string; next: string | null };
  // Held in an object: TypeScript does not follow a plain `let` reassigned inside a loop.
  const found: { best: Best | null } = { best: null };
  let occurrences = 0;
  const pages = new Set<number>();

  for (const p of passages) {
    if (!p.text || !has.test(p.text)) continue;
    occurrences += 1;
    if (p.page != null) pages.add(p.page);
    const sents = sentences(p.text);
    for (let i = 0; i < sents.length; i++) {
      const raw = sents[i];
      if (!has.test(plain(raw))) continue;
      const score = scoreSentence(raw, T, i);
      const current = found.best;
      if (!current || score > current.score || (score === current.score && (p.page ?? Infinity) < (current.page ?? Infinity))) {
        found.best = { score, page: p.page, chapter: p.chapter, text: plain(raw), next: sents[i + 1] ? plain(sents[i + 1]) : null };
      }
    }
  }

  const b = found.best;
  if (!b) return null;
  let text = b.text;
  // A short lead-in ("Demand is defined as:") reads better with the sentence that completes it.
  if (b.next && (text.length < 60 || /:$/.test(text))) text = `${text} ${b.next}`;
  if (text.length > MAX_SNIPPET_CHARS) text = `${text.slice(0, MAX_SNIPPET_CHARS - 1).trimEnd()}…`;

  return {
    term,
    kind: b.score >= DEFINITION_SCORE ? 'definition' : 'mention',
    text,
    page: b.page,
    chapter: b.chapter,
    occurrences,
    pages: [...pages].sort((a, c) => a - c).slice(0, MAX_PAGES_LISTED),
  };
}
