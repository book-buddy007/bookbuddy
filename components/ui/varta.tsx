import * as React from "react"
import { cn } from "@/lib/utils"

/** The gradient orb. Used ONLY as Varta's chat avatar; everywhere else Varta is the `varta` icon. */
export function VartaOrb({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full bg-bb-orb shadow-[0_0_18px_rgba(91,124,255,.6)]", className)}
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

/** Citation pill under an answer: cobalt gloss (it is AI), with a spring pop on entry. Active adds a ring. */
export function CitationChip({ label, active, className, type = "button", ...props }: CitationChipProps) {
  return (
    <button
      type={type}
      aria-pressed={!!active}
      className={cn(
        "inline-flex h-[26px] items-center rounded-full bg-bb-grad-cobalt px-2.5 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4)]",
        "transition-[filter,box-shadow] duration-bb-micro [animation:bbpop_.5s_var(--bb-spring)_backwards] motion-reduce:animate-none hover:brightness-110",
        "focus-visible:outline-none focus-visible:shadow-focus [@media(pointer:coarse)]:min-h-9",
        active && "ring-2 ring-bb-cobalt-light ring-offset-2 ring-offset-bb-info-soft",
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
 * Chat bubble. User = navy gradient, white, radius 18/18/4/18, right-aligned. Answer =
 * info-soft, radius 4/18/18/18, with the orb avatar and optional citation row.
 */
export function VartaMessage({ role = "assistant", citations, className, children, ...props }: VartaMessageProps) {
  if (role === "user") {
    return (
      <div
        className={cn(
          "ml-auto max-w-[85%] rounded-[18px_18px_4px_18px] bg-bb-navy px-4 py-3 text-[15px] leading-normal text-white shadow-navy md:max-w-[72%]",
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
        <div className="rounded-[4px_18px_18px_18px] bg-bb-info-soft px-4 py-3.5 text-[15px] leading-relaxed text-bb-text">
          {children}
        </div>
        {citations && <div className="mt-2 flex flex-wrap gap-2">{citations}</div>}
      </div>
    </div>
  )
}
