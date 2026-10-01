import { apiFetch } from './client';
import type { VocabularyEntry, WordLookup } from './types';

/**
 * GET /dictionary/lookup?word= — the combined lookup used by tap-to-define.
 *
 * Server-side this merges a definition, a Hindi translation and a Wikipedia
 * extract, cached in `WordCache`. One call is enough for the lookup sheet;
 * `define` and `wiki` exist for the individual sources.
 */
export function lookupWord(word: string) {
  return apiFetch<WordLookup | null>(
    `/dictionary/lookup?word=${encodeURIComponent(word)}`,
  );
}

export function defineWord(word: string) {
  return apiFetch<WordLookup | null>(
    `/dictionary/define?word=${encodeURIComponent(word)}`,
  );
}

export function getWikiExtract(query: string) {
  return apiFetch<{ extract?: string; url?: string } | null>(
    `/dictionary/wiki?q=${encodeURIComponent(query)}`,
  );
}

export interface SaveVocabularyInput {
  word: string;
  bookId?: string;
  definition?: string;
  context?: string;
}

/** POST /dictionary/vocabulary — save a word to the personal word list. */
export function saveVocabulary(input: SaveVocabularyInput) {
  return apiFetch<VocabularyEntry>('/dictionary/vocabulary', {
    method: 'POST',
    body: input,
  });
}

/** GET /dictionary/vocabulary — the saved word list, optionally per book. */
export function getVocabulary(bookId?: string) {
  const query = bookId ? `?bookId=${encodeURIComponent(bookId)}` : '';
  return apiFetch<VocabularyEntry[]>(`/dictionary/vocabulary${query}`);
}
