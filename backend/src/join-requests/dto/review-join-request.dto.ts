import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for PUT /join-requests/:id/reject.
 *
 * The reviewer is taken from the session rather than the body, so an
 * administrator cannot be recorded as having approved something they did not.
 */
export class RejectJoinRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}

/** Body for PUT /join-requests/:id/approve — role may be adjusted on approval. */
export class ApproveJoinRequestDto {
  @IsOptional()
  @IsString()
  role?: string;
}
