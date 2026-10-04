"use client"

import Link from "next/link"
import { Icon, type BBIconName } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CardHeading, DashCard } from "@/components/dashboard/cards/dash-card"

export interface DueItem {
  id: string
  title: string
  /** Secondary line: who or where. */
  by?: string
  /** Pill text: "Today", "Fri", "Overdue" … */
  due: string
  /** Soon or overdue: tints the tile and the pill blaze. */
  urgent?: boolean
  icon?: BBIconName
  href?: string
}

/** Reading that is due or assigned: the library due dates, soonest first. */
export function AssignedCard({
  items,
  loading,
  title = "Due & assigned",
  index = 0,
}: {
  items: DueItem[]
  loading?: boolean
  title?: string
  index?: number
}) {
  return (
    <DashCard index={index} className="gap-3">
      <CardHeading icon="assignment" title={title} aside={<span className="text-[13px] text-bb-muted">{items.length}</span>} />
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[60px] w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-bb-surface-2 p-3.5 text-sm text-bb-muted">
          <Icon name="check-circle" size={22} />
          Nothing due. Enjoy the quiet.
        </div>
      ) : (
        items.slice(0, 3).map((a) => {
          const row = (
            <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-bb-surface-2 p-2.5">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", a.urgent ? "bg-bb-accent-soft" : "bg-bb-info-soft")}>
                <Icon name={a.icon ?? "book-open"} size={20} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{a.title}</div>
                {a.by && <div className="truncate text-xs text-bb-muted">{a.by}</div>}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
                  a.urgent ? "bg-bb-accent-soft text-bb-accent-ink" : "bg-bb-surface text-bb-muted"
                )}
              >
                {a.due}
              </span>
            </div>
          )
          return a.href ? (
            <Link key={a.id} href={a.href} className="block rounded-2xl focus-visible:outline-none focus-visible:shadow-focus">
              {row}
            </Link>
          ) : (
            <div key={a.id}>{row}</div>
          )
        })
      )}
    </DashCard>
  )
}
