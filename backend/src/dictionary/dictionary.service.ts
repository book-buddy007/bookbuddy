import { Injectable } from '@nestjs/common';
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

@Injectable()
export class DictionaryService {
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

  async defineWord(word: string) {
    // dictionaryapi.dev is English-monolingual only. A Devanagari word has no
    // entry there, so don't waste the round trip (and don't surface its 404 as
    // a spurious error) — return null and let translation + Wikipedia carry it.
    if (this.wordLang(word) !== 'en') return null;
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      );
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Dictionary API failed');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('defineWord error:', error);
      return null;
    }
  }

  /** Wikipedia extract from the language edition matching the query's script
      (hi.wikipedia for Devanagari, en.wikipedia otherwise) unless `lang` forces
      one. */
  async getWikipediaExtract(query: string, lang?: WordLang) {
    const wiki = lang ?? this.wordLang(query);
    try {
      const response = await fetch(
        `https://${wiki}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(query)}`,
      );
      if (!response.ok) throw new Error('Wikipedia API failed');
      const data = await response.json();
      const pages = data.query?.pages;
      if (!pages) return null;

      const firstPageId = Object.keys(pages)[0];
      if (firstPageId === '-1') return null; // Not found

      return {
        title: pages[firstPageId].title,
        extract: pages[firstPageId].extract,
        url: `https://${wiki}.wikipedia.org/wiki/${encodeURIComponent(pages[firstPageId].title)}`,
      };
    } catch (error) {
      console.error('getWikipediaExtract error:', error);
      return null;
    }
  }

  /** Translate `word` between English and Hindi via MyMemory. Direction is
      explicit so a Hindi word is translated hi→en rather than being mangled by
      the old en|hi assumption. */
  async translate(word: string, from: WordLang, to: WordLang) {
    if (from === to) return null;
    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${from}|${to}`,
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText as string;
      }
      return null;
    } catch (error) {
      console.error('translate error:', error);
      return null;
    }
  }

  /** @deprecated kept for any caller still on the English-only name; routes
      through the direction-aware `translate`. */
  async getHindiTranslation(word: string) {
    return this.translate(word, 'en', 'hi');
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

    // 1. Check cache
    const cached = await this.prisma.wordCache.findUnique({
      where: { word: normalizedWord },
    });

    // Only use the cached version if it actually contains useful information
    // This prevents temporary API failures from poisoning the cache permanently
    if (
      cached &&
      (cached.definition || cached.hindiTranslation || cached.wikiExtract)
    ) {
      return {
        word: cached.word,
        pronunciation: cached.pronunciation,
        partOfSpeech: cached.partOfSpeech,
        definition: cached.definition,
        example: cached.example,
        // The stored value is "the translation"; its language is re-derived
        // from the cached word's script, so old rows stay correct.
        hindiTranslation: cached.hindiTranslation,
        translation: cached.hindiTranslation,
        sourceLang,
        translationLang,
        wikiExtract: cached.wikiExtract,
        wikiUrl: cached.wikiUrl,
        cached: true,
      };
    }

    // 2. Fetch from APIs concurrently — each routed by the word's language.
    const [dictData, wikiData, translationRes] = await Promise.all([
      this.defineWord(normalizedWord),
      this.getWikipediaExtract(normalizedWord, sourceLang),
      this.translate(normalizedWord, sourceLang, translationLang),
    ]);

    let pronunciation = null;
    let partOfSpeech = null;
    let definition = null;
    let example = null;

    if (dictData && Array.isArray(dictData) && dictData.length > 0) {
      const entry = dictData[0];
      pronunciation =
        entry.phonetic ||
        (entry.phonetics && entry.phonetics.find((p) => p.text)?.text) ||
        null;

      if (entry.meanings && entry.meanings.length > 0) {
        partOfSpeech = entry.meanings[0].partOfSpeech;
        if (
          entry.meanings[0].definitions &&
          entry.meanings[0].definitions.length > 0
        ) {
          definition = entry.meanings[0].definitions[0].definition;
          example = entry.meanings[0].definitions[0].example || null;
        }
      }
    }

    const hindiTranslation = translationRes;
    const wikiExtract = wikiData ? wikiData.extract : null;
    const wikiUrl = wikiData ? wikiData.url : null;

    // 3. Save to cache ONLY if we have at least some useful data
    if (definition || hindiTranslation || wikiExtract) {
      try {
        await this.prisma.wordCache.upsert({
          where: { word: normalizedWord },
          update: {},
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

    return {
      word: normalizedWord,
      pronunciation,
      partOfSpeech,
      definition,
      example,
      hindiTranslation,
      translation: hindiTranslation,
      sourceLang,
      translationLang,
      wikiExtract,
      wikiUrl,
      cached: false,
    };
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
