import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TenantRole } from '@prisma/client';
import { Transform } from 'class-transformer';

/**
 * Body for POST /join-requests.
 *
 * The requesting user is taken from the session, never from the body — an
 * earlier iteration of the web client passed `userId` explicitly, which would
 * have let any caller file a request on someone else's behalf.
 */
export class CreateJoinRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Institution is required' })
  tenantId: string;

  /** Students are the only self-service role; staff are invited. */
  @IsOptional()
  // Clients send 'student'; the enum is upper-case. Accept either.
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(TenantRole)
  requestedRole?: TenantRole;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Message must be 1000 characters or fewer' })
  message?: string;

  /** URL of an uploaded proof document (student ID, enrolment letter). */
  @IsOptional()
  @IsString()
  proofDocument?: string;
}
