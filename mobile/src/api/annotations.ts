import { apiFetch } from './client';
import type { Annotation, AnnotationInput } from './types';

/**
 * Highlights, notes and bookmarks.
 *
 * `GET /annotations/book/:bookId` returns the reader's own annotations plus any
 * a classmate has shared, so the list is not purely personal.
 */
export function getAnnotations(bookId: string) {
  return apiFetch<Annotation[]>(`/annotations/book/${bookId}`);
}

/**
 * POST /annotations — create or update.
 *
 * The backend upserts on `id`, and expects the client to supply one when
 * creating so the record can be reconciled offline. Omitting `id` on a new
 * annotation makes every create collide on the same placeholder row.
 */
export function upsertAnnotation(input: AnnotationInput) {
  return apiFetch<Annotation>('/annotations', {
    method: 'POST',
    body: input,
  });
}

export function deleteAnnotation(id: string) {
  return apiFetch<{ success?: boolean }>(`/annotations/${id}`, {
    method: 'DELETE',
  });
}
