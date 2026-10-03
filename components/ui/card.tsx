import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Card surfaces. Radius 26, flat e1 by default. `interactive` lifts 2px on hover with the
 * card-hover shadow. `stage` (navy + corner glow) and `ai` (cobalt + sheen) are the featured
 * variants: one per row.
 */
const cardVariants = cva("rounded-bb-card transition-[transform,box-shadow] duration-300 ease-bb", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground shadow-e1",
      stage: [
        "relative overflow-hidden bg-bb-stage text-[#F2F4F8] shadow-stage",
        "before:pointer-events-none before:absolute before:-right-16 before:-top-20 before:h-60 before:w-60 before:rounded-full before:bg-[image:var(--bb-glow-stage)] before:content-['']",
        "[&>*]:relative",
      ].join(" "),
      ai: [
        "relative overflow-hidden bg-bb-ai text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_30px_50px_-30px_rgba(59,91,219,.85)]",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[image:var(--bb-sheen)] after:content-['']",
        "[&>*]:relative [&>*]:z-[1]",
      ].join(" "),
    },
    interactive: {
      true: "cursor-pointer motion-safe:hover:-translate-y-0.5 hover:shadow-card-hover",
      false: "",
    },
  },
  defaultVariants: { variant: "default", interactive: false },
})

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, interactive, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant, interactive }), className)} {...props} />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-tight tracking-[-0.01em]",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-bb-muted", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
