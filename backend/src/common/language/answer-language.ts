/**
 * The two languages this product generates in: English and Hindi. Nothing else.
 *
 * WHY the allow-list is closed, and why "auto" is gone. Every AI surface here
 * used to carry some flavour of "write in the same language as the question /
 * the passage" — an implicit mirror with no named target. That is fine while
 * the input is unambiguous prose, and it fails the moment it isn't: a quiz
 * generated from an anatomy page whose text is mostly Latin-derived labels
 * (Clavicle, Scapula, Humerus) came back entirely in ITALIAN, because "the
 * language of the passage" was genuinely underdetermined and the model picked
 * one. Nothing downstream could catch it — the structural validator checks
 * option counts and the quality gate checks factual support, neither checks
 * language. A named target language cannot drift that way.
 *
 * So: every prompt in this codebase names English or Hindi explicitly, and the
 * learner preference has exactly those two values.
 *
 *   - 'en' (default, and the value for anyone who never touched the setting)
 *   - 'hi'
 *
 * Stored in `User.metadata.answerLanguage` (a Json bucket that already holds
 * onboarding/profile scraps), so this ships with NO migration and no Prisma
 * schema change — see user-preferences.service.ts. Rows still holding the
 * retired 'auto' coerce to the default on read.
 */

export type AnswerLanguage = 'en' | 'hi';

export const ANSWER_LANGUAGES: readonly AnswerLanguage[] = ['en', 'hi'];

export const DEFAULT_ANSWER_LANGUAGE: AnswerLanguage = 'en';

export function isAnswerLanguage(x: unknown): x is AnswerLanguage {
  return typeof x === 'string' && (ANSWER_LANGUAGES as readonly string[]).includes(x);
}

/**
 * Coerce whatever is sitting in `User.metadata.answerLanguage` (untyped Json,
 * possibly absent, possibly the retired 'auto', possibly garbage from an older
 * client) into a known value. Anything unrecognised falls back to the default
 * rather than throwing — a bad stored value must never break a chat request.
 */
export function coerceAnswerLanguage(x: unknown): AnswerLanguage {
  return isAnswerLanguage(x) ? x : DEFAULT_ANSWER_LANGUAGE;
}

/** How a language is named TO THE MODEL. Naming the script matters for Hindi:
    "Hindi" alone has been answered in transliterated Latin more than once. */
export const LANGUAGE_LABEL: Record<AnswerLanguage, string> = {
  en: 'English',
  hi: 'Hindi (हिन्दी), written in the Devanagari script',
};

/**
 * The carve-out every language directive shares: forcing a language must never
 * mangle a citation, a chemical formula, or a proper noun.
 */
const PRESERVE_CLAUSE =
  `Keep quoted excerpts, technical terms, formulae, and proper nouns in their original form.`;

/**
 * The system-prompt clause that fixes the answer language for a CONVERSATION
 * (Varta). Always returns a directive — there is no "no override" case any
 * more, which is the whole point: the model is never left to choose.
 */
export function answerLanguageDirective(lang: AnswerLanguage): string {
  return (
    ` Always write your entire answer — including any "not found" message — in ` +
    `${LANGUAGE_LABEL[lang]}, regardless of the language the student writes their question in. ` +
    `Never answer in any other language. ${PRESERVE_CLAUSE}`
  );
}

/**
 * The same instruction for GENERATED CONTENT that is not a reply to a student
 * (quiz items, simplified paragraphs, explanations). Phrased around "the text
 * you produce" rather than "your answer", and it deliberately does NOT mention
 * the source passage's language — that is exactly the instruction that let the
 * Italian quiz through.
 */
export function contentLanguageDirective(lang: AnswerLanguage): string {
  return (
    `Write ALL of the text you produce in ${LANGUAGE_LABEL[lang]} — never in any other language, ` +
    `whatever language the source passage appears to be in. ${PRESERVE_CLAUSE}`
  );
}

/**
 * Which of the two languages a piece of SHARED content should be generated in.
 *
 * Shared content (the quiz item bank, a cached simplified paragraph) is keyed
 * by book/page and served to every student, so it cannot follow one student's
 * personal preference without poisoning the bank for everyone else. It follows
 * the BOOK's catalogued language instead: anything that isn't recognisably
 * Hindi generates in English, and the per-item Translate button covers the
 * other direction.
 *
 * `Book.language` is FREE TEXT and the schema comment advertises the wrong
 * shape. It says `// e.g. "English", "Hindi", "Marathi"`, but every row in
 * production actually holds an ISO code — `en`. A `startsWith('hind')` test
 * therefore reads a Hindi book catalogued as `hi` as English, which is the
 * silent-wrong-language bug this whole change exists to remove. Both spellings
 * are matched, plus a Devanagari-named language ("हिन्दी").
 */
export function bookAnswerLanguage(bookLanguage?: string | null): AnswerLanguage {
  const raw = (bookLanguage ?? '').trim().toLowerCase();
  if (raw.startsWith('hind') || raw === 'hi' || raw.startsWith('hi-') || raw === 'hin') return 'hi';
  return /[ऀ-ॿ]/.test(raw) ? 'hi' : 'en';
}

/**
 * Floor beneath the model's own refusal: what Varta says when the completion
 * comes back empty. Keyed by the learner's preference rather than by detecting
 * the question's script — the answer language no longer follows the question.
 */
export function notFoundMessage(lang: AnswerLanguage): string {
  return lang === 'hi'
    ? 'मुझे यह इस पुस्तक में नहीं मिला।'
    : "I couldn't find this in the book.";
}

/** The same floor for an explicit figure/table reference that resolved to nothing. */
export function referenceNotFoundMessage(lang: AnswerLanguage, labels: string): string {
  return lang === 'hi'
    ? `मुझे इस पुस्तक के पाठ में ${labels} का वर्णन नहीं मिला। यदि यह बिना कैप्शन वाला चित्र या आरेख है, तो पढ़ने के लिए कुछ अनुक्रमित नहीं हो सकता।`
    : `I couldn't find ${labels} described in this book's text. If it's a diagram or image without a caption, there may be nothing indexed to read from.`;
}
