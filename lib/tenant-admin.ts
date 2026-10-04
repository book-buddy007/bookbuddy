/**
 * Client for an institution's admin endpoints (`/api/tenant-admin/...`): dashboard overview,
 * overdue loans and reminders, analytics and borrowing policies. Calls go through the Next
 * proxy, which attaches the session; the backend checks the caller administers the institution.
 */

export interface TenantOverview {
  members: { total: number; active: number; suspended: number; pending: number };
  books: { titles: number; copies: number; availableCopies: number };
  loans: { active: number; overdue: number; dueSoon: number; returnedLast30Days: number };
}

export interface OverdueItem {
  id: string;
  title: string;
  borrower: { id: string; name: string; email: string };
  dueDate: string;
  daysOverdue: number;
  fine: number;
  remindersSent: number;
  lastReminderAt: string | null;
}

export interface OverdueResponse {
  items: OverdueItem[];
  truncated: boolean;
  summary: { count: number; totalFines: number; averageDaysOverdue: number; withoutReminders: number };
}

export interface ReminderResult {
  sent: number;
  skipped: { id: string; reason: string }[];
  failed: string[];
}

export type AnalyticsRange = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface AnalyticsResponse {
  range: AnalyticsRange;
  borrowingTrends: { label: string; physical: number; ebook: number; audiobook: number }[];
  overdueDistribution: { name: string; value: number }[];
  engagement: { day: string; readers: number; pages: number }[];
  totals: { loans: number; activeReaders: number; truncated: boolean };
}

export interface BorrowingPolicies {
  limits: { student: number; teacher: number; maxRenewals: number };
  fines: { enabled: boolean; dailyRate: number; gracePeriod: number; maxFine: number };
  periods: { book: number; ebook: number; audiobook: number };
}

export interface PoliciesResponse {
  policies: BorrowingPolicies;
  isDefault: boolean;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.message || body?.error || `Request failed (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join('. ') : message);
  }
  return body as T;
}

const base = (tenantId: string) => `/api/tenant-admin/${encodeURIComponent(tenantId)}`;
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const fetchOverview = (tenantId: string, signal?: AbortSignal) =>
  request<TenantOverview>(`${base(tenantId)}/overview`, { signal });

export const fetchOverdue = (tenantId: string, signal?: AbortSignal) =>
  request<OverdueResponse>(`${base(tenantId)}/overdue`, { signal });

export const sendOverdueReminders = (tenantId: string, loanIds: string[]) =>
  request<ReminderResult>(`${base(tenantId)}/overdue/remind`, json('POST', { loanIds }));

export const fetchAnalytics = (tenantId: string, range: AnalyticsRange, signal?: AbortSignal) =>
  request<AnalyticsResponse>(`${base(tenantId)}/analytics?range=${range}`, { signal });

export const fetchPolicies = (tenantId: string, signal?: AbortSignal) =>
  request<PoliciesResponse>(`${base(tenantId)}/policies`, { signal });

export const savePolicies = (tenantId: string, policies: BorrowingPolicies) =>
  request<PoliciesResponse>(`${base(tenantId)}/policies`, json('PUT', policies));

export type ReportType = 'circulation' | 'users' | 'overdue' | 'fines';

/** Downloads a CSV report and returns its filename. Throws the server's message on failure. */
export async function downloadReport(
  tenantId: string,
  type: ReportType,
  range?: { from?: string; to?: string },
): Promise<string> {
  const params = new URLSearchParams();
  if (range?.from) params.set('from', range.from);
  if (range?.to) params.set('to', range.to);
  const qs = params.toString();

  const res = await fetch(`${base(tenantId)}/reports/${type}${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.message || body?.error || `Request failed (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join('. ') : message);
  }

  const disposition = res.headers.get('content-disposition') ?? '';
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `${type}.csv`;

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}
