"use client"

import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CardHeading, DashCard, useEntered } from "@/components/dashboard/cards/dash-card"

const LABELS = ["M", "T", "W", "T", "F", "S", "S"]

/**
 * Which days of this week (Mon–Sun) are done, derived from the real streak count: the streak
 * runs back from today (if the student has already read today) or from yesterday.
 */
export function weekFromStreak(streak: number, readToday: boolean, now = new Date()) {
  const todayIdx = (now.getDay() + 6) % 7 // Monday = 0
  const doneBefore = Math.max(0, streak - (readToday ? 1 : 0)) // completed days before today
  return LABELS.map((l, i) => {
    const daysAgo = todayIdx - i
    if (daysAgo === 0) return { l, state: readToday ? ("today" as const) : ("empty" as const) }
    if (daysAgo > 0) return { l, state: daysAgo <= doneBefore ? ("done" as const) : ("empty" as const) }
    return { l, state: "future" as const }
  })
}

/** Reading streak: the count, plus this week as a row of gloss tiles. */
export function StreakCard({
  streak,
  readToday,
  loading,
  index = 0,
}: {
  streak: number
  readToday: boolean
  loading?: boolean
  index?: number
}) {
  const entered = useEntered()
  const week = weekFromStreak(streak, readToday)

  return (
    <DashCard index={index} className="gap-4">
      <CardHeading icon="flame" title="Reading streak" />
      {loading ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[56px] font-extrabold leading-[.9] tracking-[-0.05em]">{streak}</span>
            <span className="font-bold text-bb-muted">{streak === 1 ? "day in a row" : "days in a row"}</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((d, i) => {
              const lit = d.state === "done" || d.state === "today"
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "flex aspect-square w-full max-w-9 items-center justify-center rounded-xl",
                      d.state === "done" && "bg-bb-primary shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_8px_14px_-8px_rgba(255,77,0,.7)]",
                      d.state === "today" && "bg-bb-grad-cobalt shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_8px_14px_-8px_rgba(59,91,219,.7)]",
                      !lit && "border border-dashed border-bb-border bg-bb-surface-2"
                    )}
                    style={{
                      transform: entered ? "scale(1)" : "scale(.4)",
                      transition: `transform .5s cubic-bezier(.3,1.5,.5,1) ${300 + i * 70}ms`,
                    }}
                  >
                    <Icon
                      name={d.state === "today" ? "flame" : d.state === "done" ? "check" : "plus"}
                      size={16}
                      tone={lit ? "onfill" : "line"}
                      className={lit ? undefined : "text-bb-faint"}
                    />
                  </span>
                  <span className="text-[11px] font-bold text-bb-muted">{d.l}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </DashCard>
  )
}
