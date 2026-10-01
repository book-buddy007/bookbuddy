import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Inline message. Radius 14, soft semantic tints; the icon takes the variant's ink colour. */
const alertVariants = cva(
  "relative w-full rounded-bb-md border p-4 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-[18px] [&>svg]:w-[18px]",
  {
    variants: {
      variant: {
        default: "border-bb-border bg-bb-surface text-bb-text [&>svg]:text-bb-muted",
        destructive: "border-transparent bg-bb-danger-soft text-bb-danger-ink [&>svg]:text-bb-danger-ink",
        success: "border-transparent bg-bb-success-soft text-bb-success-ink [&>svg]:text-bb-success-ink",
        warning: "border-transparent bg-bb-warning-soft text-bb-warning-ink [&>svg]:text-bb-warning-ink",
        info: "border-transparent bg-bb-info-soft text-bb-info-ink [&>svg]:text-bb-info-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-snug", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
