import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { S3Service } from '../aws/s3.service';
import { UserService } from '../user/user.service';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PURPOSE = 'account-deletion';

interface DeletionTokenPayload {
  /** user id */
  uid: string;
  /** email at request time: a changed email invalidates the link */
  em: string;
  /** expiry, ms since epoch */
  exp: number;
  p: typeof PURPOSE;
}

export type ConfirmResult = { status: 'deleted' } | { status: 'invalid' };

/**
 * Public account-deletion flow (the Play Store "delete your account" URL):
 *
 * 1. request(email): if an active, non-super-admin account has that email, email it a
 *    signed 24-hour link. The response never says whether the account exists.
 * 2. confirm(token): from the page that link opens (a button press, so mail scanners
 *    that pre-fetch links cannot delete anyone), delete the account for good.
 *
 * Tokens are stateless HMAC-signed payloads keyed from JWT_SECRET, so the flow needs no
 * new table; reuse after deletion fails because the user no longer exists.
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly s3: S3Service,
    private readonly users: UserService,
    private readonly config: ConfigService,
  ) {}

  private key(): Buffer {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret || secret.startsWith('__')) {
      throw new ServiceUnavailableException(
        'Account deletion is not configured on this server',
      );
    }
    // Purpose-bound key, so this token can never be mistaken for any other signed value.
    return createHash('sha256').update(`${PURPOSE}:${secret}`).digest();
  }

  private sign(payload: DeletionTokenPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const mac = createHmac('sha256', this.key())
      .update(body)
      .digest('base64url');
    return `${body}.${mac}`;
  }

  private verify(token: string): DeletionTokenPayload | null {
    const [body, mac] = (token ?? '').split('.');
    if (!body || !mac) return null;
    const expected = createHmac('sha256', this.key()).update(body).digest();
    const given = Buffer.from(mac, 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected))
      return null;
    try {
      const payload = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as DeletionTokenPayload;
      if (
        payload.p !== PURPOSE ||
        typeof payload.uid !== 'string' ||
        payload.exp < Date.now()
      )
        return null;
      return payload;
    } catch {
      return null;
    }
  }

  async request(rawEmail: string, reason?: string): Promise<void> {
    const email = (rawEmail ?? '').trim().toLowerCase();
    this.key(); // fail closed (unconfigured secret) before looking anything up
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) return;
    if (user.role === UserRole.SUPER_ADMIN) {
      this.logger.warn(
        `Deletion requested for super-admin ${user.id}; ignored (must be done by another super-admin)`,
      );
      return;
    }

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'account_deletion_requested',
        entityType: 'user',
        entityId: user.id,
        metadata: { reason: reason?.slice(0, 1000) || null },
      },
    });

    const token = this.sign({
      uid: user.id,
      em: user.email,
      exp: Date.now() + TOKEN_TTL_MS,
      p: PURPOSE,
    });
    const sent = await this.email.sendAccountDeletionEmail(
      user.email,
      token,
      user.name || 'there',
    );
    if (!sent && process.env.NODE_ENV !== 'production') {
      this.logger.warn(
        `[dev] Email not sent. Deletion link: ${this.email.accountDeletionLink(token)}`,
      );
    }
  }

  async confirm(token: string): Promise<ConfirmResult> {
    const payload = this.verify(token);
    if (!payload) return { status: 'invalid' };

    const user = await this.prisma.user.findUnique({
      where: { id: payload.uid },
      select: { id: true, email: true, role: true, deletedAt: true },
    });
    if (
      !user ||
      user.deletedAt ||
      user.email.toLowerCase() !== payload.em.toLowerCase() ||
      user.role === UserRole.SUPER_ADMIN
    ) {
      return { status: 'invalid' };
    }

    // Storage objects are not covered by database cascades; collect them first.
    const [files, requests] = await Promise.all([
      this.prisma.personalFile.findMany({
        where: { userId: user.id },
        select: { storageKey: true },
      }),
      this.prisma.joinRequest.findMany({
        where: { userId: user.id },
        select: { proofDocument: true },
      }),
    ]);
    const objectKeys = [
      ...files.map((f) => f.storageKey),
      ...requests
        .map((r) => r.proofDocument)
        .filter(
          (k): k is string => !!k && k.startsWith(`join-proofs/${user.id}/`),
        ),
    ];

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'account_deleted_by_request',
        entityType: 'user',
        entityId: user.id,
        metadata: { at: new Date().toISOString() },
      },
    });

    try {
      // Every user-owned table cascades from User (audit logs keep their row with userId nulled).
      await this.prisma.user.delete({ where: { id: user.id } });
    } catch (err) {
      // Something outside the user's own data still points at them (e.g. assignments they
      // set as a teacher). Fall back to anonymising the account and removing their content.
      if (
        !(err instanceof Prisma.PrismaClientKnownRequestError) ||
        err.code !== 'P2003'
      )
        throw err;
      this.logger.warn(
        `Hard delete of ${user.id} blocked by a reference; anonymising instead`,
      );
      await this.purgeContent(user.id);
      await this.users.deleteAccount(user.id);
    }

    if (objectKeys.length > 0) {
      await this.s3
        .deleteMany(objectKeys)
        .catch((e) =>
          this.logger.error(
            `Storage cleanup for ${user.id} failed: ${e?.message}`,
          ),
        );
    }
    return { status: 'deleted' };
  }

  /** The user's own content, for the anonymise-in-place fallback. */
  private async purgeContent(userId: string) {
    const where = { userId };
    await this.prisma.$transaction([
      this.prisma.account.deleteMany({ where }),
      this.prisma.annotation.deleteMany({ where }),
      this.prisma.vocabularyItem.deleteMany({ where }),
      this.prisma.flashcardReview.deleteMany({ where }),
      this.prisma.flashcardDeck.deleteMany({ where }),
      this.prisma.quizAttempt.deleteMany({ where }),
      this.prisma.conceptMastery.deleteMany({ where }),
      this.prisma.resurfacingEvent.deleteMany({ where }),
      this.prisma.bookChatMessage.deleteMany({ where }),
      this.prisma.readingProgress.deleteMany({ where }),
      this.prisma.audioProgress.deleteMany({ where }),
      this.prisma.audioBookmark.deleteMany({ where }),
      this.prisma.notification.deleteMany({ where }),
      this.prisma.joinRequest.deleteMany({ where }),
      this.prisma.personalFile.deleteMany({ where }),
      this.prisma.personalFolder.deleteMany({ where }),
      this.prisma.userStreak.deleteMany({ where }),
      this.prisma.userTenantMembership.deleteMany({ where }),
      this.prisma.otpVerification.deleteMany({ where }),
      this.prisma.passwordResetToken.deleteMany({ where }),
      this.prisma.emailVerificationToken.deleteMany({ where }),
      this.prisma.loginAttempt.deleteMany({ where }),
    ]);
  }
}
