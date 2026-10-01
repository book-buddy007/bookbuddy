import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { buttonVariants } from "@/components/ui/button"

/**
 * Legacy API, new look. EnhancedButton predates the design system and is used by ~60 pages;
 * it now renders the design-system Button (pill, gloss primary, navy secondary…) and only
 * keeps its extra props (loading, icon) and its old variant/size names, which map onto the
 * new ones. New code should use <Button> directly.
 */
type LegacyVariant =
  | "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  | "vg-primary" | "vg-cultural" | "vg-success" | "vg-warning" | "vg-error" | "vg-glass"

type LegacySize = "default" | "sm" | "lg" | "xl" | "icon"

const VARIANT_MAP: Record<LegacyVariant, NonNullable<VariantProps<typeof buttonVariants>["variant"]>> = {
  default: "default",
  destructive: "destructive",
  outline: "outline",
  secondary: "secondary",
  ghost: "ghost",
  link: "link",
  "vg-primary": "default",
  "vg-cultural": "secondary",
  "vg-success": "success",
  "vg-warning": "warning",
  "vg-error": "destructive",
  "vg-glass": "glass",
}

const SIZE_MAP: Record<LegacySize, NonNullable<VariantProps<typeof buttonVariants>["size"]>> = {
  default: "default",
  sm: "sm",
  lg: "lg",
  xl: "xl",
  icon: "icon-md",
}

export function enhancedButtonVariants(opts: { variant?: LegacyVariant | null; size?: LegacySize | null; className?: string } = {}) {
  return buttonVariants({
    variant: VARIANT_MAP[opts.variant ?? "default"] ?? "default",
    size: SIZE_MAP[opts.size ?? "default"] ?? "default",
    className: opts.className,
  })
}

export interface EnhancedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LegacyVariant | null
  size?: LegacySize | null
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, icon, iconPosition = "left", children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const classes = cn(enhancedButtonVariants({ variant, size, className }))

    // With asChild the parent owns the content structure.
    if (asChild) {
      return (
        <Comp className={classes} ref={ref} {...props}>
          {children}
        </Comp>
      )
    }

    return (
      <Comp className={classes} ref={ref} disabled={disabled || loading} {...props}>
        {loading && <Icon name="loader" size={18} className="animate-spin" fillLayer={false} />}
        {!loading && icon && iconPosition === "left" && icon}
        {loading ? loadingText || children : children}
        {!loading && icon && iconPosition === "right" && icon}
      </Comp>
    )
  }
)
EnhancedButton.displayName = "EnhancedButton"

export { EnhancedButton }
