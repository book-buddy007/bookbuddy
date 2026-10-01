import { apiFetch } from './client';
import type { ReadingStreak } from './types';

/**
 * GET /progress/streak — the reading streak.
 *
 * Creates the record on first call if the user has none, so this is safe to
 * fetch for a brand-new account.
 */
export function getStreak() {
  return apiFetch<ReadingStreak>('/progress/streak');
}

/** POST /progress/streak — records reading minutes and advances the streak. */
export function updateStreak(minutesRead: number) {
  return apiFetch<ReadingStreak>('/progress/streak', {
    method: 'POST',
    body: { minutesRead },
  });
}
