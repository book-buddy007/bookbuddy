import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async completeOnboarding(
    userId: string,
    data: {
      accountType?: 'INDEPENDENT' | 'INSTITUTIONAL';
      onboardingStep?: number;
      gradeLevel?: number;
    } = {},
  ) {
    // 1. Fetch user to ensure idempotency
    const userPre = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!userPre) {
      throw new NotFoundException('User not found');
    }

    const targetStep =
      data.onboardingStep !== undefined ? data.onboardingStep : 3;

    // Cannot advance to step 2 unless email is verified at DB level
    if (targetStep === 2 && !userPre.emailVerified) {
      throw new BadRequestException('Email must be verified before proceeding');
    }

    // Cannot complete onboarding without accountType
    if (targetStep >= 3 && !data.accountType && !userPre.accountType) {
      throw new BadRequestException(
        'accountType is required to complete onboarding',
      );
    }

    // Prevent step regression
    if (targetStep < userPre.onboardingStep) {
      throw new BadRequestException(
        'Cannot go back to a previous onboarding step',
      );
    }

    // Early return if already done
    if (userPre.onboardingCompleted && targetStep === userPre.onboardingStep) {
      return { message: 'Already completed', user: userPre };
    }

    const updateData: any = {
      onboardingStep: targetStep,
    };

    if (data.accountType) {
      updateData.accountType = data.accountType;
    }

    // Independent (B2C) students have no Vidyaverse Class/Section to resolve
    // gradeLevel from, so it's self-reported here at onboarding. Institutional
    // students' gradeLevel is instead kept in sync from the academic-profile
    // hub (see app/api/user/academic-profile/route.ts) — a value submitted
    // here for an institutional account would just be overwritten on the
    // next hub sync, so silently accepting it would be misleading.
    if (data.gradeLevel !== undefined) {
      if (
        !Number.isInteger(data.gradeLevel) ||
        data.gradeLevel < 1 ||
        data.gradeLevel > 12
      ) {
        throw new BadRequestException(
          'gradeLevel must be an integer between 1 and 12',
        );
      }
      const resolvedAccountType = data.accountType ?? userPre.accountType;
      if (resolvedAccountType === 'INDEPENDENT') {
        updateData.gradeLevel = data.gradeLevel;
      }
    }

    if (targetStep >= 3) {
      updateData.onboardingCompleted = true;
    }

    // Update user's onboarding status
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountType: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        onboardingCompleted: true,
        onboardingStep: true,
        gradeLevel: true,
      },
    });

    // Log the action in audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'complete_onboarding',
        entityType: 'user',
        entityId: userId,
        metadata: { timestamp: new Date() },
      },
    });

    return {
      message: 'Onboarding completed successfully',
      user,
    };
  }

  async getMemberships(userId: string) {
    const memberships = await this.prisma.userTenantMembership.findMany({
      where: { userId },
      select: {
        tenantId: true,
        role: true,
        status: true,
        tenant: { select: { name: true, type: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      tenantId: m.tenantId,
      tenantName: m.tenant.name,
      tenantType: m.tenant.type,
      role: m.role,
      status: m.status,
    }));
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        phoneVerified: true,
        emailVerified: true,
        pendingPhone: true,
        pendingEmail: true,
        profilePicture: true,
        role: true,
        accountType: true,
        metadata: true,
        onboardingCompleted: true,
        onboardingStep: true,
        tenantMemberships: {
          select: {
            id: true,
            role: true,
            status: true,
            tenantId: true,
            tenant: {
              select: {
                id: true,
                name: true,
                domain: true,
                type: true,
                logoUrl: true,
              },
            },
          },
        },
        joinRequests: {
          select: {
            id: true,
            status: true,
            tenant: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, data: any) {
    const updateData: any = {};

    // Standard fields
    if (data.name !== undefined) updateData.name = data.name;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.profilePicture !== undefined)
      updateData.profilePicture = data.profilePicture;

    // Secure updates for contact info
    if (data.phone !== undefined) {
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      });
      if (data.phone !== current?.phone) {
        // Only set as pending if it's changing
        updateData.pendingPhone = data.phone;
        // Optionally, you might want to return an indicator that verification is needed
      }
    }

    if (data.email !== undefined) {
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (data.email !== current?.email) {
        updateData.pendingEmail = data.email;
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        phoneVerified: true,
        emailVerified: true,
        pendingPhone: true,
        pendingEmail: true,
        profilePicture: true,
        metadata: true,
      },
    });

    // Log the update
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'update_profile',
        entityType: 'user',
        entityId: userId,
        metadata: {
          timestamp: new Date(),
          updatedFields: Object.keys(updateData),
        },
      },
    });

    return updatedUser;
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Delete active sessions and device tokens
    await this.prisma.session.deleteMany({ where: { userId } });
    await this.prisma.deviceToken.deleteMany({ where: { userId } });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    // 2. Soft-delete and anonymize user PII
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@anonymized.bookbuddyvpd.com`,
        name: 'Deleted User',
        phone: null,
        pendingPhone: null,
        pendingEmail: null,
        googleId: null,
        profilePicture: null,
        isActive: false,
        deletedAt: new Date(),
      },
    });

    // 3. Create audit log entry
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'delete_account',
        entityType: 'user',
        entityId: userId,
        metadata: { timestamp: new Date() },
      },
    });

    return {
      success: true,
      message: 'Account and associated data deleted successfully.',
    };
  }
}
