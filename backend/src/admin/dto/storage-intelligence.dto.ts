import { BookFormatType } from '@prisma/client';

export class FormatBreakdownDto {
  format: BookFormatType;
  bytes: number;
  count: number;
}

export class BloatFileDto {
  id: string;
  title: string;
  format: BookFormatType;
  fileSize: number;
  tenantId: string | null;
}

export class TierStorageDto {
  tier: string;
  userCount: number;
  usedBytes: number;
  quotaBytes: number;
}

export class UserAtRiskDto {
  userId: string;
  tier: string;
  used: number;
  quota: number;
  pct: number;
  tenantId: string | null;
}

export class StorageIntelligenceDto {
  platformStorage: {
    totalBytes: number;
    catalogBytes: number;
    personalBytes: number;
    trashBytes: number;
    totalFiles: number;
    byFormat: FormatBreakdownDto[];
    topBloatFiles: BloatFileDto[];
  };

  tierHealth: {
    storageByTier: TierStorageDto[];
    alertSummary: {
      atWarning: number;
      atCritical: number;
      atFull: number;
    };
    usersAtRisk: UserAtRiskDto[];
  };
}

export class NotifyInstitutionDto {
  tenantId: string;
  tier: string;
  affectedUsers: number;
}
