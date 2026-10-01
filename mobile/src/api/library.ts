import { apiFetch } from './client';
import type { BorrowedBook, SavedBook } from './types';

/**
 * The shelf endpoints. All three are scoped to the signed-in user server-side.
 *
 * Note: the backend also intends to scope these by tenant, but reads
 * `req.user.currentTenantId`, which is never assigned — so the tenant filter is
 * currently inert. That does not leak across users (the userId filter holds),
 * but a reader belonging to two institutions sees both shelves merged.
 */

/** GET /library/borrowed — currently borrowed, soonest due first. */
export function getBorrowedBooks() {
  return apiFetch<BorrowedBook[]>('/library/borrowed');
}

/** GET /library/history — the last 20 returned titles, most recent first. */
export function getBorrowHistory() {
  return apiFetch<BorrowedBook[]>('/library/history');
}

/** GET /library/saved — titles bookmarked for later. */
export function getSavedBooks() {
  return apiFetch<SavedBook[]>('/library/saved');
}
