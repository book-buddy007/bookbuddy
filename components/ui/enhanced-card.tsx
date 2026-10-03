import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { cardVariants } from "@/components/ui/card"

/**
 * Legacy API, new look: white card, radius 26, elevation e1. `interactive` cards lift 2px with
 * the card-hover shadow — dashboards otherwise stay still. Variant names are kept so existing
 * pages compile; they map onto the new surfaces, and `stage` / `ai` are the featured ones.
 */
const enhancedCardVariants = cva("rounded-bb-card transition-[transform,box-shadow] duration-300 ease-bb", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground shadow-e1",
      elevated: "bg-card text-card-foreground shadow-e2",
      outline: "border border-bb-border bg-card text-card-foreground",
      ghost: "bg-transparent",
      cultural: "bg-bb-accent-soft text-bb-text",
      glass: "border border-bb-border bg-bb-surface/70 backdrop-blur",
      gradient: "bg-bb-navy text-white shadow-navy",
      stage: cardVariants({ variant: "stage" }).replace("rounded-bb-card ", ""),
      ai: cardVariants({ variant: "ai" }).replace("rounded-bb-card ", ""),
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      default: "p-6",
      lg: "p-8",
      xl: "p-10",
    },
    interactive: {
      true: "cursor-pointer motion-safe:hover:-translate-y-0.5 hover:shadow-card-hover",
      false: "",
    },
  },
  defaultVariants: { variant: "default", padding: "default", interactive: false },
})

export interface EnhancedCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof enhancedCardVariants> {
  /** Legacy props, accepted and ignored: lift is driven by `interactive`, and dashboards do not animate in. */
  hover?: boolean
  animate?: boolean
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ className, variant, padding, interactive, hover: _hover, animate: _animate, ...props }, ref) => (
    <div ref={ref} className={cn(enhancedCardVariants({ variant, padding, interactive }), className)} {...props} />
  )
)
EnhancedCard.displayName = "EnhancedCard"

const EnhancedCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-col space-y-1.5", className)} {...props} />
)
EnhancedCardHeader.displayName = "EnhancedCardHeader"

const EnhancedCardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-xl font-semibold leading-tight tracking-[-0.01em]", className)} {...props} />
  )
)
EnhancedCardTitle.displayName = "EnhancedCardTitle"

const EnhancedCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-bb-muted", className)} {...props} />
)
EnhancedCardDescription.displayName = "EnhancedCardDescription"

const EnhancedCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("pt-0", className)} {...props} />
)
EnhancedCardContent.displayName = "EnhancedCardContent"

const EnhancedCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center pt-0", className)} {...props} />
)
EnhancedCardFooter.displayName = "EnhancedCardFooter"

export {
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardFooter,
  EnhancedCardTitle,
  EnhancedCardDescription,
  EnhancedCardContent,
}
