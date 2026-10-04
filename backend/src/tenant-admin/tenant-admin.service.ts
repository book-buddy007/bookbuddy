import { BadRequestException, Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { assertTenantAdmin } from '../common/tenant-admin-access';
import { CsvCell, toCsv } from './csv';
import {
  BorrowingPolicies,
  DEFAULT_POLICIES,
  calculateFine,
  formatKind,
  normalizePolicies,
  readStoredPolicies,
} from './policies';

type Actor = { id: string; role: UserRole };

const DAY_MS = 86_400_000;
const OVERDUE_ROW_CAP = 1000;
const ANALYTICS_ROW_CAP = 50_000;
const REMINDER_ACTION = 'overdue_reminder_sent';
const REMINDER_COOLDOWN_MS = DAY_MS;
const MAX_REMINDERS_PER_REQUEST = 100;

export const REPORT_TYPES = ['circulation', 'users', 'overdue', 'fines'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];
const REPORT_ROW_CAP = 50_000;
const MAX_REPORT_DAYS = 366;

export type AnalyticsRange = 'day' | 'week' | 'month' | 'quarter' | 'year';
const RANGES: AnalyticsRange[] = ['day', 'week', 'month', 'quarter', 'year'];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Calendar days between the due date and `until` (UTC), the way libraries count: due on the 3rd
 * and returned on the 5th is 2 days late, whatever the time of day. Zero or less means on time.
 */
const daysLate = (due: Date, until: Date) =>
  Math.round((Date.parse(`${dayKey(until)}T00:00:00Z`) - Date.parse(`${dayKey(due)}T00:00:00Z`)) / DAY_MS);

interface Bucket {
  label: string;
  start: Date;
  end: Date;
}

/**
 * Admin-facing numbers for one institution: dashboard overview, overdue loans (with real
 * reminder emails), usage analytics and borrowing policies. Every method first requires the
 * caller to be an admin of that institution (or a platform super-admin).
 */
@Injectable()
export class TenantAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ── Overview ────────────────────────────────────────────────────────────────

  async overview(actor: Actor, tenantId: string) {
    await this.authorise(actor, tenantId);

    const now = new Date();
    const soon = new Date(now.getTime() + 3 * DAY_MS);
    const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
    const active = { tenantId, returnedAt: null };

    const [memberGroups, books, activeLoans, overdue, dueSoon, returnedLast30] = await Promise.all([
      this.prisma.userTenantMembership.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.prisma.book.aggregate({
        where: { tenantId, deletedAt: null },
        _count: { _all: true },
        _sum: { totalCopies: true, availableCopies: true },
      }),
      this.prisma.borrowedBook.count({ where: active }),
      this.prisma.borrowedBook.count({ where: { ...active, dueDate: { lt: now } } }),
      this.prisma.borrowedBook.count({ where: { ...active, dueDate: { gte: now, lte: soon } } }),
      this.prisma.borrowedBook.count({ where: { tenantId, returnedAt: { gte: monthAgo } } }),
    ]);

    const members = Object.fromEntries(memberGroups.map((g) => [g.status, g._count._all])) as Partial<
      Record<MembershipStatus, number>
    >;

    return {
      members: {
        total: Object.values(members).reduce((a, b) => a + (b ?? 0), 0),
        active: members[MembershipStatus.ACTIVE] ?? 0,
        suspended: members[MembershipStatus.SUSPENDED] ?? 0,
        pending: members[MembershipStatus.PENDING] ?? 0,
      },
      books: {
        titles: books._count._all,
        copies: books._sum.totalCopies ?? 0,
        availableCopies: books._sum.availableCopies ?? 0,
      },
      loans: { active: activeLoans, overdue, dueSoon, returnedLast30Days: returnedLast30 },
    };
  }

  // ── Overdue ─────────────────────────────────────────────────────────────────

  async overdue(actor: Actor, tenantId: string) {
    await this.authorise(actor, tenantId);

    const now = new Date();
    const policies = await this.loadPolicies(tenantId);

    const loans = await this.prisma.borrowedBook.findMany({
      where: { tenantId, returnedAt: null, dueDate: { lt: now } },
      orderBy: { dueDate: 'asc' },
      take: OVERDUE_ROW_CAP + 1,
      include: {
        user: { select: { id: true, name: true, email: true } },
        book: { select: { id: true, title: true } },
      },
    });
    const truncated = loans.length > OVERDUE_ROW_CAP;
    const rows = truncated ? loans.slice(0, OVERDUE_ROW_CAP) : loans;

    const reminders = rows.length
      ? await this.prisma.auditLog.groupBy({
          by: ['entityId'],
          where: { tenantId, action: REMINDER_ACTION, entityId: { in: rows.map((r) => r.id) } },
          _count: { _all: true },
          _max: { createdAt: true },
        })
      : [];
    const reminderByLoan = new Map(reminders.map((r) => [r.entityId, r]));

    const items = rows.map((loan) => {
      const days = Math.max(1, daysLate(loan.dueDate, now));
      const reminder = reminderByLoan.get(loan.id);
      return {
        id: loan.id,
        title: loan.book.title,
        borrower: {
          id: loan.user.id,
          name: loan.user.name ?? loan.user.email,
          email: loan.user.email,
        },
        dueDate: loan.dueDate,
        daysOverdue: days,
        fine: calculateFine(days, policies.fines),
        remindersSent: reminder?._count._all ?? 0,
        lastReminderAt: reminder?._max.createdAt ?? null,
      };
    });

    const totalFines = items.reduce((sum, i) => sum + i.fine, 0);
    return {
      items,
      truncated,
      summary: {
        count: items.length,
        totalFines: Math.round(totalFines * 100) / 100,
        averageDaysOverdue: items.length
          ? Math.round(items.reduce((s, i) => s + i.daysOverdue, 0) / items.length)
          : 0,
        withoutReminders: items.filter((i) => i.remindersSent === 0).length,
      },
    };
  }

  /**
   * Emails borrowers about overdue loans. A loan reminded in the last 24 hours is skipped, so
   * a double click can't spam someone. Each delivered email is recorded in the audit log,
   * which is also what the overdue list counts as "reminders sent".
   */
  async sendReminders(actor: Actor, tenantId: string, loanIds: unknown) {
    await this.authorise(actor, tenantId);

    if (!Array.isArray(loanIds) || loanIds.some((id) => typeof id !== 'string')) {
      throw new BadRequestException('loanIds must be an array of ids');
    }
    const ids = [...new Set(loanIds as string[])];
    if (ids.length === 0) throw new BadRequestException('Select at least one loan');
    if (ids.length > MAX_REMINDERS_PER_REQUEST) {
      throw new BadRequestException(`At most ${MAX_REMINDERS_PER_REQUEST} reminders per request`);
    }

    const now = new Date();
    const [policies, tenant, loans, recent] = await Promise.all([
      this.loadPolicies(tenantId),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      this.prisma.borrowedBook.findMany({
        where: { id: { in: ids }, tenantId, returnedAt: null, dueDate: { lt: now } },
        include: {
          user: { select: { name: true, email: true } },
          book: { select: { title: true } },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          action: REMINDER_ACTION,
          entityId: { in: ids },
          createdAt: { gte: new Date(now.getTime() - REMINDER_COOLDOWN_MS) },
        },
        select: { entityId: true },
      }),
    ]);

    const loanById = new Map(loans.map((l) => [l.id, l]));
    const recentlyReminded = new Set(recent.map((r) => r.entityId));
    const skipped: { id: string; reason: string }[] = [];
    const failed: string[] = [];
    let sent = 0;

    const toSend = ids.filter((id) => {
      if (!loanById.has(id)) {
        skipped.push({ id, reason: 'Not found, returned, or not overdue' });
        return false;
      }
      if (recentlyReminded.has(id)) {
        skipped.push({ id, reason: 'Already reminded in the last 24 hours' });
        return false;
      }
      return true;
    });

    // Small batches: fast enough for a full page of loans without hammering the provider.
    for (let i = 0; i < toSend.length; i += 10) {
      await Promise.all(
        toSend.slice(i, i + 10).map(async (id) => {
          const loan = loanById.get(id)!;
          const days = Math.max(1, daysLate(loan.dueDate, now));
          const delivered = await this.email.sendOverdueReminderEmail(loan.user.email, {
            userName: loan.user.name ?? 'Reader',
            bookTitle: loan.book.title,
            institutionName: tenant?.name ?? 'your institution',
            dueDate: loan.dueDate,
            daysOverdue: days,
            fine: calculateFine(days, policies.fines),
          });
          if (!delivered) {
            failed.push(id);
            return;
          }
          sent += 1;
          await this.prisma.auditLog.create({
            data: {
              userId: actor.id,
              tenantId,
              action: REMINDER_ACTION,
              entityType: 'borrowed_book',
              entityId: id,
              metadata: { to: loan.user.email, daysOverdue: days },
            },
          });
        }),
      );
    }

    return { sent, skipped, failed };
  }

  // ── Reports ─────────────────────────────────────────────────────────────────

  /**
   * A CSV export. `circulation` covers loans borrowed between `from` and `to` (default: the last
   * 30 days, at most a year); the other reports are a snapshot of now. Fines are what has
   * accrued under the institution's policy: payments are not tracked, so nothing is "collected".
   */
  async report(actor: Actor, tenantId: string, typeInput: string, from?: string, to?: string) {
    await this.authorise(actor, tenantId);

    if (!REPORT_TYPES.includes(typeInput as ReportType)) {
      throw new BadRequestException(`type must be one of: ${REPORT_TYPES.join(', ')}`);
    }
    const type = typeInput as ReportType;
    const now = new Date();
    let rows: CsvCell[][];

    if (type === 'circulation') {
      const { start, end } = this.parseReportRange(from, to, now);
      const loans = await this.prisma.borrowedBook.findMany({
        where: { tenantId, borrowedAt: { gte: start, lt: end } },
        orderBy: { borrowedAt: 'desc' },
        take: REPORT_ROW_CAP,
        include: {
          user: { select: { name: true, email: true } },
          book: { select: { title: true, format: true } },
        },
      });
      rows = [
        ['Borrowed', 'Title', 'Type', 'Borrower', 'Email', 'Due', 'Returned', 'Days late'],
        ...loans.map((l) => {
          const late = daysLate(l.dueDate, l.returnedAt ?? now);
          return [
            l.borrowedAt, l.book.title, formatKind(l.book.format), l.user.name ?? l.user.email,
            l.user.email, l.dueDate, l.returnedAt, Math.max(0, late),
          ];
        }),
      ];
    } else if (type === 'users') {
      const members = await this.prisma.userTenantMembership.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
        take: REPORT_ROW_CAP,
        include: { user: { select: { name: true, email: true, lastLoginAt: true } } },
      });
      rows = [
        ['Name', 'Email', 'Role', 'Status', 'Joined', 'Last sign-in'],
        ...members.map((m) => [
          m.user.name ?? m.user.email, m.user.email, m.role, m.status, m.createdAt, m.user.lastLoginAt,
        ]),
      ];
    } else {
      const { items } = await this.overdue(actor, tenantId);
      if (type === 'overdue') {
        rows = [
          ['Title', 'Borrower', 'Email', 'Due', 'Days overdue', 'Fine', 'Reminders sent'],
          ...items.map((i) => [
            i.title, i.borrower.name, i.borrower.email, i.dueDate, i.daysOverdue, i.fine, i.remindersSent,
          ]),
        ];
      } else {
        rows = [
          ['Borrower', 'Email', 'Title', 'Days overdue', 'Fine accrued'],
          ...items
            .filter((i) => i.fine > 0)
            .sort((a, b) => b.fine - a.fine)
            .map((i) => [i.borrower.name, i.borrower.email, i.title, i.daysOverdue, i.fine]),
        ];
      }
    }

    await this.prisma.auditLog.create({
      data: {
        userId: actor.id,
        tenantId,
        action: 'report_generated',
        entityType: 'tenant',
        entityId: tenantId,
        metadata: { type, rows: rows.length - 1 },
      },
    });

    return { filename: `${type}-${dayKey(now)}.csv`, csv: toCsv(rows) };
  }

  private parseReportRange(from: string | undefined, to: string | undefined, now: Date) {
    const parse = (value: string | undefined, label: string) => {
      if (value === undefined || value === '') return undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
        throw new BadRequestException(`${label} must be a date like 2026-01-31`);
      }
      return Date.parse(`${value}T00:00:00Z`);
    };
    const fromMs = parse(from, 'from');
    const toMs = parse(to, 'to');

    // `to` is inclusive, so the window ends at the start of the following day.
    const end = toMs !== undefined ? toMs + DAY_MS : now.getTime();
    const start = fromMs ?? end - 30 * DAY_MS;
    if (start >= end) throw new BadRequestException('from must be before to');
    if (end - start > MAX_REPORT_DAYS * DAY_MS) {
      throw new BadRequestException(`Choose a range of at most ${MAX_REPORT_DAYS} days`);
    }
    return { start: new Date(start), end: new Date(end) };
  }

  // ── Analytics ───────────────────────────────────────────────────────────────

  async analytics(actor: Actor, tenantId: string, rangeInput?: string) {
    await this.authorise(actor, tenantId);

    const range = RANGES.includes(rangeInput as AnalyticsRange) ? (rangeInput as AnalyticsRange) : 'week';
    const now = new Date();
    const buckets = this.makeBuckets(range, now);
    const start = buckets[0].start;

    const [borrowed, due, progress] = await Promise.all([
      this.prisma.borrowedBook.findMany({
        where: { tenantId, borrowedAt: { gte: start } },
        select: { borrowedAt: true, book: { select: { format: true } } },
        take: ANALYTICS_ROW_CAP,
      }),
      this.prisma.borrowedBook.findMany({
        where: { tenantId, dueDate: { gte: start, lte: now } },
        select: { dueDate: true, returnedAt: true },
        take: ANALYTICS_ROW_CAP,
      }),
      this.prisma.readingProgress.findMany({
        where: { tenantId, lastReadAt: { gte: start } },
        select: { userId: true, dailyProgress: true },
        take: ANALYTICS_ROW_CAP,
      }),
    ]);

    // Borrowing per bucket and per kind of material.
    const borrowingTrends = buckets.map((b) => ({ label: b.label, physical: 0, ebook: 0, audiobook: 0 }));
    for (const loan of borrowed) {
      const idx = buckets.findIndex((b) => loan.borrowedAt >= b.start && loan.borrowedAt < b.end);
      if (idx >= 0) borrowingTrends[idx][formatKind(loan.book.format)] += 1;
    }

    // How late loans that fell due in the window were handed back (or still are).
    const distribution = { onTime: 0, d1to3: 0, d4to7: 0, d8plus: 0 };
    for (const loan of due) {
      const late = daysLate(loan.dueDate, loan.returnedAt ?? now);
      if (late <= 0) distribution.onTime += 1;
      else if (late <= 3) distribution.d1to3 += 1;
      else if (late <= 7) distribution.d4to7 += 1;
      else distribution.d8plus += 1;
    }

    return {
      range,
      borrowingTrends,
      overdueDistribution: [
        { name: 'On time', value: distribution.onTime },
        { name: '1-3 days late', value: distribution.d1to3 },
        { name: '4-7 days late', value: distribution.d4to7 },
        { name: '8+ days late', value: distribution.d8plus },
      ],
      engagement: this.engagementByWeekday(progress, start, now),
      totals: {
        loans: borrowed.length,
        activeReaders: new Set(progress.map((p) => p.userId)).size,
        truncated: [borrowed, due, progress].some((rows) => rows.length >= ANALYTICS_ROW_CAP),
      },
    };
  }

  /** Average readers and pages per weekday, from each reader's per-day reading history. */
  private engagementByWeekday(
    progress: { userId: string; dailyProgress: Prisma.JsonValue }[],
    start: Date,
    end: Date,
  ) {
    const readersByDay = new Map<string, Set<string>>();
    const pagesByDay = new Map<string, number>();
    const from = dayKey(start);
    const to = dayKey(end);

    for (const row of progress) {
      const days = row.dailyProgress;
      if (typeof days !== 'object' || days === null || Array.isArray(days)) continue;
      for (const [key, value] of Object.entries(days)) {
        if (key < from || key > to) continue;
        if (!readersByDay.has(key)) readersByDay.set(key, new Set());
        readersByDay.get(key)!.add(row.userId);
        const pages = (value as { pages?: unknown } | null)?.pages;
        if (typeof pages === 'number' && Number.isFinite(pages)) {
          pagesByDay.set(key, (pagesByDay.get(key) ?? 0) + pages);
        }
      }
    }

    // Count every calendar day in the window per weekday, so quiet days pull the average down.
    const occurrences = Array<number>(7).fill(0);
    const readers = Array<number>(7).fill(0);
    const pages = Array<number>(7).fill(0);
    for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY_MS) {
      const d = new Date(t);
      const key = dayKey(d);
      const wd = d.getUTCDay();
      occurrences[wd] += 1;
      readers[wd] += readersByDay.get(key)?.size ?? 0;
      pages[wd] += pagesByDay.get(key) ?? 0;
    }

    // Monday first.
    return [1, 2, 3, 4, 5, 6, 0].map((wd) => ({
      day: WEEKDAYS[wd],
      readers: occurrences[wd] ? Math.round((readers[wd] / occurrences[wd]) * 10) / 10 : 0,
      pages: occurrences[wd] ? Math.round(pages[wd] / occurrences[wd]) : 0,
    }));
  }

  /** Equal time slices ending now, in UTC: hours for a day, days for a week/month, weeks for a quarter, months for a year. */
  private makeBuckets(range: AnalyticsRange, now: Date): Bucket[] {
    const buckets: Bucket[] = [];
    const hour = 3_600_000;

    if (range === 'day') {
      const end = Math.floor(now.getTime() / hour) * hour + hour;
      for (let i = 23; i >= 0; i--) {
        const s = new Date(end - (i + 1) * hour);
        buckets.push({ label: `${String(s.getUTCHours()).padStart(2, '0')}:00`, start: s, end: new Date(end - i * hour) });
      }
    } else if (range === 'week' || range === 'month') {
      const days = range === 'week' ? 7 : 30;
      const todayStart = Date.parse(`${dayKey(now)}T00:00:00Z`);
      for (let i = days - 1; i >= 0; i--) {
        const s = new Date(todayStart - i * DAY_MS);
        const label = range === 'week' ? WEEKDAYS[s.getUTCDay()] : `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]}`;
        buckets.push({ label, start: s, end: new Date(s.getTime() + DAY_MS) });
      }
    } else if (range === 'quarter') {
      const todayEnd = Date.parse(`${dayKey(now)}T00:00:00Z`) + DAY_MS;
      for (let i = 12; i >= 0; i--) {
        const s = new Date(todayEnd - (i + 1) * 7 * DAY_MS);
        buckets.push({ label: `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]}`, start: s, end: new Date(todayEnd - i * 7 * DAY_MS) });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        buckets.push({ label: MONTHS[s.getUTCMonth()], start: s, end: new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 1)) });
      }
    }
    return buckets;
  }

  // ── Policies ────────────────────────────────────────────────────────────────

  async getPolicies(actor: Actor, tenantId: string) {
    await this.authorise(actor, tenantId);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { borrowingPolicies: true },
    });
    return {
      policies: readStoredPolicies(settings?.borrowingPolicies),
      isDefault: !settings?.borrowingPolicies,
    };
  }

  async updatePolicies(actor: Actor, tenantId: string, input: unknown) {
    await this.authorise(actor, tenantId);

    const current = await this.loadPolicies(tenantId);
    const policies = normalizePolicies(input, current);

    // The settings row already has first-class borrowing fields; keep them in step so anything
    // reading them sees what the admin chose.
    const mirrored = {
      maxBooksPerUser: policies.limits.student,
      maxBorrowDays: policies.periods.book,
      maxRenewals: policies.limits.maxRenewals,
      allowRenewals: policies.limits.maxRenewals > 0,
    };
    const stored = policies as unknown as Prisma.InputJsonValue;

    await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, borrowingPolicies: stored, ...mirrored },
      update: { borrowingPolicies: stored, ...mirrored },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actor.id,
        tenantId,
        action: 'tenant_policies_updated',
        entityType: 'tenant',
        entityId: tenantId,
        metadata: { from: current, to: policies } as unknown as Prisma.InputJsonValue,
      },
    });

    return { policies, isDefault: false };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async loadPolicies(tenantId: string): Promise<BorrowingPolicies> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { borrowingPolicies: true },
    });
    return settings ? readStoredPolicies(settings.borrowingPolicies) : DEFAULT_POLICIES;
  }

  private authorise(actor: Actor, tenantId: string) {
    return assertTenantAdmin(
      this.prisma,
      actor,
      tenantId,
      'You do not have permission to view or manage this institution',
    );
  }
}
