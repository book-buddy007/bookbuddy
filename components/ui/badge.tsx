import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

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
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
