import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsStrongPassword } from '../validators/password.validator';

/**
 * Enhanced Registration DTO with stronger validation
 * Supports both B2C (independent students) and B2B (institutional users)
 */
export class RegisterDto {
  @IsNotEmpty({ message: 'Name should not be empty' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'Name can only contain letters, spaces, hyphens, and apostrophes',
  })
  name: string;

  @IsNotEmpty({ message: 'Email should not be empty' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @IsNotEmpty({ message: 'Password should not be empty' })
  @IsString()
  @IsStrongPassword()
  password: string;

  @IsOptional()
  @IsEnum(['super-admin', 'admin', 'librarian', 'teacher', 'student'], {
    message:
      'Role must be one of: super-admin, admin, librarian, teacher, student',
  })
  role?: string; // Ignored except to refuse staff roles: public sign-up only ever creates a student.

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Invitation token must be at least 10 characters' })
  invitationToken?: string; // Deprecated and ignored: it was never verified, so it cannot authorise anything.

  @IsOptional()
  @IsEnum(['trial', 'basic', 'premium'], {
    message: 'Subscription tier must be one of: trial, basic, premium',
  })
  subscriptionTier?: string; // Ignored: a sign-up always starts on the trial tier.
}
