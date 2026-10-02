import {
  IsString,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

export class UpdateTenantSubscriptionDto {
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @IsString()
  @IsOptional()
  billingCycle?: string;

  @IsString()
  @IsOptional()
  planId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxBooksOverride?: number | null;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxDevicesOverride?: number | null;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxStorageOverride?: number | null;

  @IsBoolean()
  @IsOptional()
  aiChatOverride?: boolean | null;

  @IsString()
  @IsOptional()
  cancelReason?: string;
}
