import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Enhanced Login DTO with email normalization
 * Supports optional MFA code for two-factor authentication
 */
export class LoginDto {
  @IsNotEmpty({ message: 'Email should not be empty' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @IsNotEmpty({ message: 'Password should not be empty' })
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(6, { message: 'MFA code must be 6 digits' })
  mfaCode?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}
