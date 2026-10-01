"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { EnhancedCard, EnhancedCardContent } from "@/components/ui/enhanced-card";
import { AlertTriangle, RefreshCw } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// StorageSkeleton — matches the upgraded dashboard layout
// ---------------------------------------------------------------------------
export function StorageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* StatPill row */}
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-5 rounded-3xl border border-slate-200/40 dark:border-slate-700/30 bg-white/50 dark:bg-[#0A0F1E]/50 backdrop-blur-md px-6 py-5 shadow-lg"
          >
            <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Two-column breakdown cards */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-[#0A0F1E]/70 backdrop-blur-md p-6 space-y-4 shadow-sm"
            >
              <div className="border-b border-slate-100 dark:border-slate-700/40 pb-3 space-y-1.5">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="space-y-3 pt-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full-width bloat files card */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-36" />
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-[#0A0F1E]/70 backdrop-blur-md p-6 space-y-4 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-700/40 pb-3 space-y-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-5 rounded shrink-0" />
                <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StorageErrorCard
// ---------------------------------------------------------------------------
interface StorageErrorCardProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function StorageErrorCard({
  message = "Failed to load storage analytics.",
  onRetry,
  className,
}: StorageErrorCardProps) {
  return (
    <EnhancedCard
      className={cn(
        "border-red-200/40 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 backdrop-blur-md shadow-sm",
        className
      )}
    >
      <EnhancedCardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 text-white shadow-lg shadow-red-500/30">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Unable to load storage data
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            {message}
          </p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-2 border-red-300/60 dark:border-red-800/40 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        )}
      </EnhancedCardContent>
    </EnhancedCard>
  );
}
