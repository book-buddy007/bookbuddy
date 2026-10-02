import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ILlmProvider,
  LLM_PROVIDER,
} from '../rag/interfaces/llm.provider.interface';
import {
  AnswerLanguage,
  bookAnswerLanguage,
  contentLanguageDirective,
  DEFAULT_ANSWER_LANGUAGE,
} from '../common/language/answer-language';

/**
 * The two things a student can ask for AFTER answering a question: why that
 * answer is right, and the same thing in the other language.
 *
 * Modelled on DigiClassroom's AnswerActionButtons, with its two load-bearing
 * decisions kept:
 *
 *   TRANSLATION IS BIDIRECTIONAL, NOT "TO HINDI". DCP picks the target from
 *   the student's enrolled medium — English medium translates to Hindi, Hindi
 *   medium translates to English — so the button always means "give me the
 *   other language" rather than assuming which one the reader lacks. Book Buddy has
 *   no per-user medium field, so the source is taken from the BOOK's language
 *   instead. Same intent, no schema change.
 *
 *   SCRIPT MIXING, NOT PURE TRANSLATION. DCP asks for `devanagari-mixed`
 *   output going into Hindi. A textbook term rendered into unfamiliar Hindi is
 *   less useful than the English term the student will meet in the exam, so
 *   technical vocabulary is kept and the explanation around it is translated.
 *
 * Results are cached in process and keyed by item, because the explanation for
 * a question is the same for every student who gets it wrong. The second
 * student to miss it pays nothing.
 *
 * Not persisted: storing these needs two new columns on QuizItem, which means
 * a migration against the production database. Worth doing once this is proven
 * in use; until then a cold start costs one call per item, not per student.
 */

const MAX_CACHE_ENTRIES = 1000;

export interface TranslationResult {
  text: string;
  targetLanguage: string;
  /** Bilingual header, e.g. "Translation (Hindi — हिंदी)". DCP labels the
      target in both scripts so it is readable to whichever side you speak. */
  label: string;
}

@Injectable()
export class QuizAssistService {
  private readonly logger = new Logger(QuizAssistService.name);
  private readonly explanations = new Map<string, string>();
  private readonly translations = new Map<string, TranslationResult>();

  constructor(@Inject(LLM_PROVIDER) private llmProvider: ILlmProvider) {}

  private async complete(prompt: string): Promise<string> {
    let full = '';
    await this.llmProvider.chatStream(
      [{ role: 'user', content: prompt }],
      (t) => {
        full += t;
      },
    );
    return full.trim();
  }

  private remember<T>(store: Map<string, T>, key: string, value: T): T {
    store.set(key, value);
    if (store.size > MAX_CACHE_ENTRIES) {
      const oldest = store.keys().next();
      if (!oldest.done) store.delete(oldest.value);
    }
    return value;
  }

  /**
   * Why the correct option is correct — the moment the question becomes
   * teaching rather than testing.
   *
   * Deliberately explains the WRONG options too. "B is right" tells a student
   * nothing about the misconception that made them pick C, which is the thing
   * they actually need to unlearn.
   */
  async explain(
    item: {
      id: string;
      prompt: string;
      answer: string;
      choices: unknown;
      citedPage?: number | null;
    },
    language: AnswerLanguage = DEFAULT_ANSWER_LANGUAGE,
  ): Promise<string> {
    // Cache key carries the language: the same item explained in Hindi is not
    // the same string as the English explanation, and this map is shared by
    // every reader of the book.
    const cacheKey = `${item.id}|${language}`;
    const cached = this.explanations.get(cacheKey);
    if (cached) return cached;

    const options = Array.isArray(item.choices)
      ? (item.choices as string[])
      : [];
    const prompt =
      `A student just answered this multiple-choice question from their textbook.\n\n` +
      `Question: ${item.prompt}\n` +
      `Options: ${options.join(' | ')}\n` +
      `Correct answer: ${item.answer}\n\n` +
      `In 2-3 short sentences, explain why the correct answer is correct, and briefly why the ` +
      `most tempting wrong option is wrong. Address the student directly and plainly. ` +
      `Do not repeat the question, do not use headings, and do not add a preamble. ` +
      // Named target, never "the language of the question": an item that
      // somehow slipped through in another language must not drag its
      // explanation along with it.
      contentLanguageDirective(language) +
      (item.citedPage ? ` The passage is on page ${item.citedPage}.` : '');

    try {
      const text = await this.complete(prompt);
      return this.remember(this.explanations, cacheKey, text);
    } catch (e: any) {
      this.logger.warn(`Explanation failed for item ${item.id}: ${e.message}`);
      throw e;
    }
  }

  /**
   * The generated text in the other language.
   *
   * `sourceLanguage` is the book's language; anything that is not clearly
   * Hindi is treated as English, since the alternative — guessing wrongly and
   * translating Hindi into Hindi — produces a button that appears broken.
   */
  async translate(
    cacheKey: string,
    text: string,
    sourceLanguage?: string | null,
  ): Promise<TranslationResult> {
    // Was an inline `startsWith('hind')`, which every production row fails:
    // Book.language holds ISO codes ('en'), so a Hindi book catalogued as 'hi'
    // read as an English source and this button "translated" Hindi into Hindi —
    // exactly the appears-broken outcome the comment above warns about. One
    // shared resolver now decides this for every surface.
    const isHindiSource = bookAnswerLanguage(sourceLanguage) === 'hi';
    const targetLanguage = isHindiSource ? 'English' : 'Hindi';
    const key = `${cacheKey}|${targetLanguage}`;

    const cached = this.translations.get(key);
    if (cached) return cached;

    const prompt = isHindiSource
      ? `Translate the following into clear English for a school student. Keep technical terms ` +
        `recognisable rather than over-translating them. Return ONLY the translation, with no ` +
        `preamble and no notes.\n\n${text}`
      : // Devanagari-mixed, per DCP's strategy: the student will meet the English
        // term in their exam, so replacing it with an unfamiliar Hindi coinage
        // makes the translation less useful, not more.
        `Translate the following into simple Hindi (Devanagari script) for a school student. ` +
        `KEEP established technical and academic terms in English inside the Hindi sentences ` +
        `rather than coining unfamiliar Hindi equivalents — the student will meet the English ` +
        `terms in their exam. Return ONLY the translation, with no preamble and no notes.\n\n${text}`;

    const translated = await this.complete(prompt);
    const label =
      targetLanguage === 'Hindi'
        ? 'Translation (Hindi — हिंदी)'
        : 'Translation (English — अंग्रेज़ी)';

    return this.remember(this.translations, key, {
      text: translated,
      targetLanguage,
      label,
    });
  }
}
