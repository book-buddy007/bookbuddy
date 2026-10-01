'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateJoinRequestInput,
  JoinRequest,
  JoinRequestCheck,
  JoinRequestStatus,
} from '@/types/join-request.types';

/**
 * React Query bindings for the join-requests API.
 *
 * These call the `/api/join-requests/*` route handlers rather than the backend
 * directly: those handlers attach the Better Auth session cookie as a bearer
 * token, and the backend derives the acting user from that session. No hook
 * here passes a `userId` — doing so is what previously let a caller act as
 * somebody else.
 */

const JOIN_REQUESTS_KEY = 'join-requests';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${response.status})`);
  }

  return data as T;
}

/**
 * The review queue for one institution. Admins and librarians only — the
 * backend rejects anyone else, so guard the calling screen accordingly.
 */
export function useTenantJoinRequests(
  tenantId: string | null | undefined,
  status?: JoinRequestStatus | 'all',
) {
  return useQuery<JoinRequest[]>({
    queryKey: [JOIN_REQUESTS_KEY, 'tenant', tenantId, status ?? 'all'],
    queryFn: () => {
      const query = status && status !== 'all' ? `?status=${status}` : '';
      return request<JoinRequest[]>(`/api/join-requests/tenant/${tenantId}${query}`);
    },
    enabled: !!tenantId,
    // Requests are acted on by several administrators at once, so a stale
    // queue is actively misleading rather than merely out of date.
    staleTime: 30 * 1000,
  });
}

/** Pending count, derived from the queue so no extra endpoint is needed. */
export function useTenantPendingCount(tenantId: string | null | undefined) {
  const query = useTenantJoinRequests(tenantId);
  return {
    ...query,
    count: (query.data ?? []).filter((r) => r.status === 'PENDING').length,
  };
}

/** The signed-in user's own requests, newest first. */
export function useMyJoinRequests() {
  return useQuery<JoinRequest[]>({
    queryKey: [JOIN_REQUESTS_KEY, 'me'],
    queryFn: () => request<JoinRequest[]>('/api/join-requests/user'),
    staleTime: 30 * 1000,
  });
}

/** Whether the user already applied to a given institution. */
export function useJoinRequestCheck(tenantId: string | null | undefined) {
  return useQuery<JoinRequestCheck>({
    queryKey: [JOIN_REQUESTS_KEY, 'check', tenantId],
    queryFn: () => request<JoinRequestCheck>(`/api/join-requests/check?tenantId=${tenantId}`),
    enabled: !!tenantId,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [JOIN_REQUESTS_KEY] });
}

export function useCreateJoinRequest() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (input: CreateJoinRequestInput) =>
      request<JoinRequest>('/api/join-requests/create', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

/** Approving also grants the membership — that happens in one backend transaction. */
export function useApproveJoinRequest() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role?: string }) =>
      request<JoinRequest>(`/api/join-requests/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify(role ? { role } : {}),
      }),
    onSuccess: invalidate,
  });
}

export function useRejectJoinRequest() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason?: string }) =>
      request<JoinRequest>(`/api/join-requests/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ rejectionReason }),
      }),
    onSuccess: invalidate,
  });
}

/** Withdraw one's own pending request. */
export function useCancelJoinRequest() {
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: (id: string) =>
      request<{ success: boolean; message: string }>(
        `/api/join-requests/${id}/cancel`,
        { method: 'DELETE' },
      ),
    onSuccess: invalidate,
  });
}
