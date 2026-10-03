import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Pill label above the title: 12px / 700 in blaze-ink with a glowing blaze dot. */
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  /** Primary actions: right-aligned on desktop, stacked under the title on phones. */
  actions?: React.ReactNode
}

/** Standard page header for dashboards and list pages: eyebrow pill + H1 (40/30) + actions, over a soft blaze-to-cobalt glow. */
export function PageHeader({ eyebrow, title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <header className={cn("relative mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)} {...props}>
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-[60px] h-[220px] w-[420px] max-w-full rounded-full bg-[radial-gradient(closest-side,rgba(255,77,0,.12),rgba(59,91,219,.08)_60%,transparent)]"
      />
      <div className="relative flex min-w-0 flex-col items-start gap-2">
        {eyebrow && (
          <p className="flex h-7 items-center gap-[7px] rounded-full bg-bb-surface px-3 text-xs font-bold text-bb-accent-ink shadow-e1">
            <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-bb-blaze shadow-[0_0_8px_#FF4D00]" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[30px] font-extrabold leading-[1.02] tracking-[-0.04em] [text-wrap:balance] sm:text-[40px]">
          {title}
        </h1>
        {description && <p className="max-w-[560px] text-[15px] text-bb-muted [text-wrap:pretty]">{description}</p>}
      </div>
      {actions && <div className="relative flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  )
}
