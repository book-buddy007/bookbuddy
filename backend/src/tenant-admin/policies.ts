import { BadRequestException } from '@nestjs/common';

export interface BorrowingPolicies {
  limits: { student: number; teacher: number; maxRenewals: number };
  fines: { enabled: boolean; dailyRate: number; gracePeriod: number; maxFine: number };
  periods: { book: number; ebook: number; audiobook: number };
}

/** What applies until an admin saves their own. Matches the admin UI's starting values. */
export const DEFAULT_POLICIES: BorrowingPolicies = {
  limits: { student: 5, teacher: 10, maxRenewals: 2 },
  fines: { enabled: true, dailyRate: 0.5, gracePeriod: 3, maxFine: 20 },
  periods: { book: 14, ebook: 14, audiobook: 14 },
};

type Rule = { section: keyof BorrowingPolicies; field: string; min: number; max: number; integer: boolean; label: string };

const RULES: Rule[] = [
  { section: 'limits', field: 'student', min: 1, max: 100, integer: true, label: 'Student book limit' },
  { section: 'limits', field: 'teacher', min: 1, max: 100, integer: true, label: 'Teacher book limit' },
  { section: 'limits', field: 'maxRenewals', min: 0, max: 20, integer: true, label: 'Maximum renewals' },
  { section: 'fines', field: 'dailyRate', min: 0, max: 1000, integer: false, label: 'Daily fine rate' },
  { section: 'fines', field: 'gracePeriod', min: 0, max: 365, integer: true, label: 'Grace period' },
  { section: 'fines', field: 'maxFine', min: 0, max: 100000, integer: false, label: 'Maximum fine' },
  { section: 'periods', field: 'book', min: 1, max: 365, integer: true, label: 'Physical book period' },
  { section: 'periods', field: 'ebook', min: 1, max: 365, integer: true, label: 'E-book period' },
  { section: 'periods', field: 'audiobook', min: 1, max: 365, integer: true, label: 'Audiobook period' },
];

/**
 * Validates an incoming policy object and returns a clean copy. Unknown keys are dropped, and
 * every number is range-checked, so what is stored (and later used to compute fines) is always
 * well-formed. Missing fields fall back to `base`.
 */
export function normalizePolicies(
  input: unknown,
  base: BorrowingPolicies = DEFAULT_POLICIES,
): BorrowingPolicies {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new BadRequestException('Policies must be an object');
  }
  const src = input as Record<string, Record<string, unknown> | undefined>;
  const out: BorrowingPolicies = {
    limits: { ...base.limits },
    fines: { ...base.fines },
    periods: { ...base.periods },
  };
  const errors: string[] = [];

  for (const rule of RULES) {
    const raw = src[rule.section]?.[rule.field];
    if (raw === undefined) continue;
    const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`${rule.label} must be a number`);
    } else if (value < rule.min || value > rule.max) {
      errors.push(`${rule.label} must be between ${rule.min} and ${rule.max}`);
    } else if (rule.integer && !Number.isInteger(value)) {
      errors.push(`${rule.label} must be a whole number`);
    } else {
      (out[rule.section] as Record<string, number | boolean>)[rule.field] = value;
    }
  }

  const enabled = src.fines?.enabled;
  if (enabled !== undefined) {
    if (typeof enabled === 'boolean') out.fines.enabled = enabled;
    else errors.push('Fines enabled must be true or false');
  }

  if (errors.length) throw new BadRequestException(errors);
  return out;
}

/** Reads stored policies defensively: bad or partial JSON falls back to defaults rather than throwing. */
export function readStoredPolicies(stored: unknown): BorrowingPolicies {
  if (stored === null || stored === undefined) return DEFAULT_POLICIES;
  try {
    return normalizePolicies(stored);
  } catch {
    return DEFAULT_POLICIES;
  }
}

/** Fine for an item that is `daysOverdue` days late: nothing inside the grace period, capped at the maximum. */
export function calculateFine(daysOverdue: number, fines: BorrowingPolicies['fines']): number {
  if (!fines.enabled || daysOverdue <= fines.gracePeriod) return 0;
  const raw = (daysOverdue - fines.gracePeriod) * fines.dailyRate;
  return Math.round(Math.min(raw, fines.maxFine) * 100) / 100;
}

export type FormatKind = 'physical' | 'ebook' | 'audiobook';

/** Groups the free-text `Book.format` into the three kinds the UI and policies talk about. */
export function formatKind(format: string | null | undefined): FormatKind {
  const f = (format ?? '').toLowerCase();
  if (f.includes('audio')) return 'audiobook';
  if (['pdf', 'epub', 'ebook', 'mobi', 'html', 'video', 'digital'].some((k) => f.includes(k))) return 'ebook';
  return 'physical';
}
