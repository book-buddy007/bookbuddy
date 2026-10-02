import { Exclude } from 'class-transformer';
import { Tenant, TenantType } from '@prisma/client';

export class InstitutionEntity implements Tenant {
  id: string;
  name: string;
  domain: string;
  type: TenantType;
  description: string | null;
  location: string | null;
  logoUrl: string | null;
  branding: any;
  isActive: boolean;
  allowJoinRequests: boolean;
  isGlobalPublisher: boolean;
  slug: string | null;
  logo: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // The critical privacy fields we MUST hide from API Responses
  @Exclude()
  metadata: string | null;

  constructor(partial: Partial<InstitutionEntity>) {
    Object.assign(this, partial);
  }
}
