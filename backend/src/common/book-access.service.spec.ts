import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookAccessService, SYSTEM_TENANT } from './book-access.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * These cover the check that gates every book file in the product. It replaced
 * a route that presigned any book for any authenticated caller, so the failure
 * modes cut both ways and both are expensive:
 *
 *   - too permissive → the leak comes straight back
 *   - too strict     → reading breaks for everyone, including paying users
 *
 * The tier half is exercised with ENFORCE_BOOK_TIER toggled explicitly rather
 * than inherited from the environment, so these behave the same on a laptop and
 * in CI.
 */
describe('BookAccessService', () => {
  let service: BookAccessService;
  let prisma: {
    book: { findFirst: jest.Mock };
    userTenantMembership: { findFirst: jest.Mock };
    user: { findUnique: jest.Mock };
    audioSection: { findUnique: jest.Mock };
  };

  const GLOBAL_BOOK = {
    id: 'book-1',
    tenantId: SYSTEM_TENANT,
    accessTier: 'FREE',
    drmProtected: false,
  };
  const TENANT_BOOK = { ...GLOBAL_BOOK, id: 'book-2', tenantId: 'tenant-a' };

  beforeEach(async () => {
    prisma = {
      book: { findFirst: jest.fn() },
      userTenantMembership: { findFirst: jest.fn() },
      user: { findUnique: jest.fn() },
      audioSection: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BookAccessService>(BookAccessService);
    delete process.env.ENFORCE_BOOK_TIER;
  });

  afterEach(() => {
    delete process.env.ENFORCE_BOOK_TIER;
  });

  describe('soft delete', () => {
    it('always filters binned books out of the lookup', async () => {
      prisma.book.findFirst.mockResolvedValue(GLOBAL_BOOK);
      await service.assertCanRead('user-1', 'book-1');

      // The regression this guards: a binned book was hidden from listings but
      // still served its file to anyone holding a stale link.
      expect(prisma.book.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'book-1', deletedAt: null }),
        }),
      );
    });

    it('reports a binned book as not found, not forbidden', async () => {
      // findFirst returns null because deletedAt is in the predicate. 404 over
      // 403 deliberately: 403 would confirm the id exists.
      prisma.book.findFirst.mockResolvedValue(null);
      await expect(
        service.assertCanRead('user-1', 'gone'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('tenant scoping', () => {
    it('allows the global catalogue without a membership lookup', async () => {
      prisma.book.findFirst.mockResolvedValue(GLOBAL_BOOK);
      await expect(service.assertCanRead('user-1', 'book-1')).resolves.toEqual(
        GLOBAL_BOOK,
      );
      expect(prisma.userTenantMembership.findFirst).not.toHaveBeenCalled();
    });

    it('allows a tenant book to an ACTIVE member', async () => {
      prisma.book.findFirst.mockResolvedValue(TENANT_BOOK);
      prisma.userTenantMembership.findFirst.mockResolvedValue({ id: 'm-1' });

      await expect(service.assertCanRead('user-1', 'book-2')).resolves.toEqual(
        TENANT_BOOK,
      );
      expect(prisma.userTenantMembership.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', tenantId: 'tenant-a', status: 'ACTIVE' },
          select: { id: true },
        }),
      );
    });

    it('refuses a tenant book to a non-member', async () => {
      // The cross-tenant read the old route allowed: user in tenant B pulling
      // tenant A's file by id.
      prisma.book.findFirst.mockResolvedValue(TENANT_BOOK);
      prisma.userTenantMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.assertCanRead('outsider', 'book-2'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('treats a null tenantId as global', async () => {
      prisma.book.findFirst.mockResolvedValue({
        ...GLOBAL_BOOK,
        tenantId: null,
      });
      await expect(
        service.assertCanRead('user-1', 'book-1'),
      ).resolves.toBeTruthy();
      expect(prisma.userTenantMembership.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('tier enforcement', () => {
    it('is OFF by default — no user lookup, no denial', async () => {
      prisma.book.findFirst.mockResolvedValue({
        ...GLOBAL_BOOK,
        accessTier: 'DIAMOND',
      });

      await expect(
        service.assertCanRead('free-user', 'book-1'),
      ).resolves.toBeTruthy();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    describe('with ENFORCE_BOOK_TIER=true', () => {
      beforeEach(() => {
        process.env.ENFORCE_BOOK_TIER = 'true';
      });

      it('refuses a DIAMOND book to a FREE user', async () => {
        prisma.book.findFirst.mockResolvedValue({
          ...GLOBAL_BOOK,
          accessTier: 'DIAMOND',
        });
        prisma.user.findUnique.mockResolvedValue({
          subscriptionTier: 'FREE',
          trialEndsAt: null,
        });

        await expect(
          service.assertCanRead('free-user', 'book-1'),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });

      it('allows a DIAMOND book to a DIAMOND user', async () => {
        prisma.book.findFirst.mockResolvedValue({
          ...GLOBAL_BOOK,
          accessTier: 'DIAMOND',
        });
        prisma.user.findUnique.mockResolvedValue({
          subscriptionTier: 'diamond', // lowercase in the column
          trialEndsAt: null,
        });

        await expect(
          service.assertCanRead('paid', 'book-1'),
        ).resolves.toBeTruthy();
      });

      it('allows an active trial through any tier', async () => {
        prisma.book.findFirst.mockResolvedValue({
          ...GLOBAL_BOOK,
          accessTier: 'DIAMOND',
        });
        prisma.user.findUnique.mockResolvedValue({
          subscriptionTier: 'trial',
          trialEndsAt: new Date(Date.now() + 86_400_000),
        });

        await expect(
          service.assertCanRead('trialist', 'book-1'),
        ).resolves.toBeTruthy();
      });

      it('does NOT lock out an unrecognised tier string', async () => {
        // The reason this whole check ships behind a flag. The column has held
        // 'basic' / 'premium' / 'enterprise', none of which are in TIER_RANK.
        // Ranking them 0 would read a paying legacy subscriber as FREE.
        prisma.book.findFirst.mockResolvedValue({
          ...GLOBAL_BOOK,
          accessTier: 'DIAMOND',
        });
        prisma.user.findUnique.mockResolvedValue({
          subscriptionTier: 'premium',
          trialEndsAt: null,
        });

        await expect(
          service.assertCanRead('legacy', 'book-1'),
        ).resolves.toBeTruthy();
      });

      it('gates nothing on a FREE book', async () => {
        prisma.book.findFirst.mockResolvedValue(GLOBAL_BOOK);
        await expect(
          service.assertCanRead('anyone', 'book-1'),
        ).resolves.toBeTruthy();
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
      });

      it('refuses when the expired trial user holds a lower tier', async () => {
        prisma.book.findFirst.mockResolvedValue({
          ...GLOBAL_BOOK,
          accessTier: 'GOLD',
        });
        prisma.user.findUnique.mockResolvedValue({
          subscriptionTier: 'BRONZE',
          trialEndsAt: new Date(Date.now() - 86_400_000), // expired
        });

        await expect(
          service.assertCanRead('lapsed', 'book-1'),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });
    });
  });

  describe('assertCanReadSection', () => {
    it('resolves section → chapter → book and authorizes that book', async () => {
      prisma.audioSection.findUnique.mockResolvedValue({
        chapter: { bookId: 'book-2' },
      });
      prisma.book.findFirst.mockResolvedValue(TENANT_BOOK);
      prisma.userTenantMembership.findFirst.mockResolvedValue({ id: 'm-1' });

      await expect(
        service.assertCanReadSection('user-1', 'section-9'),
      ).resolves.toEqual(TENANT_BOOK);
      expect(prisma.book.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'book-2' }),
        }),
      );
    });

    it('refuses a section whose book belongs to another tenant', async () => {
      prisma.audioSection.findUnique.mockResolvedValue({
        chapter: { bookId: 'book-2' },
      });
      prisma.book.findFirst.mockResolvedValue(TENANT_BOOK);
      prisma.userTenantMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.assertCanReadSection('outsider', 'section-9'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('404s an unknown section', async () => {
      prisma.audioSection.findUnique.mockResolvedValue(null);
      await expect(
        service.assertCanReadSection('user-1', 'nope'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s a section whose chapter link is broken', async () => {
      prisma.audioSection.findUnique.mockResolvedValue({ chapter: null });
      await expect(
        service.assertCanReadSection('user-1', 'orphan'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
