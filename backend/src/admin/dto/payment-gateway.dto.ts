import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreatePaymentGatewayDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsBoolean()
  @IsOptional()
  isConfigured?: boolean;

  @IsBoolean()
  isActive: boolean;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @IsArray()
  @IsOptional()
  supportedCurrencies?: string[];

  @IsObject()
  @IsOptional()
  supportedMethods?: Record<string, any>;

  @IsBoolean()
  testModeEnabled: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  docsUrl?: string;
}

export class UpdatePaymentGatewayDto extends PartialType(
  CreatePaymentGatewayDto,
) {}
