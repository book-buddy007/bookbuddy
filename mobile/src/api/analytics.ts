import { apiFetch } from './client';
import type { AnalyticsOverview, ReadingGoal, ReadingHistoryPoint } from './types';

/** GET /analytics/overview — headline reading counters for the home screen. */
export function getOverview() {
  return apiFetch<AnalyticsOverview>('/analytics/overview');
}

/** GET /analytics/history?days=N — minutes read per day, oldest first. */
export function getReadingHistory(days = 7) {
  return apiFetch<ReadingHistoryPoint[]>(`/analytics/history?days=${days}`);
}

/**
 * GET /analytics/goals — reading goals.
 *
 * Currently returns hardcoded placeholder goals: the backend service notes
 * there is no `UserGoal` table yet and derives `progress` illustratively
 * (`totalBooks % 5`). Do not build a goals screen against this expecting real
 * user data until the model exists.
 */
export function getGoals() {
  return apiFetch<ReadingGoal[]>('/analytics/goals');
}
