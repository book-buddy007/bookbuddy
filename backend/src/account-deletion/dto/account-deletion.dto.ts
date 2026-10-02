import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Body for POST /auth/request-account-deletion. */
export class RequestAccountDeletionDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

/** Body for POST /auth/confirm-account-deletion. */
export class ConfirmAccountDeletionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  token: string;
}
