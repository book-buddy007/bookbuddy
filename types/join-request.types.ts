/**
 * Join request types, shared by the student and admin surfaces.
 *
 * Shapes mirror what `backend/src/join-requests/join-requests.service.ts`
 * actually selects (`REQUESTER_SUMMARY` / `TENANT_SUMMARY`) rather than the
 * full Prisma models, so the types describe the wire format and not the
 * database row.
 */

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Requester summary included on the tenant review queue. */
export interface JoinRequestUser {
  id: string;
  name: string | null;
  email: string;
  profilePicture: string | null;
  emailVerified: boolean;
}

/** Institution summary included on every join request. */
export interface JoinRequestTenant {
  id: string;
  name: string;
  domain: string | null;
  type: string | null;
  logoUrl: string | null;
}

export interface JoinRequest {
  id: string;
  tenantId: string;
  userId: string;
  status: JoinRequestStatus;
  requestedRole: string;
  message: string | null;
  /** Storage key, not a URL — presign before showing it to anyone. */
  proofDocument: string | null;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tenant: JoinRequestTenant;
  /** Present on the tenant review queue; absent on a user's own requests. */
  user?: JoinRequestUser;
}

/** Response of GET /api/join-requests/check?tenantId= */
export interface JoinRequestCheck {
  hasRequest: boolean;
  status: JoinRequestStatus | null;
  request: JoinRequest | null;
  isMember: boolean;
  membershipStatus: string | null;
}

export interface CreateJoinRequestInput {
  tenantId: string;
  message?: string;
  proofDocument?: string;
}
