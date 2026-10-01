"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const panel = "space-y-4 rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6";

// ---------------------------------------------------------------------------
// StorageSkeleton: matches the dashboard layout
// ---------------------------------------------------------------------------
export function StorageSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading storage analytics">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[112px] rounded-[18px]" />
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={panel}>
              <div className="space-y-1.5">
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

      <div className="space-y-3">
        <Skeleton className="h-6 w-36" />
        <div className={panel}>
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-5 shrink-0 rounded" />
                <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
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
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-[22px] bg-bb-danger-soft px-6 py-16 text-center",
        className
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bb-danger text-white">
        <Icon name="alert" size={28} />
      </span>
      <div>
        <p className="mb-1 font-display text-lg font-extrabold text-bb-danger-ink">Unable to load storage data</p>
        <p className="max-w-sm text-sm text-bb-danger-ink/80">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <Icon name="rotate-cw" size={16} /> Retry
        </Button>
      )}
    </div>
  );
}
