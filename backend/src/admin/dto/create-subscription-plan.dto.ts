import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { AccessTier } from '@prisma/client';

export class CreateSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AccessTier)
  tier: AccessTier;

  @IsNumber()
  monthlyPrice: number;

  @IsNumber()
  annualPrice: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(0)
  trialDays: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxBooks?: number | null;

  @IsBoolean()
  aiChatEnabled: boolean;

  @IsBoolean()
  audioEnabled: boolean;

  @IsBoolean()
  annotationsEnabled: boolean;

  @IsBoolean()
  flashcardsEnabled: boolean;

  @IsBoolean()
  downloadEnabled: boolean;

  @IsNumber()
  @Min(1)
  maxDevices: number;

  @IsArray()
  @IsOptional()
  features?: any[];

  @IsBoolean()
  isPublic: boolean;

  @IsNumber()
  sortOrder: number;
}
