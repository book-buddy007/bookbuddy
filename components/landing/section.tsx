import * as React from "react"
import { cn } from "@/lib/utils"

/** Shared landing layout: max-width container with the page gutters (20 phone → 64 desktop). */
export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[1360px] px-5 sm:px-8 lg:px-16", className)} {...props} />
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  center,
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  center?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-4", center && "items-center text-center", className)}>
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.12em] text-bb-accent-ink">{eyebrow}</p>}
      <h2 className="max-w-3xl font-display text-[clamp(34px,5vw,56px)] font-extrabold leading-[0.98] tracking-[-0.035em] [text-wrap:balance]">{title}</h2>
      {description && <p className="max-w-2xl text-lg leading-relaxed text-bb-muted [text-wrap:pretty]">{description}</p>}
    </div>
  )
}

export const Accent = ({ children }: { children: React.ReactNode }) => <span className="text-bb-accent">{children}</span>
