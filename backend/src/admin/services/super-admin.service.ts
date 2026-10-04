import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInstitutionDto } from '../dto/create-institution.dto';
import { InstitutionEntity } from '../entities/institution.entity';
import { S3Service } from '../../aws/s3.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

/** Image types accepted for branding uploads, and the file extension each is stored with. */
const BRANDING_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

@Injectable()
export class SuperAdminService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Presigned upload for a branding image. It lives in the public bucket under
   * `global/branding/<institution>/`, and the response carries the public URL to store.
   */
  async getBrandingUploadUrl(
    institutionId: string,
    fileType: string,
    contentType: string,
  ) {
    const extension = BRANDING_IMAGE_TYPES[contentType];
    if (!extension) {
      throw new BadRequestException(
        'Branding images must be PNG, JPEG, WebP or SVG',
      );
    }
    // Logos are shown to signed-out visitors, so they go in the public bucket.
    const bucket = this.s3Service.publicBucketName;
    const owner = institutionId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!owner) throw new BadRequestException('Invalid institution id');

    const { url, key } = await this.s3Service.generatePresignedUploadUrl(
      bucket,
      fileType, // ex: logo
      contentType, // ex: image/png
      3600, // expires in 1h
      { keyPrefix: `global/branding/${owner}`, extension },
    );
    return {
      uploadUrl: url,
      key,
      bucket,
      publicUrl: this.s3Service.publicUrlFor(key),
    };
  }

  // Tenant methods (formerly Institution)
  async getInstitutions() {
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      include: {
        subscriptions: true,
        settings: true,
      },
    });
    return tenants.map((t) => new InstitutionEntity(t));
  }

  async getInstitutionById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        subscriptions: true,
        settings: true,
      },
    });
    if (!tenant || (tenant as any).deletedAt)
      throw new BadRequestException('Institution not found');
    return new InstitutionEntity(tenant);
  }

  async createInstitution(
    data: CreateInstitutionDto,
  ): Promise<InstitutionEntity> {
    const typeMap: Record<string, any> = {
      school: 'SCHOOL',
      college: 'COLLEGE',
      university: 'UNIVERSITY',
      corporate: 'CORPORATE',
    };

    // Ensure atomicity with Prisma Transactions
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the tenant
      const domainFallback =
        data.domain ||
        `${data.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu`;

      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          domain: domainFallback,
          type:
            data.type ||
            (data.type ? typeMap[String(data.type).toLowerCase()] : null) ||
            'SCHOOL',
          description: data.description || '',
          allowJoinRequests: data.allowJoinRequests ?? true,
          location: data.location || '',
          branding: data.branding || undefined,
          isActive: true,
          settings: {
            create: {
              allowStudentSignup: true,
              requireApproval: true,
            },
          },
        },
      });

      // 2. Check if admin user already exists globally
      let user = await tx.user.findUnique({
        where: { email: data.adminEmail },
      });
      if (!user) {
        // Create the user if they don't exist
        user = await tx.user.create({
          data: {
            email: data.adminEmail,
            name: data.adminName,
            role: 'STUDENT', // Base role is STUDENT mapped to global. Tenant specifics handle true role
            accountType: 'INSTITUTIONAL',
            isActive: true,
          },
        });
      }

      // 3. Create the UserTenantMembership for this admin
      await tx.userTenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      return new InstitutionEntity(tenant);
    });
  }

  async updateInstitution(id: string, data: any) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant || tenant.deletedAt)
      throw new BadRequestException('Institution not found');

    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.domain !== undefined && { domain: data.domain }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.branding !== undefined && { branding: data.branding }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.allowJoinRequests !== undefined && {
          allowJoinRequests: data.allowJoinRequests,
        }),
      },
    });
  }

  async deleteInstitution(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant || tenant.deletedAt)
      throw new BadRequestException('Institution not found');

    // Soft-delete: set deletedAt and deactivate
    return this.prisma.tenant.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  // User methods
  async getUsers(params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
    tenantId?: string;
  }) {
    const { page, limit, search, role, status, tenantId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (tenantId) {
      where.tenantMemberships = {
        some: { tenantId },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (role && role !== 'All Roles') {
      const roleMap: Record<string, string> = {
        super_admin: 'SUPER_ADMIN',
        admin: 'ADMIN',
        librarian: 'LIBRARIAN',
        teacher: 'TEACHER',
        student: 'STUDENT',
      };

      if (tenantId) {
        // If filtering by tenant, check the role inside the specific tenant membership
        where.tenantMemberships = {
          some: {
            tenantId,
            role: roleMap[role] || role.toUpperCase(),
          },
        };
      } else {
        // Global role
        where.role = roleMap[role] || role.toUpperCase();
      }
    }

    if (status && status !== 'All') {
      where.isActive = status === 'Active';
    }

    const [users, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenantMemberships: {
            include: {
              tenant: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getUserStats(tenantId?: string) {
    const where: any = {};
    if (tenantId) {
      where.tenantMemberships = { some: { tenantId } };
    }

    const [totalUsers, activeToday, superAdmins] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.count({
        where: {
          ...where,
          lastLoginAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.user.count({
        where: { ...where, role: 'SUPER_ADMIN' },
      }),
    ]);

    return { totalUsers, superAdmins, activeToday };
  }

  async getOverviewStats() {
    const cacheKey = 'super_admin_overview_stats';
    const cachedStats = await this.cacheManager.get(cacheKey);

    if (cachedStats) {
      return cachedStats;
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Parallelize heavily so we don't block
    const [
      totalInstitutions,
      activeInstitutions,
      totalUsers,
      totalBooks,
      activeSubscriptions,
      systemAdmins,
      // Infrastructure stats - mocked to 0 as tables were removed
      totalMediaFiles,
      mediaStorageResult,
      recentBooks,
      recentUsers,
      recentTenants,
      activeSessions,
      totalAuditLogs,
      // Book borrowing stats - mocked to 0
      borrowedBooks,
      overdueBooks,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { deletedAt: null } }),
      this.prisma.tenant.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.book.count(),
      Promise.resolve(0), // tenantSubscription model removed from schema
      this.prisma.user.count({
        where: { role: 'SUPER_ADMIN', deletedAt: null },
      }),
      // Media stats
      Promise.resolve(0),
      Promise.resolve({ _sum: { size: 0 } }),
      // Recent additions (last 24h)
      this.prisma.book.count({
        where: { createdAt: { gte: twentyFourHoursAgo } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: twentyFourHoursAgo }, deletedAt: null },
      }),
      this.prisma.tenant.count({
        where: { createdAt: { gte: twentyFourHoursAgo }, deletedAt: null },
      }),
      // Active sessions
      Promise.resolve(0),
      // Audit logs
      Promise.resolve(0),
      // Borrowed & overdue
      Promise.resolve(0),
      Promise.resolve(0),
    ]);

    const totalMediaSizeBytes = mediaStorageResult._sum.size || 0;
    const totalRecentAdditions = recentBooks + recentUsers + recentTenants;

    const stats = {
      institutions: { total: totalInstitutions, active: activeInstitutions },
      users: { total: totalUsers, superAdmins: systemAdmins },
      books: {
        total: totalBooks,
        borrowed: borrowedBooks,
        overdue: overdueBooks,
      },
      subscriptions: { active: activeSubscriptions },
      infrastructure: {
        database: {
          status: 'online',
          totalRecords:
            totalUsers + totalBooks + totalInstitutions + totalAuditLogs,
          tables: {
            users: totalUsers,
            books: totalBooks,
            tenants: totalInstitutions,
            auditLogs: totalAuditLogs,
          },
        },
        mediaStorage: {
          totalFiles: totalMediaFiles,
          totalSizeBytes: totalMediaSizeBytes,
          totalSizeFormatted: formatBytes(totalMediaSizeBytes),
        },
        recentAdditions: {
          total: totalRecentAdditions,
          books: recentBooks,
          users: recentUsers,
          tenants: recentTenants,
          period: '24h',
        },
        activeSessions: {
          count: activeSessions,
        },
      },
      retrievedAt: new Date().toISOString(),
    };

    // Cache for 60 seconds
    await this.cacheManager.set(cacheKey, stats, 60000);

    return stats;
  }

  async toggleUserStatus(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
  }

  async assignTenantRole(userId: string, tenantId: string, role: string) {
    const roleMap: Record<string, any> = {
      admin: 'ADMIN',
      librarian: 'LIBRARIAN',
      teacher: 'TEACHER',
      student: 'STUDENT',
    };
    const mappedRole = roleMap[role.toLowerCase()] || 'STUDENT';

    return this.prisma.userTenantMembership.upsert({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      update: {
        role: mappedRole,
      },
      create: {
        userId,
        tenantId,
        role: mappedRole,
        status: 'ACTIVE',
      },
    });
  }

  async assignCollections(
    userId: string,
    tenantId: string,
    collections: string[],
  ) {
    try {
      const membership = await this.prisma.userTenantMembership.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
      });

      if (!membership)
        throw new BadRequestException(
          'User is not a member of this institution',
        );

      const updated = await this.prisma.userTenantMembership.update({
        where: { userId_tenantId: { userId, tenantId } },
        data: {
          assignedCollections: collections,
        },
      });

      return { success: true, data: updated };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to assign collections');
    }
  }

  async createUser(data: any) {
    // Map role strings to Prisma UserRole enum
    const roleMap: Record<string, any> = {
      'super-admin': 'SUPER_ADMIN',
      super_admin: 'SUPER_ADMIN',
      admin: 'ADMIN',
      librarian: 'LIBRARIAN',
      teacher: 'TEACHER',
      student: 'STUDENT',
    };
    const tenantRoleMap: Record<string, any> = {
      admin: 'ADMIN',
      librarian: 'LIBRARIAN',
      teacher: 'TEACHER',
      student: 'STUDENT',
    };

    const userRole = roleMap[data.role?.toLowerCase()] || 'STUDENT';
    const tenantRole = tenantRoleMap[data.role?.toLowerCase()] || 'STUDENT';
    const accountType =
      data.accountType === 'INDEPENDENT' ? 'INDEPENDENT' : 'INSTITUTIONAL';

    // Parse metadata to split between User and TenantMembership. Blank form
    // fields are dropped rather than stored as empty strings.
    const compact = (o: Record<string, unknown>) => {
      const out = Object.fromEntries(
        Object.entries(o).filter(([, v]) => v !== undefined && v !== ''),
      );
      return Object.keys(out).length ? out : undefined;
    };
    let userMetadata: Record<string, unknown> | undefined = undefined;
    let membershipMetadata: Record<string, unknown> | undefined = undefined;

    if (accountType === 'INDEPENDENT') {
      userMetadata = {
        subscriptionTier: data.subscriptionTier || 'basic',
      };
    } else if (data.metadata) {
      userMetadata = compact({
        bloodGroup: data.metadata.bloodGroup,
        aadharNumber: data.metadata.aadharNumber,
        fatherName: data.metadata.fatherName,
        motherName: data.metadata.motherName,
        address: data.metadata.address,
      });
      membershipMetadata = compact({
        rollNo: data.metadata.rollNo,
        admissionNumber: data.metadata.admissionNumber,
      });
    }

    // The form sends a plain-text password (optional). Hash it, and write it to
    // both credential stores: User.password for the backend/mobile login and a
    // better-auth credential Account for the web login. Without the Account row
    // the new user could never sign in on the web.
    const userId = randomUUID();
    const hashedPassword = data.password
      ? await bcrypt.hash(String(data.password), 12)
      : undefined;

    return this.prisma.user.create({
      data: {
        id: userId,
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: userRole,
        accountType: accountType,
        isActive: true,
        emailVerified: false,
        metadata: userMetadata as any,
        accounts: hashedPassword
          ? {
              create: {
                id: randomUUID(),
                accountId: userId,
                providerId: 'credential',
                password: hashedPassword,
              },
            }
          : undefined,
        tenantMemberships: data.tenantId
          ? {
              create: {
                tenantId: data.tenantId,
                role: tenantRole,
                status: 'ACTIVE',
                metadata: membershipMetadata as any,
              },
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountType: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  // Branding methods
  async getBranding(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    return tenant?.branding || {};
  }

  async updateBranding(tenantId: string, brandingData: any) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        branding: brandingData,
      },
    });
  }

  async updateTenantBrandingPartial(tenantId: string, partialBranding: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const currentBranding = (tenant?.branding as Record<string, any>) || {};

    // Deep merge for specific properties if needed, or simple merge
    const updatedBranding = {
      ...currentBranding,
      ...partialBranding,
    };

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        branding: updatedBranding,
      },
    });
  }

  async publishTenantBranding(tenantId: string, version: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const branding = (tenant?.branding as Record<string, any>) || {};

    const updatedBranding = {
      ...branding,
      publishedState: {
        ...branding, // Copy current draft state to published
      },
      lastPublishedAt: new Date().toISOString(),
      publishedVersion: version,
    };

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        branding: updatedBranding,
      },
    });
  }

  async revertTenantBranding(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const branding = (tenant?.branding as Record<string, any>) || {};

    // If there is no published state, we can't revert
    if (!branding.publishedState) {
      throw new Error('No published state to revert to.');
    }

    // Replace current draft with published state, keeping the published state intact
    const updatedBranding = {
      ...branding.publishedState,
      publishedState: branding.publishedState,
      lastPublishedAt: branding.lastPublishedAt,
      publishedVersion: branding.publishedVersion,
    };

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        branding: updatedBranding,
      },
    });
  }

  async getAnyPublishedBranding() {
    // For demo/validation purposes, just get the first tenant's published branding
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        branding: {
          path: ['$.lastPublishedAt'],
          not: null,
        } as any,
      },
    });

    if (!tenant || !tenant.branding) return {};

    const b = tenant.branding as any;
    return b.publishedState || {};
  }

  // Audit log methods
  getAuditLogs(_filters: {
    tenantId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    action?: string;
  }) {
    // AuditLog model removed from schema — return empty array
    return Promise.resolve([]);
  }

  // ============================================
  // STORAGE ANALYTICS (Day 1)
  // ============================================

  async getStorageIntelligence() {
    // 1. Catalog Storage (BookFormats)
    const catalogData = await this.prisma.bookFormat.aggregate({
      _sum: { fileSize: true },
      _count: { id: true },
    });

    const catalogBytes = catalogData._sum.fileSize || 0;
    const catalogCount = catalogData._count.id || 0;

    const catalogByFormat = await this.prisma.bookFormat.groupBy({
      by: ['type'],
      _sum: { fileSize: true },
      _count: { id: true },
    });

    // 2. Personal Library Storage (Active)
    const personalData = await this.prisma.personalFile.aggregate({
      where: { deletedAt: null },
      _sum: { fileSize: true },
      _count: { id: true },
    });

    const personalBytes = personalData._sum.fileSize || 0;
    const personalCount = personalData._count.id || 0;

    const personalByFormat = await this.prisma.personalFile.groupBy({
      by: ['format'],
      where: { deletedAt: null },
      _sum: { fileSize: true },
      _count: { id: true },
    });

    // 3. Trash Storage (Soft-deleted Personal Files)
    const trashData = await this.prisma.personalFile.aggregate({
      where: { deletedAt: { not: null } },
      _sum: { fileSize: true },
      _count: { id: true },
    });

    const trashBytes = trashData._sum.fileSize || 0;

    // 4. Combine Formats
    const combinedFormats: Record<string, { bytes: number; count: number }> =
      {};

    // Add catalog formats
    catalogByFormat.forEach((f) => {
      const type = String(f.type).toLowerCase();
      if (!combinedFormats[type])
        combinedFormats[type] = { bytes: 0, count: 0 };
      combinedFormats[type].bytes += f._sum.fileSize || 0;
      combinedFormats[type].count += f._count.id || 0;
    });

    // Add personal formats
    personalByFormat.forEach((f) => {
      const type = String(f.format).toLowerCase();
      if (!combinedFormats[type])
        combinedFormats[type] = { bytes: 0, count: 0 };
      combinedFormats[type].bytes += f._sum.fileSize || 0;
      combinedFormats[type].count += f._count.id || 0;
    });

    const byFormat = Object.entries(combinedFormats).map(([format, data]) => ({
      format: format as any,
      bytes: data.bytes,
      count: data.count,
    }));

    // 5. Top Bloat Files
    const topCatalogFiles = await this.prisma.bookFormat.findMany({
      orderBy: { fileSize: 'desc' },
      take: 5,
      include: { book: true },
    });

    const topPersonalFiles = await this.prisma.personalFile.findMany({
      where: { deletedAt: null },
      orderBy: { fileSize: 'desc' },
      take: 5,
    });

    const allBloat = [
      ...topCatalogFiles.map((f) => ({
        id: f.id,
        title: f.book?.title || 'Unknown Book',
        format: f.type as any,
        fileSize: f.fileSize || 0,
        tenantId: f.book?.tenantId || null,
      })),
      ...topPersonalFiles.map((f) => ({
        id: f.id,
        title: f.title,
        format: f.format as any,
        fileSize: f.fileSize || 0,
        tenantId: null, // PersonalFiles are to users, we can trace tenant via membership but keep null for now
      })),
    ]
      .sort((a, b) => b.fileSize - a.fileSize)
      .slice(0, 10);

    // 6. Tier Health — stubbed until per-plan quota columns are added
    // (The TenantSubscription table schema has changed; we skip the query for now.)

    // Total numbers
    const totalBytes = catalogBytes + personalBytes + trashBytes;
    const totalFiles = catalogCount + personalCount;

    // Users At Risk (exceeding 100MB as an example) using the 'having' performance filter
    const highUsageUsers = await this.prisma.personalFile.groupBy({
      by: ['userId'],
      _sum: { fileSize: true },
      having: {
        fileSize: {
          _sum: {
            gt: 104857600, // > 100 MB
          },
        },
      },
      where: { deletedAt: null },
    });

    const usersAtRisk = highUsageUsers.map((u) => ({
      userId: u.userId,
      usedBytes: u._sum.fileSize || 0,
      riskLevel: (u._sum.fileSize || 0) > 524288000 ? 'critical' : 'warning',
    }));

    return {
      platformStorage: {
        totalBytes,
        catalogBytes,
        personalBytes,
        trashBytes,
        totalFiles,
        byFormat,
        topBloatFiles: allBloat,
      },
      tierHealth: {
        storageByTier: [], // Stubbed for now
        alertSummary: {
          atWarning: usersAtRisk.length,
          atCritical: usersAtRisk.filter((u) => u.riskLevel === 'critical')
            .length,
          atFull: 0,
        },
        usersAtRisk,
      },
    };
  }

  async purgeTrash(tenantId?: string) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - 7); // 7 day grace period

    // Find files in trash older than 7 days
    const filesToPurge = await this.prisma.personalFile.findMany({
      where: {
        deletedAt: {
          lte: expirationDate,
        },
        ...(tenantId
          ? { user: { tenantMemberships: { some: { tenantId } } } }
          : {}),
      },
      select: {
        id: true,
        storageKey: true,
      },
    });

    if (filesToPurge.length === 0) {
      return { purgedCount: 0, bytesFreed: 0 };
    }

    // Attempt to delete from S3
    const keys = filesToPurge.map((f) => f.storageKey);
    try {
      await this.s3Service.deleteMany(keys);
    } catch (e) {
      // Log error but proceed to delete from DB to prevent orphaned DB records
      console.error('Failed to bulk delete from S3 during purge', e);
    }

    // Delete from database
    const deleteResult = await this.prisma.personalFile.deleteMany({
      where: {
        id: { in: filesToPurge.map((f) => f.id) },
      },
    });

    return {
      purgedCount: deleteResult.count,
      // approximate bytes since we don't have them all loaded
    };
  }

  async notifyInstitution(tenantId: string, alertType: string) {
    // Idempotency check: don't notify same tenant for same alert if done recently
    const cacheKey = `storage_alert_${tenantId}_${alertType}`;
    const recentlyNotified = await this.cacheManager.get(cacheKey);

    if (recentlyNotified) {
      return {
        success: false,
        message: 'Notification already sent recently (idempotency triggered).',
      };
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        memberships: {
          where: { role: 'ADMIN' },
          include: { user: true },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const adminEmails = tenant.memberships.map((m) => m.user.email);

    // Log the notification creation (since we don't have a real email sender)
    console.log(
      `Sending ${alertType} storage alert to ${adminEmails.join(', ')}`,
    );

    // Lock out further notifications of this type for 24 hours
    await this.cacheManager.set(cacheKey, true, 24 * 60 * 60 * 1000);

    return {
      success: true,
      notifiedEmails: adminEmails,
      alertType,
    };
  }
}
