"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CardHeading, DashCard, useEntered } from "@/components/dashboard/cards/dash-card"

export interface WeekDay {
  /** Short weekday label from the API ("Mon"). */
  label: string
  pages: number
  today?: boolean
}

/** This week at a glance: pages read per day as rounded bars; today is highlighted in blaze. */
export function WeeklyBarsCard({ days, loading, index = 0 }: { days: WeekDay[]; loading?: boolean; index?: number }) {
  const entered = useEntered()
  const total = days.reduce((n, d) => n + d.pages, 0)
  const max = Math.max(1, ...days.map((d) => d.pages))

  return (
    <DashCard index={index}>
      <CardHeading icon="analytics" title="This week" />
      {loading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[40px] font-extrabold leading-none tracking-[-0.04em]">{total.toLocaleString()}</span>
            <span className="text-sm text-bb-muted">{total === 1 ? "page read" : "pages read"}</span>
          </div>
          <div className="flex h-[90px] items-end gap-2" role="img" aria-label={`Pages read per day this week, ${total} in total`}>
            {days.map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span
                  className={cn(
                    "w-full rounded-t-[9px] rounded-b-[4px] shadow-[inset_0_1px_0_rgba(255,255,255,.4)]",
                    d.today
                      ? "bg-[linear-gradient(180deg,#FF8A3D,#FF4D00)]"
                      : d.pages === 0
                        ? "bg-bb-surface-2"
                        : "bg-[linear-gradient(180deg,#DCE4F5,#C9D4EC)] dark:bg-[linear-gradient(180deg,#2F3D6B,#222C4E)]"
                  )}
                  style={{
                    height: entered ? `${Math.max((d.pages / max) * 100, 4)}%` : "4%",
                    transition: `height .9s cubic-bezier(.2,.8,.2,1) ${i * 60}ms`,
                  }}
                />
                <span className={cn("text-[11px] font-bold", d.today ? "text-bb-accent-ink" : "text-bb-muted")}>{d.label.slice(0, 1)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </DashCard>
  )
}
