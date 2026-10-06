import { BadRequestException } from '@nestjs/common';
import type { SharedWork } from './shared-library.service';

/** Book languages the catalogue offers (the same codes as the Edit Metadata screen). */
export const BOOK_LANGUAGES = ['en', 'hi', 'mr', 'es', 'fr', 'de', 'ta', 'te'] as const;

const BY_NAME: Record<string, (typeof BOOK_LANGUAGES)[number]> = {
  english: 'en',
  hindi: 'hi',
  marathi: 'mr',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  tamil: 'ta',
  telugu: 'te',
};

/**
 * A shared work's language as a catalogue language code. The work stores whatever the chapter's
 * frontmatter said ("Hindi", "English", "hi"); anything unrecognised becomes English rather than
 * a value the rest of the app cannot read.
 */
export function languageCode(lang?: string | null): (typeof BOOK_LANGUAGES)[number] {
  const raw = (lang ?? '').trim().toLowerCase();
  if ((BOOK_LANGUAGES as readonly string[]).includes(raw)) return raw as (typeof BOOK_LANGUAGES)[number];
  return BY_NAME[raw] ?? 'en';
}

export interface NewBookFromWork {
  title: string;
  author: string;
  isbn: string | null;
  language: string;
}

/**
 * What a new Book Buddy book is made of when it is created from a shared work.
 *
 * The title and ISBN come from the work (the ISBN always: it is what proves the book is the work, and
 * the admin cannot edit it here). The title may be overridden, the author must be supplied because
 * the shared library does not hold one, and the language is the work's unless the admin picks another.
 * Anything that does not validate is refused with a message, never silently fixed.
 */
export function newBookFromWork(
  work: Pick<SharedWork, 'title' | 'isbn' | 'lang'>,
  input: { title?: unknown; author?: unknown; language?: unknown },
): NewBookFromWork {
  const author = typeof input.author === 'string' ? input.author.trim() : '';
  if (!author) throw new BadRequestException('The author is required: the shared library does not hold one.');
  if (author.length > 200) throw new BadRequestException('The author must be 200 characters or fewer.');

  let title = work.title;
  if (input.title !== undefined && input.title !== null && input.title !== '') {
    if (typeof input.title !== 'string') throw new BadRequestException('The title must be text.');
    title = input.title.trim();
  }
  if (!title) throw new BadRequestException('The title is required.');
  if (title.length > 300) throw new BadRequestException('The title must be 300 characters or fewer.');

  let language: string = languageCode(work.lang);
  if (input.language !== undefined && input.language !== null && input.language !== '') {
    if (typeof input.language !== 'string' || !(BOOK_LANGUAGES as readonly string[]).includes(input.language)) {
      throw new BadRequestException(`The language must be one of: ${BOOK_LANGUAGES.join(', ')}.`);
    }
    language = input.language;
  }

  return { title, author, isbn: work.isbn ?? null, language };
}
