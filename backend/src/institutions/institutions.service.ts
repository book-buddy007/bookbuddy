import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstitutionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all active institutions available for browsing
   * Includes subscription and settings information
   */
  async getBrowseableInstitutions(filters?: {
    type?: string;
    location?: string;
    search?: string;
  }) {
    const where: any = {
      isActive: true,
      allowJoinRequests: true, // Only show institutions that allow join requests
    };

    // Apply filters
    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.location) {
      where.location = {
        contains: filters.location,
      };
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
        { domain: { contains: filters.search } },
      ];
    }

    const institutions = await this.prisma.tenant.findMany({
      where,
      include: {
        subscriptions: {
          where: {
            status: 'ACTIVE',
          },
          orderBy: {
            endDate: 'desc',
          },
          take: 1,
        },
        settings: {
          select: {
            allowStudentSignup: true,
            requireApproval: true,
          },
        },
        _count: {
          select: {
            memberships: true,
            books: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform the data for frontend consumption
    return institutions.map((institution) => ({
      id: institution.id,
      name: institution.name,
      domain: institution.domain,
      type: institution.type,
      description: institution.description,
      location: institution.location,
      logoUrl: institution.logoUrl,
      branding: institution.branding,
      subscriptionTier: institution.subscriptions[0]?.tier || null,
      memberCount: institution._count.memberships,
      bookCount: institution._count.books,
      allowStudentSignup: institution.settings?.allowStudentSignup ?? true,
      requireApproval: institution.settings?.requireApproval ?? true,
      createdAt: institution.createdAt,
    }));
  }

  /**
   * Get a single institution by ID with detailed information
   */
  async getInstitutionById(id: string) {
    const institution = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        subscriptions: {
          where: {
            status: 'ACTIVE',
          },
          orderBy: {
            endDate: 'desc',
          },
          take: 1,
        },
        settings: true,
        _count: {
          select: {
            memberships: true,
            books: true,
            joinRequests: true,
          },
        },
      },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    return {
      id: institution.id,
      name: institution.name,
      domain: institution.domain,
      type: institution.type,
      description: institution.description,
      location: institution.location,
      logoUrl: institution.logoUrl,
      branding: institution.branding,
      isActive: institution.isActive,
      allowJoinRequests: institution.allowJoinRequests,
      subscriptionTier: institution.subscriptions[0]?.tier || null,
      subscriptionEndDate: institution.subscriptions[0]?.endDate || null,
      memberCount: institution._count.memberships,
      bookCount: institution._count.books,
      pendingRequestCount: institution._count.joinRequests,
      settings: institution.settings,
      createdAt: institution.createdAt,
      updatedAt: institution.updatedAt,
    };
  }

  /**
   * Get institution types for filter dropdown
   */
  async getInstitutionTypes() {
    const types = await this.prisma.tenant.groupBy({
      by: ['type'],
      where: {
        isActive: true,
        allowJoinRequests: true,
      },
      _count: {
        type: true,
      },
    });

    return types.map((t) => ({
      value: t.type,
      label: this.formatTypeLabel(t.type),
      count: t._count.type,
    }));
  }

  /**
   * Get unique locations for filter dropdown
   */
  async getInstitutionLocations() {
    const institutions = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        allowJoinRequests: true,
        location: {
          not: null,
        },
      },
      select: {
        location: true,
      },
      distinct: ['location'],
    });

    return institutions
      .map((i) => i.location)
      .filter((l): l is string => l !== null)
      .sort();
  }

  /**
   * Format institution type for display
   */
  private formatTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      school: 'School',
      college: 'College',
      university: 'University',
      corporate: 'Corporate',
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }
}
