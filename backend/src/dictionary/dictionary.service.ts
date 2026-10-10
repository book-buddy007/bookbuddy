import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { detectLanguage } from '../common/language/script-detect';

/**
 * Phase 3 — a multilingual dictionary. The word being looked up comes from the
 * book the student is reading, so it is NOT always English: a Hindi or Sanskrit
 * textbook yields Devanagari words. The service was hardwired to the English
 * path (English monolingual dictionary, en→hi translation, en.wikipedia), so a
 * Devanagari word failed on all three and produced "No definitions found".
 *
 * We route by the WORD's script (script-detect.ts), not by any answer-language
 * preference:
 *   - Latin/English word  → English dictionary + en→hi translation + en.wikipedia
 *   - Devanagari word      → (no free Hindi monolingual dict) + hi→en translation
 *                            + hi.wikipedia
 *
 * The `hindiTranslation` cache column now holds "the translation" generically —
 * Hindi for an English word, English for a Hindi word. Its target language is
 * DERIVED from the source word's script at return time (`translationLang`), so
 * this ships with no WordCache migration; a cache hit re-derives the same way.
 *
 * Sanskrit shares Devanagari with Hindi and cannot be told apart by script
 * (see script-detect.ts), so a Sanskrit word is treated as Hindi here — the
 * translation/Wikipedia hosts are the closest freely available. Best-effort and
 * documented, not exact.
 */
type WordLang = 'en' | 'hi';

/** Longest wait for the main dictionary (it answers in well under a second when it is up). */
const PRIMARY_TIMEOUT_MS = Number(process.env.DICTIONARY_PRIMARY_TIMEOUT_MS) || 1500;
/** Longest wait for any other outside service. */
const SOURCE_TIMEOUT_MS = Number(process.env.DICTIONARY_TIMEOUT_MS) || 2500;
/** How soon a cached word that has no definition is given another try. */
const DEFINITION_RETRY_MS = 10 * 60_000;
/** Wikimedia asks API clients to identify themselves. */
const USER_AGENT = 'BookBuddy/1.0 (https://bookbuddy.live; reader dictionary)';

/** Plain text from the small HTML Wiktionary returns. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

/**
 * Wiktionary writes a sense as a lead-in with a nested list ("Rule by the people, such as: <ol><li>...</li></ol>").
 * The lead-in is the definition; when it only introduces the list, the first item completes it.
 */
function wiktionaryText(html: string): string {
  const head = stripHtml(html.split(/<ol|<ul/i)[0]);
  const firstItem = /<li[^>]*>([\s\S]*?)<\/li>/i.exec(html)?.[1];
  const text = (!head || /[:,]$/.test(head)) && firstItem ? `${head} ${stripHtml(firstItem)}`.trim() : head;
  return text.length > 400 ? `${text.slice(0, 399).trimEnd()}…` : text;
}

@Injectable()
export class DictionaryService {
  private readonly logger = new Logger(DictionaryService.name);

  constructor(private prisma: PrismaService) {}

  /** The word's language for routing. Unknown/empty falls back to English —
      the richest APIs, and most content is English. */
  private wordLang(word: string): WordLang {
    return detectLanguage(word) === 'hi' ? 'hi' : 'en';
  }

  /** The translation TARGET is the other language from the source word. */
  private translationTarget(source: WordLang): WordLang {
    return source === 'en' ? 'hi' : 'en';
  }

