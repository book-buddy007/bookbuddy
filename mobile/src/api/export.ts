import { apiFetch } from './client';
import type { Annotation } from './types';

/**
 * POST /export/notes — renders the given annotations as Markdown study notes.
 *
 * The annotations are sent in the body rather than fetched server-side, so the
 * export matches exactly what the reader is looking at (including any local
 * filtering) instead of re-querying and quietly including more.
 */
export function exportNotes(input: {
  bookId: string;
  bookTitle: string;
  annotations: Annotation[];
}) {
  return apiFetch<{ markdown?: string; content?: string; filename?: string }>(
    '/export/notes',
    { method: 'POST', body: input },
  );
}
