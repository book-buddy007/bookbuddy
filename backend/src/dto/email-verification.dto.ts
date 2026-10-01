import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for email verification
 */
export class VerifyEmailDto {
  @IsNotEmpty({ message: 'Verification token is required' })
  @IsString()
  token: string;
}

/**
 * DTO for resending email verification
 */
export class ResendVerificationDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email: string;
}