  /**
   * One request to an outside service, never allowed to hold the student up. The three lookups run together,
   * so the slowest sets how long Define takes: api.dictionaryapi.dev went down and answered HTTP 522 only after
   * about 20 seconds, which made every new word take that long. A source that is slow or down now costs at most
   * its timeout, and the others carry the answer.
   */
  private async getJson(url: string, timeoutMs: number): Promise<{ status: number; body: any } | null> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
      const body = await res.json().catch(() => null);
      return { status: res.status, body };
    } catch (error: any) {
      this.logger.warn(`Lookup source did not answer within ${timeoutMs} ms or failed (${new URL(url).host}): ${error?.message ?? error}`);
      return null;
    }
  }

  /** How big a selection is: a word or short term, a phrase, or a sentence that no word service can look up. */
  selectionKind(text: string): 'word' | 'phrase' | 'long' {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words <= 3 && text.length <= 40) return 'word';
    if (words <= 12 && text.length <= 120) return 'phrase';
    return 'long';
  }

  /** The first source: api.dictionaryapi.dev (phonetics, parts of speech, examples). Null when it has no entry or is down. */
  private async fromDictionaryApi(word: string) {
    const res = await this.getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, PRIMARY_TIMEOUT_MS);
    if (!res || res.status !== 200 || !Array.isArray(res.body) || res.body.length === 0) return null;
    return res.body;
  }

  /**
   * The second source, Wikimedia's Wiktionary, used when the first has nothing: a different, reliable host, so one
   * outage does not take the definitions away. Reshaped like the first so the caller reads one format.
   */
  private async fromWiktionary(word: string) {
    const res = await this.getJson(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`, SOURCE_TIMEOUT_MS);
    const entries = res?.status === 200 ? res.body?.en : null;
    if (!Array.isArray(entries)) return null;
    const meanings = entries
      .map((e: any) => ({
        partOfSpeech: String(e.partOfSpeech ?? '').toLowerCase() || null,
        definitions: (Array.isArray(e.definitions) ? e.definitions : [])
          .map((d: any) => ({
            definition: wiktionaryText(String(d.definition ?? '')),
            example: Array.isArray(d.examples) && d.examples[0] ? stripHtml(String(d.examples[0])) : null,
          }))
          .filter((d: any) => d.definition),
      }))
      .filter((m: any) => m.definitions.length > 0);
    return meanings.length ? [{ phonetic: null, phonetics: [], meanings }] : null;
  }

  async defineWord(word: string) {
    // Both sources are English-only. A Devanagari word has no entry in either, so don't spend the round trip
    // (and don't surface a 404 as an error): translation and Wikipedia carry it.
    if (this.wordLang(word) !== 'en') return null;
    const [primary, fallback] = await Promise.all([this.fromDictionaryApi(word), this.fromWiktionary(word)]);
    return primary ?? fallback;
  }

  /** Wikipedia extract from the language edition matching the query's script
      (hi.wikipedia for Devanagari, en.wikipedia otherwise) unless `lang` forces
      one. */
  async getWikipediaExtract(query: string, lang?: WordLang) {
    const wiki = lang ?? this.wordLang(query);
    const res = await this.getJson(
      `https://${wiki}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(query)}`,
      SOURCE_TIMEOUT_MS,
    );
    if (!res || res.status !== 200) return null;
    const pages = res.body?.query?.pages;
    if (!pages) return null;

    const firstPageId = Object.keys(pages)[0];
    if (firstPageId === '-1') return null; // Not found

    return {
      title: pages[firstPageId].title,
      extract: pages[firstPageId].extract,
      url: `https://${wiki}.wikipedia.org/wiki/${encodeURIComponent(pages[firstPageId].title)}`,
    };
  }

  /** Translate `word` between English and Hindi via MyMemory. Direction is
      explicit so a Hindi word is translated hi→en rather than being mangled by
      the old en|hi assumption. */
  async translate(word: string, from: WordLang, to: WordLang) {
    if (from === to) return null;
    const res = await this.getJson(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${from}|${to}`,
      SOURCE_TIMEOUT_MS,
    );
    if (!res || res.status !== 200) return null;
    const text = res.body?.responseData?.translatedText;
    if (!text || typeof text !== 'string') return null;
    // MyMemory answers a used-up free quota or an over-long query with HTTP 200 and a WARNING as the "translation".
    // That is not a translation, and cached it would be shown as one for good.
    const status = Number(res.body?.responseStatus);
    if ((Number.isFinite(status) && status !== 200) || /^MYMEMORY WARNING|QUERY LENGTH LIMIT|^PLEASE SELECT TWO DISTINCT LANGUAGES/i.test(text)) {
      this.logger.warn(`Translation refused by MyMemory: ${text.slice(0, 80)}`);
      return null;
    }
    return text;
  }

  /** @deprecated kept for any caller still on the English-only name; routes
      through the direction-aware `translate`. */
  async getHindiTranslation(word: string) {
    return this.translate(word, 'en', 'hi');
  }

  /** Pulls the first meaning out of a dictionary answer (either source: they share one shape). */
  private firstMeaning(dictData: any) {
    let pronunciation: string | null = null;
    let partOfSpeech: string | null = null;
    let definition: string | null = null;
    let example: string | null = null;

    if (dictData && Array.isArray(dictData) && dictData.length > 0) {
      const entry = dictData[0];
      pronunciation = entry.phonetic || (entry.phonetics && entry.phonetics.find((p: any) => p.text)?.text) || null;

      if (entry.meanings && entry.meanings.length > 0) {
        partOfSpeech = entry.meanings[0].partOfSpeech;
        if (entry.meanings[0].definitions && entry.meanings[0].definitions.length > 0) {
          definition = entry.meanings[0].definitions[0].definition;
          example = entry.meanings[0].definitions[0].example || null;
        }
      }
    }
    return { pronunciation, partOfSpeech, definition, example };
  }

  private result(
    word: string,
    sourceLang: WordLang,
    translationLang: WordLang,
    r: {
      pronunciation?: string | null;
      partOfSpeech?: string | null;
      definition?: string | null;
      example?: string | null;
      translation?: string | null;
      wikiExtract?: string | null;
      wikiUrl?: string | null;
      selection?: 'word' | 'phrase' | 'long';
      cached?: boolean;
    },
  ) {
    return {
      word,
      pronunciation: r.pronunciation ?? null,
      partOfSpeech: r.partOfSpeech ?? null,
      definition: r.definition ?? null,
      example: r.example ?? null,
      // The stored value is "the translation"; its language is derived from the word's script, so old rows stay correct.
      hindiTranslation: r.translation ?? null,
      translation: r.translation ?? null,
      sourceLang,
      translationLang,
      wikiExtract: r.wikiExtract ?? null,
      wikiUrl: r.wikiUrl ?? null,
      // 'long' and 'phrase' tell the screen why there is no dictionary entry: a sentence is not a word.
      selection: r.selection ?? 'word',
      cached: r.cached ?? false,
    };
  }

  async lookup(word: string) {
    // Latin punctuation strip + lowercase are no-ops on Devanagari (which has no
    // case), so this normalisation is safe for both scripts.
    const normalizedWord = word
      .trim()
      .replace(/[.,!?;:"'()[\]{}]/g, '')
      .toLowerCase();

    const sourceLang = this.wordLang(normalizedWord);
    const translationLang = this.translationTarget(sourceLang);

    // A sentence is not a word: sending it to a word dictionary, an encyclopaedia title search and a word
    // translator only spends the wait on certain failure. A short phrase is worth a translation; a sentence nothing.
    const kind = this.selectionKind(normalizedWord);
    if (kind === 'long') return this.result(normalizedWord, sourceLang, translationLang, { selection: 'long' });
    if (kind === 'phrase') {
      const translation = await this.translate(normalizedWord, sourceLang, translationLang);
      return this.result(normalizedWord, sourceLang, translationLang, { translation, selection: 'phrase' });
    }

    // 1. Check cache
    const cached = await this.prisma.wordCache.findUnique({
      where: { word: normalizedWord },
    });

    // Only use the cached version if it actually contains useful information
    // This prevents temporary API failures from poisoning the cache permanently
    if (cached && (cached.definition || cached.hindiTranslation || cached.wikiExtract)) {
      const fromCache = (row: typeof cached) =>
        this.result(normalizedWord, sourceLang, translationLang, {
          pronunciation: row.pronunciation,
          partOfSpeech: row.partOfSpeech,
          definition: row.definition,
          example: row.example,
          translation: row.hindiTranslation,
          wikiExtract: row.wikiExtract,
          wikiUrl: row.wikiUrl,
          cached: true,
        });

      // An English word saved WITHOUT a definition was looked up while the dictionary was down or slow. Keeping
      // it that way for good was how an outage became permanent, so the definition alone is tried again, at most
      // every ten minutes per word (`updatedAt` is touched on each try, so a word that really has no entry is not
      // retried on every lookup).
      const retry = sourceLang === 'en' && !cached.definition && Date.now() - cached.updatedAt.getTime() > DEFINITION_RETRY_MS;
      if (!retry) return fromCache(cached);

      const meaning = this.firstMeaning(await this.defineWord(normalizedWord));
      try {
        const row = await this.prisma.wordCache.update({
          where: { word: normalizedWord },
          data: meaning.definition
            ? {
                definition: meaning.definition,
                pronunciation: cached.pronunciation ?? meaning.pronunciation,
                partOfSpeech: cached.partOfSpeech ?? meaning.partOfSpeech,
                example: cached.example ?? meaning.example,
              }
            : { updatedAt: new Date() },
        });
        return fromCache(row);
      } catch (e) {
        console.error('Failed to refresh the word cache', e);
        return fromCache(cached);
      }
    }

    // 2. Fetch from APIs concurrently — each routed by the word's language, each bounded by its own timeout.
    const [dictData, wikiData, translationRes] = await Promise.all([
      this.defineWord(normalizedWord),
      this.getWikipediaExtract(normalizedWord, sourceLang),
      this.translate(normalizedWord, sourceLang, translationLang),
    ]);

    const { pronunciation, partOfSpeech, definition, example } = this.firstMeaning(dictData);
    const hindiTranslation = translationRes;
    const wikiExtract = wikiData ? wikiData.extract : null;
    const wikiUrl = wikiData ? wikiData.url : null;

    // 3. Save to cache ONLY if we have at least some useful data
    if (definition || hindiTranslation || wikiExtract) {
      try {
        await this.prisma.wordCache.upsert({
          where: { word: normalizedWord },
          // A concurrent lookup may have saved first: fill in what this one found rather than discarding it.
          update: {
            pronunciation: pronunciation ?? undefined,
            partOfSpeech: partOfSpeech ?? undefined,
            definition: definition ?? undefined,
            example: example ?? undefined,
            hindiTranslation: hindiTranslation ?? undefined,
            wikiExtract: wikiExtract ?? undefined,
            wikiUrl: wikiUrl ?? undefined,
          },
          create: {
            word: normalizedWord,
            pronunciation,
            partOfSpeech,
            definition,
            example,
            hindiTranslation,
            wikiExtract,
            wikiUrl,
          },
        });
      } catch (e) {
        console.error('Failed to save to word cache', e);
      }
    }

    return this.result(normalizedWord, sourceLang, translationLang, {
      pronunciation,
      partOfSpeech,
      definition,
      example,
      translation: hindiTranslation,
      wikiExtract,
      wikiUrl,
    });
  }

  async saveVocabulary(
    userId: string,
    tenantId: string | null,
    data: {
      word: string;
      definition?: string;
      context?: string;
      bookId?: string;
    },
  ) {
    return this.prisma.vocabularyItem.upsert({
      where: {
        userId_word: {
          userId,
          word: data.word,
        },
      },
      update: {
        definition: data.definition,
        context: data.context,
        bookId: data.bookId,
        lastReviewed: new Date(),
      },
      create: {
        userId,
        tenantId,
        word: data.word,
        definition: data.definition,
        context: data.context,
        bookId: data.bookId,
      },
    });
  }

  async getVocabulary(userId: string, bookId?: string) {
    const whereClause: any = { userId };
    if (bookId) {
      whereClause.bookId = bookId; // Optional filter by book
    }

    return this.prisma.vocabularyItem.findMany({
      where: whereClause,
      include: {
        sourceBook: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
