import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MembershipStatus, TenantRole, UserRole } from '@prisma/client';
import { TenantAdminService } from './tenant-admin.service';
import {
  DEFAULT_POLICIES,
  calculateFine,
  formatKind,
  normalizePolicies,
  readStoredPolicies,
} from './policies';

const TENANT = 't-1';
const DAY = 86_400_000;

describe('policies', () => {
  it('fills missing fields from defaults and keeps valid input', () => {
    const out = normalizePolicies({ fines: { dailyRate: '1.25' }, limits: { student: 8 } });
    expect(out.fines.dailyRate).toBe(1.25);
    expect(out.limits.student).toBe(8);
    expect(out.periods).toEqual(DEFAULT_POLICIES.periods);
  });

  it('reports every problem at once and rejects unusable values', () => {
    try {
      normalizePolicies({ limits: { student: 0, teacher: 2.5 }, fines: { dailyRate: -1, enabled: 'yes' }, periods: { book: 'abc' } });
      fail('expected a BadRequestException');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const messages = (e as BadRequestException).getResponse() as { message: string[] };
      expect(messages.message).toHaveLength(5);
    }
  });

  it('rejects a non-object body', () => {
    expect(() => normalizePolicies(null)).toThrow(BadRequestException);
    expect(() => normalizePolicies([])).toThrow(BadRequestException);
  });

  it('drops unknown keys', () => {
    const out = normalizePolicies({ limits: { student: 3, admin: 99 }, evil: { x: 1 } }) as any;
    expect(out.limits.admin).toBeUndefined();
    expect(out.evil).toBeUndefined();
  });

  it('falls back to defaults for corrupt stored JSON', () => {
    expect(readStoredPolicies({ limits: { student: 'many' } })).toEqual(DEFAULT_POLICIES);
    expect(readStoredPolicies(null)).toEqual(DEFAULT_POLICIES);
  });

  it('computes fines with grace period and cap', () => {
    const fines = { enabled: true, dailyRate: 0.5, gracePeriod: 3, maxFine: 20 };
    expect(calculateFine(2, fines)).toBe(0);
    expect(calculateFine(3, fines)).toBe(0);
    expect(calculateFine(10, fines)).toBe(3.5);
    expect(calculateFine(500, fines)).toBe(20);
    expect(calculateFine(10, { ...fines, enabled: false })).toBe(0);
  });

  it('groups book formats into the three kinds', () => {
    expect(formatKind('audiobook')).toBe('audiobook');
    expect(formatKind('PDF')).toBe('ebook');
    expect(formatKind('epub')).toBe('ebook');
    expect(formatKind('hardcover')).toBe('physical');
    expect(formatKind(null)).toBe('physical');
  });
});

