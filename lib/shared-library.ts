/**
 * Small, pure helpers for the "Link to shared library" screen, kept apart from the component so the
 * rules that matter (when a link is allowed, how ISBNs compare) are easy to read and check.
 */
import type { SharedWork } from '@/lib/api/adminApi';

export type IsbnRelation = 'match' | 'mismatch' | 'unknown';

/** ISBNs compare without hyphens, spaces or case (the X check digit). */
export const normalizeIsbn = (v?: string | null): string => (v ?? '').replace(/[\s-]/g, '').toUpperCase();

/**
 * Whether a book and a shared work look like the same book. 'unknown' when either has no ISBN, which
 * is allowed (DigiClassroom only refuses a real disagreement); 'mismatch' blocks the link, because a
 * book linked to the wrong work answers correctly, for another book, with nothing looking wrong.
 */
export function isbnRelation(bookIsbn?: string | null, workIsbn?: string | null): IsbnRelation {
  const a = normalizeIsbn(bookIsbn);
  const b = normalizeIsbn(workIsbn);
  if (!a || !b) return 'unknown';
  return a === b ? 'match' : 'mismatch';
}

export const APP_LABELS: Record<string, string> = {
  digiclassroom: 'DigiClassroom',
  pdlms: 'PDLMS',
  vidyaverse: 'Vidyaverse',
  bookbuddy: 'Book Buddy',
};

/** The apps that already use a work, by name, for the "also used by" line. */
export const appNames = (apps: string[]): string[] => apps.map((a) => APP_LABELS[a] ?? a);

/** One line of facts about a work, skipping what is not known. */
export function describeWork(w: Pick<SharedWork, 'isbn' | 'edition' | 'pageStart' | 'pageEnd' | 'chunks'>): string {
  const parts: string[] = [];
  if (w.isbn) parts.push(`ISBN ${w.isbn}`);
  if (w.edition) parts.push(w.edition);
  if (w.pageStart != null && w.pageEnd != null) {
    parts.push(w.pageStart === w.pageEnd ? `page ${w.pageStart}` : `pages ${w.pageStart}–${w.pageEnd}`);
  }
  parts.push(`${w.chunks} passage${w.chunks === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

/** The languages the catalogue offers, as `value` (code) and `label`, matching Edit Metadata. */
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mr', label: 'Marathi' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
] as const;

/**
 * A shared work's language as one of the catalogue's codes. The work stores whatever the chapter's
 * frontmatter said ("Hindi", "English", "hi"); anything unknown is English, as on the backend.
 */
export function languageFromWork(lang?: string | null): string {
  const raw = (lang ?? '').trim().toLowerCase();
  const hit = LANGUAGE_OPTIONS.find((o) => o.value === raw || o.label.toLowerCase() === raw);
  return hit ? hit.value : 'en';
}

/** Whether Book Buddy already has a book for this work (DigiClassroom reports which apps hold one). */
export const inBookBuddy = (w: Pick<SharedWork, 'linkedApps'>): boolean => (w.linkedApps ?? []).includes('bookbuddy');

export type LinkBlock = 'already-linked' | 'isbn-mismatch' | null;

/**
 * Why a link must not be offered, or null if it may. A book already attached to a shared work is
 * never silently repointed (DigiClassroom refuses it too), and a real ISBN disagreement is refused
 * up front rather than after the job runs.
 */
export function linkBlock(
  book: { isbn?: string | null; spineContentItemId?: string | null },
  work: Pick<SharedWork, 'contentItemId' | 'isbn'>,
): LinkBlock {
  if (book.spineContentItemId) return 'already-linked';
  if (isbnRelation(book.isbn, work.isbn) === 'mismatch') return 'isbn-mismatch';
  return null;
}
