import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';

/**
 * Access tier enum — matches Prisma AccessTier
 */
export enum AccessTierDto {
  FREE = 'FREE',
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  DIAMOND = 'DIAMOND',
}

/**
 * License type enum — matches Prisma LicenseType
 */
export enum LicenseTypeDto {
  UNKNOWN = 'UNKNOWN',
  AI_PERMITTED = 'AI_PERMITTED',
  AI_RESTRICTED = 'AI_RESTRICTED',
}

/**
 * Catalog scope enum — matches Prisma CatalogScope
 */
export enum CatalogScopeDto {
  GLOBAL = 'GLOBAL',
  INSTITUTIONAL = 'INSTITUTIONAL',
}

/**
 * DTO for updating a book via the super-admin catalog.
 *
 * This class works with NestJS's global ValidationPipe({ whitelist: true })
 * to strip any unknown fields (e.g. `coverImage`) before they reach Prisma.
 *
 * Field names MUST exactly match the Prisma schema's Book model.
 * Each field is optional — only the fields sent are updated.
 *
 * Fields intentionally EXCLUDED (set by system only):
 *   embeddingStatus, vectorCollectionId, embeddingStartedAt,
 *   licenseVerifiedBy, licenseVerifiedAt, licenseDocumentUrl,
 *   tenantId, createdAt, updatedAt, globalPublishRequestedAt,
 *   globalPublishRequestedBy, globalPublishReviewedAt,
 *   globalPublishReviewedBy, globalPublishRejectionNote
 */
export class UpdateBookDto {
  // ── Identity ──────────────────────────────────────────────────────────────
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() author?: string;
  @IsString() @IsOptional() publisher?: string;
  @IsInt() @IsOptional() @Min(1000) @Max(2100) publishYear?: number;
  @IsString() @IsOptional() isbn?: string;
  @IsInt() @IsOptional() @Min(1) pages?: number;
  @IsString() @IsOptional() language?: string;
  @IsString() @IsOptional() description?: string;

  // ── Classification ────────────────────────────────────────────────────────
  @IsString() @IsOptional() genre?: string;
  @IsString() @IsOptional() format?: string;

  @IsEnum(AccessTierDto) @IsOptional() accessTier?: AccessTierDto;
  @IsEnum(LicenseTypeDto) @IsOptional() licenseType?: LicenseTypeDto;
  @IsBoolean() @IsOptional() aiEmbedEnabled?: boolean;

  // ── Cover images — field names match Prisma exactly ───────────────────────
  @IsString() @IsOptional() coverUrl?: string;
  @IsString() @IsOptional() coverKey?: string;
  @IsString() @IsOptional() backCoverUrl?: string;
  @IsString() @IsOptional() backCoverKey?: string;

  // ── Sample file ───────────────────────────────────────────────────────────
  @IsString() @IsOptional() sampleFileUrl?: string;
  @IsString() @IsOptional() sampleFileKey?: string;

  // ── Catalog scope ─────────────────────────────────────────────────────────
  @IsEnum(CatalogScopeDto) @IsOptional() catalogScope?: CatalogScopeDto;

  // ── Availability ──────────────────────────────────────────────────────────
  @IsBoolean() @IsOptional() available?: boolean;
  @IsBoolean() @IsOptional() drmProtected?: boolean;
  @IsBoolean() @IsOptional() streamable?: boolean;

  // ── Categories (relational — handled separately by service) ───────────────
  @IsArray() @IsOptional() @IsString({ each: true }) categoryIds?: string[];
}
