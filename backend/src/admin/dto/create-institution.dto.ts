import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MaxLength,
  IsUrl,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TenantType } from '@prisma/client';

export class CreateInstitutionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value.trim())
  name: string;

  @IsUrl()
  @IsOptional()
  domain?: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  adminName: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsBoolean()
  @IsOptional()
  allowJoinRequests?: boolean;

  @IsEnum(TenantType)
  @IsOptional()
  type?: TenantType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsOptional()
  branding?: any;
}
