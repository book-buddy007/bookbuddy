import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Status is always shown with this component. 28px tall pill, 13px/600, 7px dot.
 * Green is reserved for "returned"/success; there is no lime anywhere in the system.
 */
export type BBStatus = "returned" | "due-soon" | "overdue" | "pending" | "reserved"

const STATUS: Record<BBStatus, { label: string; cls: string; dot: string }> = {
  returned: { label: "Returned", cls: "bg-bb-success-soft text-bb-success-ink", dot: "bg-bb-success" },
  "due-soon": { label: "Due soon", cls: "bg-bb-warning-soft text-bb-warning-ink", dot: "bg-bb-warning" },
  overdue: { label: "Overdue", cls: "bg-bb-danger-soft text-bb-danger-ink", dot: "bg-bb-danger" },
  pending: { label: "Pending", cls: "bg-bb-info-soft text-bb-info-ink", dot: "bg-bb-info" },
  reserved: { label: "Reserved", cls: "bg-bb-accent-soft text-bb-accent-ink", dot: "bg-bb-accent" },
}

/** Map the free-form status strings the API returns onto the five design-system statuses. */
export function toBBStatus(raw: string | null | undefined): BBStatus {
  const s = (raw ?? "").toLowerCase().replace(/[\s_]+/g, "-")
  if (["returned", "success", "completed", "approved", "active", "resolved", "paid"].includes(s)) return "returned"
  if (["due-soon", "due", "expiring", "warning", "trial"].includes(s)) return "due-soon"
  if (["overdue", "late", "rejected", "failed", "error", "expired", "cancelled", "suspended"].includes(s)) return "overdue"
  if (["reserved", "on-hold", "hold"].includes(s)) return "reserved"
  return "pending"
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: BBStatus | (string & {})
  /** Override the default label (e.g. "Borrowed"). */
  label?: string
}

export function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  const key = (status in STATUS ? status : toBBStatus(status)) as BBStatus
  const s = STATUS[key]
  return (
    <span
      className={cn("inline-flex h-7 items-center gap-[7px] rounded-full px-3 text-[13px] font-semibold", s.cls, className)}
      {...props}
    >
      <span aria-hidden className={cn("h-[7px] w-[7px] rounded-full", s.dot)} />
      {label ?? s.label}
    </span>
  )
}