describe('TenantAdminService', () => {
  const admin = { id: 'admin-1', role: UserRole.ADMIN };
  let prisma: any;
  let email: { sendOverdueReminderEmail: jest.Mock };
  let service: TenantAdminService;

  const asAdmin = () =>
    prisma.userTenantMembership.findUnique.mockResolvedValue({
      role: TenantRole.ADMIN,
      status: MembershipStatus.ACTIVE,
    });

  const loan = (over: Record<string, unknown> = {}) => ({
    id: 'l1',
    dueDate: new Date(Date.now() - 10 * DAY),
    returnedAt: null,
    user: { id: 'u1', name: 'Asha', email: 'asha@x.test' },
    book: { id: 'b1', title: 'Dune', format: 'pdf' },
    ...over,
  });

  beforeEach(() => {
    prisma = {
      userTenantMembership: { findUnique: jest.fn().mockResolvedValue(null), groupBy: jest.fn().mockResolvedValue([]) },
      tenantSettings: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({}) },
      tenant: { findUnique: jest.fn().mockResolvedValue({ name: 'Academy' }) },
      borrowedBook: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      book: { aggregate: jest.fn().mockResolvedValue({ _count: { _all: 0 }, _sum: {} }) },
      readingProgress: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    email = { sendOverdueReminderEmail: jest.fn().mockResolvedValue(true) };
    service = new TenantAdminService(prisma, email as any);
  });

  describe('authorisation', () => {
    it.each([
      ['overview', () => service.overview(admin, TENANT)],
      ['overdue', () => service.overdue(admin, TENANT)],
      ['sendReminders', () => service.sendReminders(admin, TENANT, ['l1'])],
      ['analytics', () => service.analytics(admin, TENANT, 'week')],
      ['getPolicies', () => service.getPolicies(admin, TENANT)],
      ['updatePolicies', () => service.updatePolicies(admin, TENANT, {})],
    ])('%s refuses someone who is not an admin of the institution', async (_name, call) => {
      await expect(call()).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
      expect(email.sendOverdueReminderEmail).not.toHaveBeenCalled();
    });
  });

  describe('overdue', () => {
    it('computes days and fines from the default policy and counts earlier reminders', async () => {
      asAdmin();
      prisma.borrowedBook.findMany.mockResolvedValue([loan()]);
      prisma.auditLog.groupBy.mockResolvedValue([
        { entityId: 'l1', _count: { _all: 2 }, _max: { createdAt: new Date('2026-10-01T00:00:00Z') } },
      ]);

      const result = await service.overdue(admin, TENANT);

      expect(result.items[0]).toMatchObject({ id: 'l1', title: 'Dune', daysOverdue: 10, fine: 3.5, remindersSent: 2 });
      expect(result.summary).toMatchObject({ count: 1, totalFines: 3.5, averageDaysOverdue: 10, withoutReminders: 0 });
      // Scoped to this institution and to loans still out.
      expect(prisma.borrowedBook.findMany.mock.calls[0][0].where).toMatchObject({ tenantId: TENANT, returnedAt: null });
    });

    it('counts calendar days from the due date, and shows at least one day once overdue', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-05T00:30:00Z'));
      try {
        asAdmin();
        prisma.borrowedBook.findMany.mockResolvedValue([
          loan({ id: 'a', dueDate: new Date('2026-10-02T23:00:00Z') }), // 3 calendar days
          loan({ id: 'b', dueDate: new Date('2026-10-05T00:10:00Z') }), // due 20 minutes ago, same date
        ]);
        const result = await service.overdue(admin, TENANT);
        expect(result.items.map((i) => i.daysOverdue)).toEqual([3, 1]);
      } finally {
        jest.useRealTimers();
      }
    });

    it('uses the institution\'s saved policy for fines', async () => {
      asAdmin();
      prisma.tenantSettings.findUnique.mockResolvedValue({
        borrowingPolicies: { ...DEFAULT_POLICIES, fines: { enabled: true, dailyRate: 2, gracePeriod: 0, maxFine: 5 } },
      });
      prisma.borrowedBook.findMany.mockResolvedValue([loan()]);
      const result = await service.overdue(admin, TENANT);
      expect(result.items[0].fine).toBe(5);
    });
  });

  describe('sendReminders', () => {
    it('rejects bad input before touching anything', async () => {
      asAdmin();
      await expect(service.sendReminders(admin, TENANT, 'l1')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.sendReminders(admin, TENANT, [])).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.sendReminders(admin, TENANT, [1])).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.sendReminders(admin, TENANT, Array.from({ length: 101 }, (_, i) => `l${i}`)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('emails, records an audit entry, and skips unknown and recently reminded loans', async () => {
      asAdmin();
      prisma.borrowedBook.findMany.mockResolvedValue([loan({ id: 'a' }), loan({ id: 'b' })]);
      prisma.auditLog.findMany.mockResolvedValue([{ entityId: 'b' }]);

      const result = await service.sendReminders(admin, TENANT, ['a', 'b', 'ghost', 'a']);

      expect(result.sent).toBe(1);
      expect(result.failed).toEqual([]);
      expect(result.skipped).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'ghost' }),
          expect.objectContaining({ id: 'b', reason: expect.stringContaining('24 hours') }),
        ]),
      );
      expect(email.sendOverdueReminderEmail).toHaveBeenCalledTimes(1);
      expect(email.sendOverdueReminderEmail.mock.calls[0][0]).toBe('asha@x.test');
      expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({
        action: 'overdue_reminder_sent',
        entityId: 'a',
        tenantId: TENANT,
        userId: admin.id,
      });
    });

    it('does not record a reminder that failed to send', async () => {
      asAdmin();
      prisma.borrowedBook.findMany.mockResolvedValue([loan({ id: 'a' })]);
      email.sendOverdueReminderEmail.mockResolvedValue(false);

      const result = await service.sendReminders(admin, TENANT, ['a']);

      expect(result).toMatchObject({ sent: 0, failed: ['a'] });
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('policies', () => {
    it('saves validated policies, keeps the first-class settings in step, and audits', async () => {
      asAdmin();
      const result = await service.updatePolicies(admin, TENANT, {
        limits: { student: 7, maxRenewals: 0 },
        periods: { book: 21 },
      });

      expect(result.policies.limits.student).toBe(7);
      const call = prisma.tenantSettings.upsert.mock.calls[0][0];
      expect(call.where).toEqual({ tenantId: TENANT });
      expect(call.update).toMatchObject({
        maxBooksPerUser: 7,
        maxBorrowDays: 21,
        maxRenewals: 0,
        allowRenewals: false,
      });
      expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe('tenant_policies_updated');
    });

    it('stores nothing when validation fails', async () => {
      asAdmin();
      await expect(service.updatePolicies(admin, TENANT, { fines: { dailyRate: -5 } })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.tenantSettings.upsert).not.toHaveBeenCalled();
    });

    it('reports defaults until something is saved', async () => {
      asAdmin();
      expect(await service.getPolicies(admin, TENANT)).toEqual({ policies: DEFAULT_POLICIES, isDefault: true });
    });
  });

  describe('reports', () => {
    it('refuses an unknown report type', async () => {
      asAdmin();
      await expect(service.report(admin, TENANT, 'secrets')).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([
      ['not-a-date', undefined],
      ['2026-01-01', '2026-13-45'],
      ['2026-03-01', '2026-01-01'],
      ['2024-01-01', '2026-01-01'],
    ])('rejects a bad circulation range %s..%s', async (from, to) => {
      asAdmin();
      await expect(service.report(admin, TENANT, 'circulation', from, to)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('builds a circulation CSV scoped to the institution and neutralises formulas in titles', async () => {
      asAdmin();
      prisma.borrowedBook.findMany.mockResolvedValue([
        loan({ id: 'l1', borrowedAt: new Date('2026-09-20T00:00:00Z'), book: { title: '=cmd|calc', format: 'pdf' } }),
      ]);

      const { filename, csv } = await service.report(admin, TENANT, 'circulation', '2026-09-01', '2026-09-30');

      expect(filename).toMatch(/^circulation-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(csv).toContain("'=cmd|calc");
      expect(csv).toContain('ebook');
      const where = prisma.borrowedBook.findMany.mock.calls[0][0].where;
      expect(where.tenantId).toBe(TENANT);
      // `to` is inclusive of the whole last day.
      expect(where.borrowedAt.lt.toISOString()).toBe('2026-10-01T00:00:00.000Z');
      expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: 'report_generated' });
    });

    it('lists only items with a fine in the fines report, largest first', async () => {
      asAdmin();
      prisma.borrowedBook.findMany.mockResolvedValue([
        loan({ id: 'a', dueDate: new Date(Date.now() - 2 * DAY), book: { id: 'b', title: 'Free' } }),
        loan({ id: 'b', dueDate: new Date(Date.now() - 10 * DAY), book: { id: 'b', title: 'Small' } }),
        loan({ id: 'c', dueDate: new Date(Date.now() - 30 * DAY), book: { id: 'b', title: 'Big' } }),
      ]);

      const { csv } = await service.report(admin, TENANT, 'fines');
      const lines = csv.trim().split('\r\n');

      expect(lines).toHaveLength(3); // header + two fined items; the 2-day loan is inside the grace period
      expect(lines[1]).toContain('Big');
      expect(lines[2]).toContain('Small');
    });
  });

  describe('analytics', () => {
    it('buckets loans by kind and falls back to a week for an unknown range', async () => {
      asAdmin();
      const now = new Date();
      prisma.borrowedBook.findMany
        .mockResolvedValueOnce([
          { borrowedAt: now, book: { format: 'audiobook' } },
          { borrowedAt: now, book: { format: 'pdf' } },
          { borrowedAt: now, book: { format: 'pdf' } },
        ])
        .mockResolvedValueOnce([
          { dueDate: new Date(now.getTime() - 20 * 3_600_000), returnedAt: new Date(now.getTime() - 25 * 3_600_000) },
          { dueDate: new Date(now.getTime() - 5 * DAY), returnedAt: null },
        ]);

      const result = await service.analytics(admin, TENANT, 'nonsense');

      expect(result.range).toBe('week');
      expect(result.borrowingTrends).toHaveLength(7);
      const last = result.borrowingTrends[6];
      expect(last).toMatchObject({ audiobook: 1, ebook: 2, physical: 0 });
      expect(result.overdueDistribution).toEqual([
        { name: 'On time', value: 1 },
        { name: '1-3 days late', value: 0 },
        { name: '4-7 days late', value: 1 },
        { name: '8+ days late', value: 0 },
      ]);
      expect(result.engagement).toHaveLength(7);
    });

    it('averages readers per weekday from daily reading history', async () => {
      asAdmin();
      const today = new Date().toISOString().slice(0, 10);
      prisma.readingProgress.findMany.mockResolvedValue([
        { userId: 'u1', dailyProgress: { [today]: { pages: 10 } } },
        { userId: 'u2', dailyProgress: { [today]: { pages: 5 } } },
        { userId: 'u1', dailyProgress: { '2001-01-01': { pages: 999 }, [today]: { pages: 5 } } },
      ]);

      const result = await service.analytics(admin, TENANT, 'week');
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getUTCDay()];
      const entry = result.engagement.find((e) => e.day === weekday)!;

      // u1 appears in two rows on the same day but counts once; the 2001 entry is outside the window.
      expect(entry).toMatchObject({ readers: 2, pages: 20 });
    });
  });
});
