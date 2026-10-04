"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, type CardProps } from "@/components/ui/card"
import { Icon, type BBIconName } from "@/components/ui/icon"

/**
 * Dashboard card kit. Cards live in a dense auto-fill grid (`CardGrid`), enter with a fade-up
 * (18px, 800ms, staggered 60ms by `index`), and are radius 28 with the e1 shadow. One featured
 * card (`stage` navy or `ai` cobalt) per row.
 */
export function CardGrid({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("grid grid-flow-dense grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-[18px]", className)}
      {...props}
    />
  )
}

export interface DashCardProps extends CardProps {
  /** Position in the grid: drives the entrance stagger (60ms each). */
  index?: number
  /** Span two columns where the grid has room (700px and up). */
  wide?: boolean
}

export const DashCard = React.forwardRef<HTMLDivElement, DashCardProps>(function DashCard(
  { index = 0, wide, className, style, variant, ...props },
  ref
) {
  return (
    <Card
      ref={ref}
      variant={variant}
      className={cn(
        "bb-enter flex flex-col gap-3.5 rounded-[28px] p-[22px]",
        // Flat cards deepen their shadow on hover; the featured stage card also lifts 3px.
        !variant || variant === "default" ? "hover:shadow-card-hover" : variant === "stage" ? "motion-safe:hover:-translate-y-[3px]" : "",
        wide && "min-[700px]:col-span-2",
        className
      )}
      style={{ ["--i" as string]: index, ...style }}
      {...props}
    />
  )
})

/** Icon + title row, with an optional right-hand slot (pill, count, link). */
export function CardHeading({
  icon,
  title,
  aside,
  className,
}: {
  icon?: BBIconName
  title: React.ReactNode
  aside?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span className="flex items-center gap-2 font-bold">
        {icon && <Icon name={icon} size={20} />}
        {title}
      </span>
      {aside}
    </div>
  )
}

/** Soft status pill used in card headings: tone picks the colour pair. */
export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "blaze" | "cobalt" | "success" | "neutral"
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
        tone === "blaze" && "bg-bb-accent-soft text-bb-accent-ink",
        tone === "cobalt" && "bg-bb-info-soft text-bb-info-ink",
        tone === "success" && "bg-bb-success-soft text-bb-success-ink",
        tone === "neutral" && "bg-bb-surface-2 text-bb-muted",
        className
      )}
    >
      {children}
    </span>
  )
}

/** Marks a card (or a block inside one) that has no live data behind it. */
export function SampleData({ className }: { className?: string }) {
  return (
    <span className={cn("rounded-full bg-bb-surface-2 px-2 py-0.5 text-[11px] font-bold text-bb-muted", className)}>
      Sample data
    </span>
  )
}

/**
 * Flips to true shortly after mount so values can animate from empty (bars, rings, progress)
 * with a CSS transition. Always true when the user prefers reduced motion.
 */
export function useEntered() {
  const [entered, setEntered] = React.useState(false)
  React.useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setEntered(true)
      return
    }
    const id = window.setTimeout(() => setEntered(true), 60)
    return () => window.clearTimeout(id)
  }, [])
  return entered
}
