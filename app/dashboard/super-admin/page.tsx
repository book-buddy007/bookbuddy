"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { SuperAdminStats } from "@/components/super-admin/stats"
import { InstitutionsList } from "@/components/super-admin/institutions-list"
import { AuditLogs } from "@/components/super-admin/audit-logs"
import { CardHeading, DashCard } from "@/components/dashboard/cards/dash-card"
import { PlatformHealthCard, type HealthRow } from "@/components/dashboard/cards/platform-health-card"
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

  const health: HealthRow[] = [
    { icon: "database", label: "Database", hint: `${dbTotalRecords.toLocaleString()} total records`, value: dbTotalRecords > 0 ? "Online" : "Empty" },
    { icon: "folder", label: "Media storage", hint: `${mediaTotalFiles.toLocaleString()} files stored`, value: mediaFormatted },
    { icon: "plus", label: "Recent additions", hint: "New records in the last 24h", value: recentTotal.toLocaleString() },
    { icon: "analytics", label: "Active sessions", hint: "Currently active users", value: activeSessions.toLocaleString() },
  ];

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-[18px]">
        <DashCard index={4}>
          <CardHeading
            icon="institution"
            title="Institutions"
            aside={
              <Link
                href="/dashboard/super-admin/institution"
                className="flex items-center gap-1 text-sm font-bold text-bb-accent-ink hover:underline focus-visible:outline-none focus-visible:shadow-focus"
              >
                View all <Icon name="chevron-right" size={16} tone="line" />
              </Link>
            }
          />
          <InstitutionsList limit={5} />
        </DashCard>

        <PlatformHealthCard
          index={5}
          rows={health}
          status={statsError ? "error" : "ok"}
          loading={isLoading}
        />
      </div>

      <DashCard index={6}>
        <CardHeading
          icon="clock"
          title="System audit logs"
          aside={
            <Link
              href="/dashboard/super-admin/audit"
              className="flex items-center gap-1 text-sm font-bold text-bb-accent-ink hover:underline focus-visible:outline-none focus-visible:shadow-focus"
            >
              View all <Icon name="chevron-right" size={16} tone="line" />
            </Link>
          }
        />
        <AuditLogs limit={5} />
      </DashCard>
    </div>
  )
}
