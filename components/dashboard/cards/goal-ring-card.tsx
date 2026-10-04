"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { CardHeading, DashCard, Pill, useEntered } from "@/components/dashboard/cards/dash-card"

const R = 50
const CIRC = 2 * Math.PI * R

/** Daily goal ring: pages read today against the day's pages goal. */
export function GoalRingCard({
  pagesToday,
  goalPages,
  minutesToday,
  loading,
  index = 0,
}: {
  pagesToday: number
  goalPages: number
  minutesToday: number
  loading?: boolean
  index?: number
}) {
  const entered = useEntered()
  const frac = goalPages > 0 ? Math.min(1, pagesToday / goalPages) : 0
  const toGo = Math.max(0, goalPages - pagesToday)

  return (
    <DashCard index={index}>
      <CardHeading
        icon="target"
        title="Today's goal"
        aside={
          loading ? undefined : toGo > 0 ? <Pill tone="blaze">{toGo} {toGo === 1 ? "page" : "pages"} to go</Pill> : <Pill tone="success">Goal reached</Pill>
        }
      />
      {loading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 120 120" width={128} height={128} className="-rotate-90" aria-hidden>
              <defs>
                <linearGradient id="bb-goal-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FF8A3D" />
                  <stop offset="1" stopColor="#FF4D00" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={R} fill="none" stroke="var(--bb-surface-2)" strokeWidth={12} />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke="url(#bb-goal-ring)"
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={CIRC}
                style={{
                  strokeDashoffset: entered ? CIRC * (1 - frac) : CIRC,
                  transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1) .3s",
                  filter: "drop-shadow(0 3px 6px rgba(255,77,0,.45))",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[34px] font-extrabold leading-none tracking-[-0.04em]">{pagesToday}</span>
              <span className="text-xs text-bb-muted">of {goalPages} pages</span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 text-sm">
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-bb-blaze" />
              Pages · {pagesToday}
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-bb-cobalt-light" />
              Time · {minutesToday} min
            </span>
          </div>
        </div>
      )}
    </DashCard>
  )
}
