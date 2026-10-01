import { apiFetch } from './client';
import type { JoinRequest, JoinRequestCheck } from './types';

/**
 * Institutional access requests.
 *
 * The requester is taken from the session server-side — there is no `userId`
 * parameter on any of these, by design.
 */
export function createJoinRequest(input: {
  tenantId: string;
  message?: string;
  proofDocument?: string;
}) {
  return apiFetch<JoinRequest>('/join-requests', {
    method: 'POST',
    body: input,
  });
}

/** GET /join-requests/me — every request this user has filed, newest first. */
export function getMyJoinRequests() {
  return apiFetch<JoinRequest[]>('/join-requests/me');
}

/**
 * GET /join-requests/check/:tenantId — lets the browse list show "Pending" or
 * "Member" instead of a Join button that would be rejected.
 */
export function checkJoinRequest(tenantId: string) {
  return apiFetch<JoinRequestCheck>(`/join-requests/check/${tenantId}`);
}

/** DELETE /join-requests/:id — withdraw a pending request. */
export function cancelJoinRequest(id: string) {
  return apiFetch<{ success: boolean; message: string }>(`/join-requests/${id}`, {
    method: 'DELETE',
  });
}
