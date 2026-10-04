import * as React from "react"
import { cn } from "@/lib/utils"
import { Icon, type BBIconName } from "@/components/ui/icon"

/** The empty-state halo on its own (blaze glow, dashed ring, 52px tile): for panels with bespoke empty copy. */
export function EmptyHalo({ icon, className, hue }: { icon: BBIconName; className?: string; hue?: "a" | "b" }) {
  return (
    <span aria-hidden className={cn("relative flex h-[88px] w-[88px] items-center justify-center", className)}>
      <span
        className={cn(
          "absolute inset-0 rounded-full",
          hue === "b" ? "bg-[radial-gradient(circle,rgba(59,91,219,.16),transparent_70%)]" : "bg-[radial-gradient(circle,rgba(255,77,0,.16),transparent_70%)]"
        )}
      />
      <span className="absolute inset-2.5 rounded-full border-[1.5px] border-dashed border-bb-border" />
      <span className="relative flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-bb-surface shadow-e1">
        <Icon name={icon} size={26} hue={hue} />
      </span>
    </span>
  )
}

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: BBIconName
  title: React.ReactNode
  description?: React.ReactNode
  /** Primary action, typically a <Button>. */
  action?: React.ReactNode
}

/** Halo (blaze glow + dashed ring) around a 52px surface tile holding a soft icon. Used for every empty list and "no results". */
export function EmptyState({ icon = "library", title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2 rounded-bb-card px-6 py-12 text-center", className)}
      {...props}
    >
      <span aria-hidden className="relative flex h-[88px] w-[88px] items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,77,0,.16),transparent_70%)]" />
        <span className="absolute inset-2.5 rounded-full border-[1.5px] border-dashed border-bb-border" />
        <span className="relative flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-bb-surface shadow-e1">
          <Icon name={icon} size={26} />
        </span>
      </span>
      <h3 className="mt-1 text-[17px] font-bold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-bb-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
