import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Legacy API, new look: LoadingButton renders the design-system Button styles
 * (gloss primary, navy secondary, outline, ghost, destructive). New code should use
 * <Button> (or <EnhancedButton loading>) directly.
 */
type LbVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive"
type LbSize = "sm" | "md" | "lg" | "xl"

export interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  /** Alias of `loading`, used by a few older pages. */
  isLoading?: boolean
  loadingText?: string
  variant?: LbVariant
  size?: LbSize
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
}

export const loadingButtonVariants = {
  variant: { primary: "default", secondary: "secondary", outline: "outline", ghost: "ghost", destructive: "destructive" },
  size: { sm: "sm", md: "default", lg: "lg", xl: "xl" },
} as const

export function getLoadingButtonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: keyof typeof loadingButtonVariants.variant
  size?: keyof typeof loadingButtonVariants.size
  className?: string
}) {
  return buttonVariants({
    variant: loadingButtonVariants.variant[variant],
    size: loadingButtonVariants.size[size],
    className,
  })
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ className, children, loading = false, isLoading = false, loadingText, variant = "primary", size = "md", icon, iconPosition = "left", disabled, ...props }, ref) => {
    const busy = loading || isLoading
    return (
      <button ref={ref} className={cn(getLoadingButtonClasses({ variant, size, className }))} disabled={disabled || busy} {...props}>
        {busy && <Icon name="loader" size={18} className="animate-spin" fillLayer={false} />}
        {!busy && icon && iconPosition === "left" && icon}
        {busy ? loadingText || children : children}
        {!busy && icon && iconPosition === "right" && icon}
      </button>
    )
  }
)
LoadingButton.displayName = "LoadingButton"

export { LoadingButton }
