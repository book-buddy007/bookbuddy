"use client";

import { useQuery } from "@tanstack/react-query";
import { useAdminTenant } from "@/hooks/use-admin-tenant";
import {
  fetchAnalytics,
  fetchOverdue,
  fetchOverview,
  fetchPolicies,
  type AnalyticsRange,
} from "@/lib/tenant-admin";

/**
 * Read hooks for the admin pages, all scoped to the admin's resolved institution. Each is
 * disabled until the institution is known, and react-query shares the result between components
 * (the dashboard cards and the dashboard activity panel use one request).
 */

export function useAdminOverview() {
  const { tenantId } = useAdminTenant();
  return useQuery({
    queryKey: ["tenant-admin", tenantId, "overview"],
    queryFn: ({ signal }) => fetchOverview(tenantId!, signal),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useAdminOverdue() {
  const { tenantId } = useAdminTenant();
  return useQuery({
    queryKey: ["tenant-admin", tenantId, "overdue"],
    queryFn: ({ signal }) => fetchOverdue(tenantId!, signal),
    enabled: !!tenantId,
    staleTime: 15_000,
  });
}

export function useAdminAnalytics(range: AnalyticsRange) {
  const { tenantId } = useAdminTenant();
  return useQuery({
    queryKey: ["tenant-admin", tenantId, "analytics", range],
    queryFn: ({ signal }) => fetchAnalytics(tenantId!, range, signal),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useAdminPolicies() {
  const { tenantId } = useAdminTenant();
  return useQuery({
    queryKey: ["tenant-admin", tenantId, "policies"],
    queryFn: ({ signal }) => fetchPolicies(tenantId!, signal),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}
