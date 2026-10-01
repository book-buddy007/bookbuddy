import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TIER_RANK } from '../auth/tier.decorator';

/**
 * The global catalogue's tenant sentinel. A book carrying this (or no tenant at
 * all) is readable by every authenticated user; anything else is tenant-scoped.
 */
export const SYSTEM_TENANT = '__SYSTEM__';

/** The subset of Book the callers actually need back. */
export interface AuthorizedBook {
  id: string;
  tenantId: string | null;
  accessTier: string;
  drmProtected: boolean;
}

/**
 * One home for "may this user read this book?".
 *
 * This check was copy-pasted into five controllers — chat, quiz, graph,
 * text-adaptation and visual-grounding — each with an identical private
 * `authorizeBookAccess()`. Five copies is survivable; the problem is that the
 * two routes which hand out the actual FILES (`books/:id/read-url` and the
 * audiobook presign) never got a copy at all, so the cheapest surface to abuse
 * was the only one left unguarded.
 *
 * `assertCanRead` is deliberately stricter than the copies it replaces: it also
 * excludes soft-deleted books. A binned book was previously hidden from
 * listings but still served its file to anyone holding a stale link.
 */
@Injectable()
export class BookAccessService {
  constructor(private prisma: PrismaService) {}

  /**
   * Throws unless `userId` may read `bookId`. Returns the book so the caller
   * doesn't re-query — in particular `accessTier`, which the tier check needs,
   * and `drmProtected`, which the read-url path needs.
   */
  async assertCanRead(
    userId: string,
    bookId: string,
  ): Promise<AuthorizedBook> {
    const book = await this.prisma.book.findFirst({
      // findFirst, not findUnique: `deletedAt` is part of the predicate, and a
      // binned book must read as "not found" rather than "forbidden" — the
      // distinction leaks whether an id exists.
      where: { id: bookId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        accessTier: true,
        drmProtected: true,
      },
    });
    if (!book) throw new NotFoundException('Book not found');

    if (book.tenantId && book.tenantId !== SYSTEM_TENANT) {
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: { userId, tenantId: book.tenantId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenException('You do not have access to this book.');
      }
    }

    await this.assertTierAllows(userId, book.accessTier);

    return book as AuthorizedBook;
  }

  /**
   * A book's `accessTier` is enforced NOWHERE server-side today — it is a
   * filter in admin CRUD and a client-side `canUserAccess()` check in
   * types/catalog.ts, which means the padlock on a catalogue card is
   * decoration. This closes that, but behind a flag, and the reason matters:
   *
   * `User.subscriptionTier` does not hold AccessTier values. It has been seen
   * holding 'trial', 'TRIAL' (old Google signup), and lowercase 'basic' /
   * 'premium' / 'enterprise' — none of which appear in TIER_RANK. Ranking an
   * unrecognised value as 0 would read every paying legacy subscriber as FREE
   * and lock them out of content they have bought, which is a worse failure
   * than the leak it fixes.
   *
   * So: unrecognised values and active trials are allowed through, and the
   * whole check is off unless ENFORCE_BOOK_TIER is set. Turn it on once the
   * distinct values of that column have been read in prod and mapped here.
   */
  private async assertTierAllows(
    userId: string,
    bookTier: string,
  ): Promise<void> {
    if (process.env.ENFORCE_BOOK_TIER !== 'true') return;

    const required = TIER_RANK[String(bookTier).toUpperCase()];
    // FREE books, and any tier we don't have a rank for, gate nothing.
    if (!required) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, trialEndsAt: true },
    });
    if (!user) throw new ForbiddenException('You do not have access to this book.');

    // An active trial is full access, matching AiEntitlementService.
    if (user.trialEndsAt && user.trialEndsAt > new Date()) return;

    const raw = String(user.subscriptionTier ?? '').toUpperCase();
    const held = TIER_RANK[raw];
    // Unrecognised tier string → allow. See the note above: guessing low here
    // locks out real subscribers.
    if (held === undefined) return;

    if (held < required) {
      throw new ForbiddenException(
        `This book requires the ${String(bookTier).toUpperCase()} tier. Upgrade your plan.`,
      );
    }
  }

  /**
   * Same check, addressed by an audio section instead of a book.
   *
   * The presign route only ever receives a `sectionId`, so the owning book has
   * to be resolved upward through the chapter before anything can be
   * authorized against it.
   */
  async assertCanReadSection(
    userId: string,
    sectionId: string,
  ): Promise<AuthorizedBook> {
    const section = await this.prisma.audioSection.findUnique({
      where: { id: sectionId },
      select: { chapter: { select: { bookId: true } } },
    });
    if (!section?.chapter?.bookId) {
      throw new NotFoundException('Audio section not found');
    }
    return this.assertCanRead(userId, section.chapter.bookId);
  }
}
