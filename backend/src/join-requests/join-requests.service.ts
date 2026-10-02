import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JoinRequestStatus,
  MembershipStatus,
  TenantRole,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../aws/s3.service';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import {
  PROOF_MAX_BYTES,
  PROOF_MIME_TYPES,
  ProofUploadDto,
} from './dto/proof-upload.dto';

/**
 * Proof documents live under `join-proofs/<userId>/` in the media bucket, the same
 * owner-prefix scheme personal files use, and are only ever served through short-lived
 * presigned links. The key is checked against this shape on create, so a request can
 * only reference the requester's own upload.
 */
const proofKeyPattern = (userId: string) =>
  new RegExp(`^join-proofs/${userId}/[0-9a-f-]{36}\\.(pdf|jpg|png)$`);

/** Roles within a tenant that may review join requests. */
const REVIEWER_ROLES: TenantRole[] = [TenantRole.ADMIN, TenantRole.LIBRARIAN];

const TENANT_SUMMARY = {
  select: { id: true, name: true, domain: true, type: true, logoUrl: true },
};

const REQUESTER_SUMMARY = {
  select: {
    id: true,
    name: true,
    email: true,
    profilePicture: true,
    emailVerified: true,
  },
};

@Injectable()
export class JoinRequestsService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  /** A presigned PUT for the requester's proof document (PDF, JPG or PNG, up to 5 MB). */
  async createProofUploadUrl(userId: string, dto: ProofUploadDto) {
    const ext = PROOF_MIME_TYPES[dto.contentType];
    const key = `join-proofs/${userId}/${randomUUID()}.${ext}`;
    const { uploadUrl } = await this.s3.getPresignedUploadUrl({
      key,
      mimeType: dto.contentType,
      format: 'proof',
      expiresInSeconds: 300,
    });
    return { uploadUrl, key, maxBytes: PROOF_MAX_BYTES };
  }

  /**
   * A short-lived link to a request's proof document, for the requester or a
   * reviewer of that institution. Requests filed before uploads existed may hold a
   * placeholder string rather than a key; those have nothing to show.
   */
  async getProofUrl(viewer: { id: string; role: UserRole }, id: string) {
    const request = await this.prisma.joinRequest.findUnique({
      where: { id },
      select: { userId: true, tenantId: true, proofDocument: true },
    });
    if (!request) throw new NotFoundException('Join request not found');
    if (request.userId !== viewer.id)
      await this.assertCanReview(viewer, request.tenantId);

    if (
      !request.proofDocument ||
      !proofKeyPattern(request.userId).test(request.proofDocument)
    ) {
      throw new NotFoundException('This request has no document attached');
    }
    const url = await this.s3.getPresignedDownloadUrl({
      key: request.proofDocument,
      expiresInSeconds: 300,
    });
    return { url };
  }

  /**
   * File a request to join an institution.
   *
   * Guards against the three states that would otherwise produce a request no
   * administrator can act on sensibly: an institution that isn't accepting
   * requests, a user who is already a member, and a duplicate still pending.
   */
  async create(userId: string, dto: CreateJoinRequestDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
      select: { id: true, name: true, isActive: true, allowJoinRequests: true },
    });

    if (!tenant) {
      throw new NotFoundException('Institution not found');
    }

    if (!tenant.isActive || !tenant.allowJoinRequests) {
      throw new BadRequestException(
        `${tenant.name} is not accepting join requests right now`,
      );
    }

    const existingMembership =
      await this.prisma.userTenantMembership.findUnique({
        where: { userId_tenantId: { userId, tenantId: dto.tenantId } },
      });

    if (existingMembership?.status === MembershipStatus.ACTIVE) {
      throw new BadRequestException(
        `You are already a member of ${tenant.name}`,
      );
    }

    const pending = await this.prisma.joinRequest.findFirst({
      where: {
        userId,
        tenantId: dto.tenantId,
        status: JoinRequestStatus.PENDING,
      },
    });

    if (pending) {
      throw new BadRequestException(
        `You already have a request pending with ${tenant.name}`,
      );
    }

    if (dto.proofDocument && !proofKeyPattern(userId).test(dto.proofDocument)) {
      throw new BadRequestException(
        'The attached document could not be verified. Upload it again.',
      );
    }

    return this.prisma.joinRequest.create({
      data: {
        userId,
        tenantId: dto.tenantId,
        // Self-service requests are always for a student seat; staff roles are
        // granted by invitation, not by asking.
        requestedRole: dto.requestedRole ?? TenantRole.STUDENT,
        message: dto.message,
        proofDocument: dto.proofDocument,
        status: JoinRequestStatus.PENDING,
      },
      include: { tenant: TENANT_SUMMARY },
    });
  }

  /** Every request the user has filed, newest first. */
  async findMine(userId: string) {
    return this.prisma.joinRequest.findMany({
      where: { userId },
      include: { tenant: TENANT_SUMMARY },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Whether the user already has a request with this institution — lets the
   * browse screen show "Pending" instead of a Join button that would 400.
   */
  async check(userId: string, tenantId: string) {
    const request = await this.prisma.joinRequest.findFirst({
      where: { userId, tenantId },
      include: { tenant: TENANT_SUMMARY },
      orderBy: { createdAt: 'desc' },
    });

    const membership = await this.prisma.userTenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: { status: true, role: true },
    });

    return {
      hasRequest: !!request,
      status: request?.status ?? null,
      request,
      isMember: membership?.status === MembershipStatus.ACTIVE,
      membershipStatus: membership?.status ?? null,
    };
  }

  /** Withdraw one's own request. Only a pending request can be cancelled. */
  async cancel(userId: string, id: string) {
    const request = await this.prisma.joinRequest.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    if (request.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (request.status !== JoinRequestStatus.PENDING) {
      throw new BadRequestException(
        'This request has already been reviewed and cannot be cancelled',
      );
    }

    await this.prisma.joinRequest.delete({ where: { id } });

    // The withdrawn request's ID document has no further use; best-effort removal.
    if (
      request.proofDocument &&
      proofKeyPattern(userId).test(request.proofDocument)
    ) {
      await this.s3.deleteFile(request.proofDocument).catch(() => undefined);
    }
    return { success: true, message: 'Join request withdrawn' };
  }

  /** Queue for an institution's reviewers. */
  async findForTenant(
    reviewer: { id: string; role: UserRole },
    tenantId: string,
    status?: JoinRequestStatus,
  ) {
    await this.assertCanReview(reviewer, tenantId);

    return this.prisma.joinRequest.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: { user: REQUESTER_SUMMARY, tenant: TENANT_SUMMARY },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Approve a request and grant access in one transaction.
   *
   * The membership is what actually unlocks the library — the request status
   * alone is only a record. Writing them separately would leave a user marked
   * approved but still locked out if the second write failed, which is exactly
   * the state the mobile waiting room cannot distinguish from a pending review.
   */
  async approve(
    reviewer: { id: string; role: UserRole },
    id: string,
    role?: string,
  ) {
    const request = await this.prisma.joinRequest.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    await this.assertCanReview(reviewer, request.tenantId);

    if (request.status !== JoinRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been reviewed');
    }

    const grantedRole = this.parseRole(role) ?? request.requestedRole;

    const [, updated] = await this.prisma.$transaction([
      this.prisma.userTenantMembership.upsert({
        where: {
          userId_tenantId: {
            userId: request.userId,
            tenantId: request.tenantId,
          },
        },
        create: {
          userId: request.userId,
          tenantId: request.tenantId,
          role: grantedRole,
          status: MembershipStatus.ACTIVE,
          approvedBy: reviewer.id,
          approvedAt: new Date(),
        },
        update: {
          role: grantedRole,
          status: MembershipStatus.ACTIVE,
          approvedBy: reviewer.id,
          approvedAt: new Date(),
        },
      }),
      this.prisma.joinRequest.update({
        where: { id },
        data: {
          status: JoinRequestStatus.APPROVED,
          reviewedBy: reviewer.id,
          reviewedAt: new Date(),
        },
        include: { user: REQUESTER_SUMMARY, tenant: TENANT_SUMMARY },
      }),
    ]);

    return updated;
  }

  async reject(
    reviewer: { id: string; role: UserRole },
    id: string,
    rejectionReason?: string,
  ) {
    const request = await this.prisma.joinRequest.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    await this.assertCanReview(reviewer, request.tenantId);

    if (request.status !== JoinRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been reviewed');
    }

    return this.prisma.joinRequest.update({
      where: { id },
      data: {
        status: JoinRequestStatus.REJECTED,
        reviewedBy: reviewer.id,
        reviewedAt: new Date(),
        rejectionReason:
          rejectionReason || 'Request declined by the institution',
      },
      include: { user: REQUESTER_SUMMARY, tenant: TENANT_SUMMARY },
    });
  }

  /**
   * A reviewer must be a platform super-admin, or hold an active admin or
   * librarian membership in the institution being reviewed. Membership in some
   * other tenant confers nothing here.
   */
  private async assertCanReview(
    reviewer: { id: string; role: UserRole },
    tenantId: string,
  ) {
    if (reviewer.role === UserRole.SUPER_ADMIN) return;

    const membership = await this.prisma.userTenantMembership.findUnique({
      where: { userId_tenantId: { userId: reviewer.id, tenantId } },
      select: { role: true, status: true },
    });

    const allowed =
      membership?.status === MembershipStatus.ACTIVE &&
      REVIEWER_ROLES.includes(membership.role);

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to review join requests for this institution',
      );
    }
  }

  private parseRole(role?: string): TenantRole | null {
    if (!role) return null;
    const normalised = role.toUpperCase() as TenantRole;
    return Object.values(TenantRole).includes(normalised) ? normalised : null;
  }
}
