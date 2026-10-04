"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore, useTenantStore } from "@/store/useAuthStore";

interface Membership {
  tenantId: string;
  tenantName: string;
  role: string;
  status: string;
}

/**
 * The institution an admin page should act on.
 *
 * `useAuthStore().currentTenantId` cannot be used for this: the Better Auth session user carries
 * no memberships and nothing ever calls `switchTenant`, so it is null for everyone. Resolve from
 * the user's real memberships instead: the stored choice if they still have an active membership
 * in it, otherwise their first active admin membership, otherwise their first active membership.
 * The backend re-checks the caller's role on every request regardless.
 */
export function useAdminTenant(): { tenantId: string | null; loading: boolean } {
  const { user, isAuthenticated } = useAuthStore();
  const storedTenantId = useTenantStore((s) => s.currentTenantId);

  const { data, isLoading } = useQuery<Membership[]>({
    queryKey: ["memberships", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user/memberships", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load memberships");
      return res.json();
    },
    enabled: !!user?.id && isAuthenticated,
    staleTime: 30_000,
  });

  const tenantId = useMemo(() => {
    const active = (data ?? []).filter((m) => m.status === "ACTIVE");
    if (storedTenantId && active.some((m) => m.tenantId === storedTenantId)) return storedTenantId;
    return (active.find((m) => m.role === "ADMIN") ?? active[0])?.tenantId ?? null;
  }, [data, storedTenantId]);

  return { tenantId, loading: isLoading };
}
