import { apiFetch } from './client';

export interface ProgressSyncPayload {
  bookId: string;
  currentPage?: number;
  totalPagesRead?: number;
  timeSpentSeconds?: number;
  wordsRead?: number;
  percentComplete?: number;
  bookmarks?: any[];
  readerSettings?: Record<string, any>;
}

export interface ReadingProgressRecord {
  id: string;
  userId: string;
  bookId: string;
  currentPage: number;
  totalPagesRead: number;
  timeSpentSeconds: number;
  percentComplete: number;
  bookmarks: any[];
  readerSettings: Record<string, any>;
  lastReadAt: string;
}

/**
 * PATCH /reader/sync — Synchronize reading position, bookmarks, and time spent.
 *
 * `body` is passed as an object, not a JSON string: apiFetch serialises it
 * itself, so pre-stringifying sent a quoted string literal as the request body
 * and the server never saw the fields.
 */
export function syncProgress(payload: ProgressSyncPayload) {
  return apiFetch<ReadingProgressRecord>('/reader/sync', {
    method: 'PATCH',
    body: payload,
  });
}

/** GET /reader/sync/:bookId — Retrieve saved reading progress for a book */
export function getProgress(bookId: string) {
  return apiFetch<ReadingProgressRecord>(`/reader/sync/${bookId}`);
}

export interface BookSearchHit {
  pageNumber?: number;
  page?: number;
  snippet?: string;
  content?: string;
  [key: string]: unknown;
}

/** GET /reader/books/:bookId/search?q= — full-text search within a book. */
export function searchBook(bookId: string, query: string) {
  return apiFetch<BookSearchHit[]>(
    `/reader/books/${bookId}/search?q=${encodeURIComponent(query)}`,
  );
}
