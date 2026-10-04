"use client"

import { Icon, type BBIconName } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CardHeading, DashCard } from "@/components/dashboard/cards/dash-card"

export interface HealthRow {
  icon: BBIconName
  label: string
  /** Secondary line under the label. */
  hint?: string
  value: string
}

/**
 * Platform health on the navy stage: the infrastructure figures the API reports, with a status
 * dot that reflects whether the stats endpoint answered (there is no uptime history to chart).
 */
export function PlatformHealthCard({
  rows,
  status,
  loading,
  index = 0,
}: {
  rows: HealthRow[]
  status: "ok" | "error"
  loading?: boolean
  index?: number
}) {
  const ok = status === "ok"
  return (
    <DashCard variant="stage" index={index} className="gap-4">
      <CardHeading
        icon="shield"
        title="Platform health"
        aside={
          loading ? undefined : (
            <span className={cn("flex items-center gap-1.5 text-[13px] font-bold", ok ? "text-[#3DDC84]" : "text-[#FFB547]")}>
              <span
                aria-hidden
                className={cn("h-2 w-2 rounded-full", ok ? "bg-[#3DDC84] shadow-[0_0_10px_#3DDC84]" : "bg-[#FFB547] shadow-[0_0_10px_#FFB547]")}
              />
              {ok ? "Connected" : "Stats unavailable"}
            </span>
          )
        }
      />
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full bg-white/10" />
          ))}
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3">
            <Icon name={r.icon} size={20} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm">{r.label}</span>
              {r.hint && <span className="truncate text-xs text-[#A9B4D0]">{r.hint}</span>}
            </div>
            <span className="text-sm font-bold tabular-nums">{r.value}</span>
          </div>
        ))
      )}
    </DashCard>
  )
}
