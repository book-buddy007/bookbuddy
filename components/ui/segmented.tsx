"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string = string> {
  value: T
  label: React.ReactNode
  disabled?: boolean
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onValueChange: (value: T) => void
  /** md = 36px segments, sm = 32px. */
  size?: "sm" | "md"
  fullWidth?: boolean
  className?: string
  "aria-label"?: string
}

/**
 * Segmented control: surface-2 pill track, active segment is the navy gradient with
 * white text. For switching a single view state (Read / PDF / Listen, speed, theme).
 * Use Tabs when the segments each own a panel.
 */
export function Segmented<T extends string>({
  options,
  value,
  onValueChange,
  size = "md",
  fullWidth,
  className,
  ...rest
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className={cn(
        "inline-flex gap-1 rounded-full bg-bb-surface-2 p-1",
        fullWidth && "flex w-full",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            onClick={() => onValueChange(o.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold",
              "transition-[background-color,color,box-shadow] duration-bb-micro focus-visible:outline-none focus-visible:shadow-focus",
              "disabled:pointer-events-none disabled:opacity-50 [@media(pointer:coarse)]:min-h-10",
              size === "md" ? "h-9" : "h-8 px-3 text-[13px]",
              fullWidth && "flex-1",
              active
                ? "bg-bb-navy text-white shadow-[var(--bb-shadow-navy)]"
                : "text-bb-muted hover:text-bb-text"
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
