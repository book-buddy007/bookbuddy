"use client"

import { useEffect } from "react"
import Link from "next/link"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card"
import { StatPill } from "@/components/ui/stat-pill"
import { Activity, Book, HardDrive, Plus, Server } from "@/components/ui/icons"
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
    <div className="space-y-8 animate-vg-fade-in-up">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-10 shadow-2xl mb-8 border border-white/10" style={{background: 'linear-gradient(135deg, var(--night-ink) 0%, var(--indigo-deep) 30%, var(--peacock-teal) 60%, var(--deep-saffron) 100%)'}}>
        <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")'}} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--deep-saffron)]/[0.15] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-[var(--deep-saffron)] mr-2 animate-pulse"></span>
              System Metrics
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm font-display">
               System Admin Overview
            </h1>
            <p className="text-indigo-100/90 text-lg max-w-xl font-medium">
               Monitor and manage your entire platform ecosystem.
            </p>
          </div>
          
          <Link href="/dashboard/super-admin/institution" className="relative z-10">
            <EnhancedButton 
              size="lg"
              className="shrink-0 bg-gradient-to-r from-[var(--deep-saffron)] to-bb-accent hover:from-bb-accent hover:to-bb-accent text-black shadow-lg shadow-[var(--deep-saffron)]/20 border-transparent font-bold"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Institution
            </EnhancedButton>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <SuperAdminStats />

      {/* Network Infrastructure Cards */}
      <div className="space-y-6 relative z-10">
        <div>
          <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2 tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
            System Infrastructure
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatPill
              label="Database"
              value={isLoading ? "..." : (dbTotalRecords > 0 ? "Online" : "Empty")}
              subLabel={isLoading ? "Loading..." : `${dbTotalRecords.toLocaleString()} total records`}
              icon={<Server className="h-5 w-5" />}
              accent="teal"
              isLoading={isLoading}
            />
            <StatPill
              label="Media Storage"
              value={isLoading ? "..." : mediaFormatted}
              subLabel={isLoading ? "Loading..." : `${mediaTotalFiles.toLocaleString()} files stored`}
              icon={<HardDrive className="h-5 w-5" />}
              accent="saffron"
              isLoading={isLoading}
              delayMs={100}
            />
            <StatPill
              label="Recent Additions"
              value={isLoading ? "..." : recentTotal.toLocaleString()}
              subLabel={isLoading ? "Loading..." : "New records in last 24h"}
              icon={<Book className="h-5 w-5" />}
              accent="gold"
              isLoading={isLoading}
              delayMs={200}
            />
            <StatPill
              label="Active Sessions"
              value={isLoading ? "..." : activeSessions.toLocaleString()}
              subLabel={isLoading ? "Loading..." : "Currently active users"}
              icon={<Activity className="h-5 w-5" />}
              accent="kumkum"
              isLoading={isLoading}
              delayMs={300}
            />
          </div>
        </div>

        {/* Recent Activity Section */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2 tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
            Recent Activity
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <EnhancedCard className="col-span-1 border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-bb-bg/70 backdrop-blur-md relative overflow-hidden shadow-sm">
              <EnhancedCardHeader className="relative z-10 border-b border-slate-100 dark:border-slate-700/40">
                <EnhancedCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <div className="h-2 w-2 rounded-full bg-[var(--saffron)] animate-pulse" />
                  Recent Institutions
                </EnhancedCardTitle>
                <EnhancedCardDescription className="text-slate-500 dark:text-white/50">
                  Recently added institutions
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent className="relative z-10 pt-4">
                <InstitutionsList limit={5} />
              </EnhancedCardContent>
            </EnhancedCard>

            <EnhancedCard className="col-span-1 border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-bb-bg/70 backdrop-blur-md relative overflow-hidden shadow-sm">
              <EnhancedCardHeader className="relative z-10 border-b border-slate-100 dark:border-slate-700/40">
                <EnhancedCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Activity className="h-4 w-4 text-[var(--peacock-teal)]" />
                  System Audit Logs
                </EnhancedCardTitle>
                <EnhancedCardDescription className="text-slate-500 dark:text-white/50">
                  Recent system activities
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent className="relative z-10 pt-4">
                <AuditLogs limit={5} />
              </EnhancedCardContent>
            </EnhancedCard>
          </div>
        </div>
      </div>
    </div>
  )
}
