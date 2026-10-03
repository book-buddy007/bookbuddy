import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"

const badgeVariants = cva(
  "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:shadow-focus",
  {
    variants: {
      variant: {
        default: "border-transparent bg-bb-accent text-white",
        secondary: "border-transparent bg-bb-surface-2 text-bb-text",
        destructive: "border-transparent bg-bb-danger-soft text-bb-danger-ink",
        outline: "border-bb-border text-bb-text",
        success: "border-transparent bg-bb-success-soft text-bb-success-ink",
        warning: "border-transparent bg-bb-warning-soft text-bb-warning-ink",
        info: "border-transparent bg-bb-info-soft text-bb-info-ink",
        // AI-ready / Varta: info-soft with a sparkles glyph
        ai: "border-transparent bg-bb-info-soft text-bb-info-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  /** Status dot (6px, currentColor) before the label. On by default for the status variants. */
  dot?: boolean
}

const STATUS_VARIANTS = new Set(["success", "warning", "destructive", "info"])

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  const showDot = dot ?? (variant ? STATUS_VARIANTS.has(variant) : false)
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {variant === "ai" && <Icon name="sparkles" size={13} />}
      {showDot && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
