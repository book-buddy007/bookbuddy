"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStorageIntelligence } from "@/lib/api/adminApi";
import { formatBytes } from "@/utils/storage.utils";

// UI primitives
import { StatPill } from "@/components/ui/stat-pill";
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle, EnhancedCardDescription } from "@/components/ui/enhanced-card";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Button } from "@/components/ui/button";

// Storage components
import { StorageSkeleton, StorageErrorCard } from "@/components/super-admin/storage/StorageStates";
import { StorageSummaryStats, FormatBreakdownCard } from "@/components/super-admin/storage/FormatBreakdownCard";
import { TopBloatFilesCard, TrashCleanupBanner } from "@/components/super-admin/storage/TopBloatFilesCard";
import { TierStorageBars, UsersAtRiskTable } from "@/components/super-admin/storage/TierHealthCards";

// Icons
import {
  HardDrive,
  BookOpen,
  Library,
  Trash2,
  RefreshCw,
  BarChart3,
  Database,
  Activity,
} from "@/components/ui/icons";

const STORAGE_QUERY_KEY = ["super-admin", "storage-intelligence"] as const;
const STALE_TIME = 5 * 60 * 1000;

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
    <div className="space-y-8 animate-vg-fade-in-up">
      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 md:p-10 shadow-2xl mb-8 border border-white/10"
        style={{
          background:
            "linear-gradient(135deg, var(--night-ink) 0%, var(--indigo-deep) 30%, var(--peacock-teal) 60%, var(--deep-saffron) 100%)",
        }}
      >
        {/* Texture overlay */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              'url("https://www.transparenttextures.com/patterns/cubes.png")',
          }}
        />
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--deep-saffron)]/[0.15] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-[var(--deep-saffron)] mr-2 animate-pulse" />
              Platform Analytics
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm font-display">
              Storage Analytics
            </h1>
            <p className="text-indigo-100/90 text-lg max-w-xl font-medium">
              Monitor platform-wide storage health across the book and personal
              libraries.
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => refetch()}
            disabled={isLoading}
            className="shrink-0 bg-gradient-to-r from-[var(--deep-saffron)] to-[#FFAE42] hover:from-[#E68A2E] hover:to-[#FF9933] text-black shadow-lg shadow-[var(--deep-saffron)]/20 border-transparent font-bold !px-6"
          >
            <RefreshCw
              className={`h-5 w-5 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {isLoading && <StorageSkeleton />}

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {isError && !isLoading && (
        <StorageErrorCard
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      )}

      {/* ── Dashboard content ─────────────────────────────────────────────── */}
      {data && platform && tier && (
        <>
          {/* Trash cleanup banner */}
          <TrashCleanupBanner
            trashBytes={platform.trashBytes}
            onPurged={handlePurged}
          />

          {/* ── StatPill row ──────────────────────────────────────────────── */}
          <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
            <StatPill
              label="Total Storage"
              value={formatBytes(platform.totalBytes)}
              subLabel={`${platform.totalFiles.toLocaleString()} files stored`}
              icon={<HardDrive className="h-5 w-5" />}
              accent="saffron"
              isLoading={isLoading}
            />
            <StatPill
              label="Book Library"
              value={formatBytes(platform.catalogBytes)}
              subLabel="Books & formats"
              icon={<BookOpen className="h-5 w-5" />}
              accent="teal"
              isLoading={isLoading}
              delayMs={100}
            />
            <StatPill
              label="Personal Library"
              value={formatBytes(platform.personalBytes)}
              subLabel="User uploads (active)"
              icon={<Library className="h-5 w-5" />}
              accent="gold"
              isLoading={isLoading}
              delayMs={200}
            />
            <StatPill
              label="Trash"
              value={formatBytes(platform.trashBytes)}
              subLabel="Pending purge (>7d auto)"
              icon={<Trash2 className="h-5 w-5" />}
              accent="kumkum"
              isLoading={isLoading}
              delayMs={300}
            />
          </div>

          {/* ── Breakdown Section ─────────────────────────────────────────── */}
          <div>
            <h2
              className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2 tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Database className="h-5 w-5 text-[var(--peacock-teal)]" />
              Storage Breakdown
            </h2>
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
          </div>

          {/* ── Top Bloat Files ────────────────────────────────────────────── */}
          <div>
            <h2
              className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2 tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Activity className="h-5 w-5 text-[var(--deep-saffron)]" />
              Largest Files
            </h2>
            <TopBloatFilesCard files={platform.topBloatFiles} />
          </div>

          {/* ── Tier Health ────────────────────────────────────────────────── */}
          <div>
            <h2
              className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2 tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <BarChart3 className="h-5 w-5 text-[var(--peacock-teal)]" />
              Tier Health & User Risk
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <TierStorageBars data={tier.storageByTier} />
              <UsersAtRiskTable
                users={tier.usersAtRisk as any}
                alertSummary={tier.alertSummary}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}