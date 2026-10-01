import * as React from "react"
import { cn } from "@/lib/utils"

/** The gradient orb. Used ONLY as Varta's chat avatar; everywhere else Varta is the `varta` icon. */
export function VartaOrb({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full bg-bb-orb shadow-[0_0_14px_rgba(255,138,61,.5)]", className)}
      style={{ width: size, height: size }}
    />
  )
}

export interface CitationChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Display label, e.g. "Ch 7 · p. 142". */
  label: string
  /** The citation currently shown in the Source panel / inline excerpt. */
  active?: boolean
}

/** Citation pill under an answer. Active = accent-soft with a 1.5px blaze ring; otherwise cloud. */
export function CitationChip({ label, active, className, type = "button", ...props }: CitationChipProps) {
  return (
    <button
      type={type}
      aria-pressed={!!active}
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold transition-colors duration-[120ms]",
        "focus-visible:outline-none focus-visible:shadow-focus [@media(pointer:coarse)]:min-h-9",
        active
          ? "bg-bb-accent-soft text-bb-accent-ink ring-[1.5px] ring-bb-accent"
          : "bg-bb-bg text-bb-text hover:bg-bb-surface-2",
        className
      )}
      {...props}
    >
      {label}
    </button>
  )
}

export interface VartaMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role?: "user" | "assistant"
  /** Citations rendered under an assistant answer. */
  citations?: React.ReactNode
}

/**
 * Chat bubble. User = navy gradient, white, radius 20/20/6/20, right-aligned. Answer =
 * surface with e0, radius 6/20/20/20, with the orb avatar and optional citation row.
 */
export function VartaMessage({ role = "assistant", citations, className, children, ...props }: VartaMessageProps) {
  if (role === "user") {
    return (
      <div
        className={cn(
          "ml-auto max-w-[85%] rounded-[20px_20px_6px_20px] bg-bb-navy px-[18px] py-[13px] text-base leading-normal text-white shadow-[var(--bb-shadow-navy)] md:max-w-[72%]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
  return (
    <div className={cn("flex max-w-[92%] items-start gap-3 md:max-w-[80%]", className)} {...props}>
      <VartaOrb size={32} className="mt-1" />
      <div className="min-w-0">
        <div className="rounded-[6px_20px_20px_20px] bg-bb-surface px-[18px] py-[14px] text-base leading-relaxed shadow-e0">
          {children}
        </div>
        {citations && <div className="mt-2 flex flex-wrap gap-2">{citations}</div>}
      </div>
    </div>
  )
}
