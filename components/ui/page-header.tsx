import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Small orange label above the title (12px / 700 / 0.1em, uppercase). */
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  /** Primary actions: right-aligned on desktop, stacked under the title on phones. */
  actions?: React.ReactNode
}

/** Standard page header for dashboards and list pages: eyebrow + H1 + actions. */
export function PageHeader({ eyebrow, title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <header className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)} {...props}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">{eyebrow}</p>}
        <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-bb-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  )
}
