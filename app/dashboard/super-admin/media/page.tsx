"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStorageIntelligence } from "@/lib/api/adminApi";
import { formatBytes } from "@/utils/storage.utils";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

import { StorageSkeleton, StorageErrorCard } from "@/components/super-admin/storage/StorageStates";
import { StorageSummaryStats, FormatBreakdownCard } from "@/components/super-admin/storage/FormatBreakdownCard";
import { TopBloatFilesCard, TrashCleanupBanner } from "@/components/super-admin/storage/TopBloatFilesCard";
import { TierStorageBars, UsersAtRiskTable } from "@/components/super-admin/storage/TierHealthCards";

const STORAGE_QUERY_KEY = ["super-admin", "storage-intelligence"] as const;
const STALE_TIME = 5 * 60 * 1000;

const sectionTitle = "font-display text-xl font-extrabold tracking-[-0.02em]";

export default function SuperAdminStoragePage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: STORAGE_QUERY_KEY,
    queryFn: async () => {
      const res = await getStorageIntelligence();
      if (!res.success) throw new Error(res.error ?? "Failed to fetch storage data");
      return res.data;
    },
    staleTime: STALE_TIME,
    retry: 2,
  });

  const handlePurged = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: STORAGE_QUERY_KEY });
  }, [queryClient]);

  const platform = data?.platformStorage;
  const tier = data?.tierHealth;

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Platform analytics"
        title="Storage analytics"
        description="Monitor platform-wide storage health across the book and personal libraries."
        actions={
          <Button size="lg" onClick={() => refetch()} disabled={isLoading}>
            <Icon name="rotate-cw" size={18} className={isLoading ? "animate-spin" : ""} /> Refresh data
          </Button>
        }
      />

      {isLoading && <StorageSkeleton />}

      {isError && !isLoading && (
        <StorageErrorCard message={(error as Error)?.message} onRetry={() => refetch()} />
      )}

      {data && platform && tier && (
        <>
          <TrashCleanupBanner trashBytes={platform.trashBytes} onPurged={handlePurged} />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              variant="featured"
              title="Total storage"
              value={formatBytes(platform.totalBytes)}
              description={`${platform.totalFiles.toLocaleString()} files stored`}
              icon="database"
            />
            <StatCard
              title="Book library"
              value={formatBytes(platform.catalogBytes)}
              description="Books & formats"
              icon="library"
            />
            <StatCard
              title="Personal library"
              value={formatBytes(platform.personalBytes)}
              description="User uploads (active)"
              icon="folder"
            />
            <StatCard
              title="Trash"
              value={formatBytes(platform.trashBytes)}
              description="Pending purge (>7d auto)"
              icon="trash"
            />
          </div>

          <section className="space-y-4">
            <h2 className={sectionTitle}>Storage breakdown</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <StorageSummaryStats
                totalBytes={platform.totalBytes}
                catalogBytes={platform.catalogBytes}
                personalBytes={platform.personalBytes}
                trashBytes={platform.trashBytes}
                totalFiles={platform.totalFiles}
              />
              <FormatBreakdownCard data={platform.byFormat} />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className={sectionTitle}>Largest files</h2>
            <TopBloatFilesCard files={platform.topBloatFiles} />
          </section>

          <section className="space-y-4">
            <h2 className={sectionTitle}>Tier health &amp; user risk</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <TierStorageBars data={tier.storageByTier} />
              <UsersAtRiskTable users={tier.usersAtRisk as any} alertSummary={tier.alertSummary} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
