import * as React from "react"
import { Loader2 } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

export interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg" | "xl"
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
}

export const loadingButtonVariants = {
  variant: {
    primary:
      "relative bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white font-bold shadow-[0_8px_30px_rgba(29,78,216,0.4)] hover:shadow-[0_20px_60px_rgba(6,182,212,0.6)] hover:scale-[1.02] [text-shadow:_0_2px_8px_rgb(0_0_0_/_40%)] transition-all duration-500 overflow-hidden after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-r after:from-white/0 after:via-white/30 after:to-white/0 after:translate-x-[-200%] hover:after:translate-x-[200%] after:transition-transform after:duration-700",
    secondary:
      "bg-white text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 shadow-lg hover:shadow-2xl font-semibold border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-cyan-500 transition-all duration-300",
    outline:
      "relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-md text-gray-800 dark:text-gray-200 font-semibold shadow-lg hover:shadow-2xl transition-all duration-500 border-2 border-gray-300 dark:border-gray-700 hover:border-transparent hover:bg-gradient-to-r hover:from-blue-700 hover:via-blue-600 hover:to-cyan-500 hover:text-white hover:scale-[1.02]",
    ghost:
      "bg-transparent text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:text-gray-300 dark:hover:bg-gray-800 font-medium transition-all duration-300",
    destructive:
      "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-2xl font-semibold [text-shadow:_0_2px_4px_rgb(0_0_0_/_30%)] transition-all duration-300",
  },
  size: {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2 text-base rounded-lg",
    lg: "px-6 py-3 text-lg rounded-xl",
    xl: "px-8 py-4 text-xl rounded-xl",
  }
}

export function getLoadingButtonClasses({ variant = "primary", size = "md", className }: { variant?: keyof typeof loadingButtonVariants.variant, size?: keyof typeof loadingButtonVariants.size, className?: string }) {
  return cn(
    "inline-flex items-center justify-center gap-2 transition-all duration-500 ease-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 dark:focus:ring-cyan-500",
    loadingButtonVariants.variant[variant],
    loadingButtonVariants.size[size],
    className
  )
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      className,
      children,
      loading = false,
      loadingText,
      variant = "primary",
      size = "md",
      icon,
      iconPosition = "left",
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={getLoadingButtonClasses({ variant, size, className })}
        disabled={disabled || loading}
        {...props}
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {!loading && icon && iconPosition === "left" && icon}
          {loading ? loadingText || children : children}
          {!loading && icon && iconPosition === "right" && icon}
        </span>
      </button>
    )
  }
)

LoadingButton.displayName = "LoadingButton"

export { LoadingButton }

