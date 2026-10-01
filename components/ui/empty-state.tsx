import * as React from "react"
import { cn } from "@/lib/utils"
import { Icon, type BBIconName } from "@/components/ui/icon"

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: BBIconName
  title: React.ReactNode
  description?: React.ReactNode
  /** Primary action, typically a <Button>. */
  action?: React.ReactNode
}

/** Dashed 1.5px container, centred 40px icon. Used for every empty list and "no results". */
export function EmptyState({ icon = "library", title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-bb-border px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      <Icon name={icon} size={40} />
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-bb-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
