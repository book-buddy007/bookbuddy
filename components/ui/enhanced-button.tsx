import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "@/components/ui/icons"

const enhancedButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-vg-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-vg-md hover:shadow-vg-lg hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-vg-md hover:shadow-vg-lg hover:-translate-y-0.5",
        outline:
          "border border-input bg-background shadow-vg-sm hover:bg-accent hover:text-accent-foreground hover:shadow-vg-md",
        secondary:
          "bg-secondary text-secondary-foreground shadow-vg-sm hover:shadow-vg-md hover:-translate-y-0.5",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Professional Blue-Cyan variants
        "vg-primary":
          "bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-vg-md hover:shadow-vg-lg hover:-translate-y-0.5 hover:from-blue-800 hover:to-cyan-700 [text-shadow:_0_1px_2px_rgb(0_0_0_/_20%)] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/30 before:to-transparent before:pointer-events-none",
        "vg-cultural":
          "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-vg-cultural hover:shadow-vg-lg hover:-translate-y-0.5 hover:from-cyan-700 hover:to-teal-700 [text-shadow:_0_1px_2px_rgb(0_0_0_/_20%)] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/30 before:to-transparent before:pointer-events-none",
        "vg-success":
          "bg-vg-success-500 text-white shadow-vg-md hover:bg-vg-success-600 hover:shadow-vg-lg hover:-translate-y-0.5",
        "vg-warning":
          "bg-vg-warning-500 text-white shadow-vg-md hover:bg-vg-warning-600 hover:shadow-vg-lg hover:-translate-y-0.5",
        "vg-error":
          "bg-vg-error-500 text-white shadow-vg-md hover:bg-vg-error-600 hover:shadow-vg-lg hover:-translate-y-0.5",
        "vg-glass":
          "vg-glass text-gray-900 dark:text-white hover:-translate-y-0.5",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-vg-md px-3 text-xs",
        lg: "h-12 rounded-vg-xl px-8 text-base",
        xl: "h-14 rounded-vg-2xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      icon,
      iconPosition = "left",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"

    const isDisabled = disabled || loading

    // When using asChild, we pass children directly without modification
    // The parent component is responsible for the content structure
    if (asChild) {
      return (
        <Comp
          className={cn(enhancedButtonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    // Normal button rendering with loading, icons, etc.
    return (
      <Comp
        className={cn(enhancedButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Loader2 className="animate-spin" />
        )}
        {!loading && icon && iconPosition === "left" && icon}
        {loading ? loadingText || children : children}
        {!loading && icon && iconPosition === "right" && icon}
      </Comp>
    )
  }
)
EnhancedButton.displayName = "EnhancedButton"

export { EnhancedButton, enhancedButtonVariants }

