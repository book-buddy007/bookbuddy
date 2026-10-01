import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Book Buddy button. Pill-shaped, three heights (lg 52 / md 44 / sm 36), motion per
 * the design system: hover lifts 2px, press sinks 1px, 120ms micro transition.
 * Hit area never drops under 44px on touch devices.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold",
    "transition-[transform,box-shadow,background-color,color,border-color] duration-bb-micro ease-out",
    "motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-px",
    "focus-visible:outline-none focus-visible:shadow-focus",
    "disabled:pointer-events-none disabled:translate-y-0 disabled:bg-none disabled:bg-bb-surface-2 disabled:text-bb-faint disabled:shadow-none disabled:border-transparent",
    "[&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // primary: glossy blaze
        default: "bg-bb-primary text-white shadow-gloss",
        primary: "bg-bb-primary text-white shadow-gloss",
        // secondary: navy gradient
        secondary: "bg-bb-navy text-white shadow-[var(--bb-shadow-navy)]",
        outline: "border-[1.5px] border-foreground bg-transparent text-foreground hover:bg-bb-surface-2",
        ghost: "bg-transparent text-bb-cobalt hover:bg-bb-surface-2 dark:text-bb-text",
        // solid danger for destructive confirmations
        destructive: "bg-bb-danger text-white hover:brightness-95",
        // soft orange-tinted action (design-system "danger-soft"), radius 10
        "danger-soft": "rounded-bb-sm bg-bb-accent-soft text-bb-accent-ink hover:brightness-95",
        // semantic fills used by legacy call sites (success is the only green in the system)
        success: "bg-bb-success text-white hover:brightness-95",
        warning: "bg-bb-warning text-bb-ink hover:brightness-95",
        glass: "border border-bb-border bg-bb-surface/70 text-bb-text backdrop-blur hover:bg-bb-surface",
        link: "rounded-none px-0 text-bb-accent underline-offset-4 hover:underline motion-safe:hover:translate-y-0",
      },
      size: {
        default: "h-11 px-5 text-[15px]",
        md: "h-11 px-5 text-[15px]",
        sm: "h-9 px-4 text-sm [@media(pointer:coarse)]:min-h-11",
        lg: "h-[52px] px-[26px] text-base",
        xl: "h-[58px] px-[30px] text-[17px]",
        icon: "h-[52px] w-[52px] p-0",
        "icon-md": "h-11 w-11 p-0",
        "icon-sm": "h-9 w-9 p-0 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
