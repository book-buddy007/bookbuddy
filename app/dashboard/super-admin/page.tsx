"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { SuperAdminStats } from "@/components/super-admin/stats"
import { InstitutionsList } from "@/components/super-admin/institutions-list"
import { AuditLogs } from "@/components/super-admin/audit-logs"
import { useOverviewStats } from "@/app/dashboard/super-admin/hooks/useSuperAdmin"

export default function SuperAdminOverviewPage() {
  const { data: statsData, isLoading, error: statsError, refetch } = useOverviewStats();
  const infra = statsData?.infrastructure;

  const dbTotalRecords = infra?.database?.totalRecords ?? 0;
  const mediaFormatted = infra?.mediaStorage?.totalSizeFormatted || '0 B';
  const mediaTotalFiles = infra?.mediaStorage?.totalFiles ?? 0;
  const recentTotal = infra?.recentAdditions?.total ?? 0;
  const activeSessions = infra?.activeSessions?.count ?? 0;

  // Auto-retry when backend is starting up
  useEffect(() => {
    const isStarting = (statsError as any)?.code === 'BACKEND_STARTING' ||
                       (statsError as any)?.message?.toLowerCase().includes('starting');
    if (statsError && isStarting) {
      const timer = setTimeout(() => refetch(), 5000);
      return () => clearTimeout(timer);
    }
  }, [statsError, refetch]);

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Super admin"
        title="System overview"
        description="Monitor and manage your entire platform ecosystem."
        actions={
          <Button asChild size="lg">
            <Link href="/dashboard/super-admin/institution">
              <Icon name="plus" size={18} /> New institution
            </Link>
          </Button>
        }
      />

      <SuperAdminStats />

      <section className="space-y-4">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">System infrastructure</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Database"
            value={dbTotalRecords > 0 ? "Online" : "Empty"}
            description={`${dbTotalRecords.toLocaleString()} total records`}
            icon="database"
            loading={isLoading}
          />
          <StatCard
            title="Media storage"
            value={mediaFormatted}
            description={`${mediaTotalFiles.toLocaleString()} files stored`}
            icon="folder"
            loading={isLoading}
          />
          <StatCard
            title="Recent additions"
            value={recentTotal.toLocaleString()}
            description="New records in last 24h"
            icon="plus"
            loading={isLoading}
          />
          <StatCard
            title="Active sessions"
            value={activeSessions.toLocaleString()}
            description="Currently active users"
            icon="analytics"
            loading={isLoading}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Recent activity</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6">
            <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">Recent institutions</h3>
            <p className="mb-4 text-[13px] text-bb-muted">Recently added institutions</p>
            <InstitutionsList limit={5} />
          </div>

          <div className="rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6">
            <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">System audit logs</h3>
            <p className="mb-4 text-[13px] text-bb-muted">Recent system activities</p>
            <AuditLogs limit={5} />
          </div>
        </div>
      </section>
    </div>
  )
}
