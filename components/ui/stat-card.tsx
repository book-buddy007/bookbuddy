import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { LucideIcon } from "@/components/ui/icons"
import { EnhancedCard } from "./enhanced-card"

const statCardVariants = cva(
  "relative overflow-hidden group",
  {
    variants: {
      variant: {
        default: "",
        primary: "border-l-4 border-blue-600 dark:border-blue-500",
        success: "border-l-4 border-vg-success-500",
        warning: "border-l-4 border-vg-warning-500",
        error: "border-l-4 border-vg-error-500",
        cultural: "border-l-4 border-cyan-600 dark:border-cyan-500",
      },
      trend: {
        up: "",
        down: "",
        neutral: "",
      },
    },
    defaultVariants: {
      variant: "default",
      trend: "neutral",
    },
  }
)

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof statCardVariants> {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  iconColor?: string
  iconBgColor?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  loading?: boolean
  animate?: boolean
  error?: any
  onRetry?: () => void
}

const isBackendStarting = (error: any) =>
  error?.code === 'BACKEND_STARTING' ||
  error?.status === 503 ||
  error?.status === 502;

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      variant,
      title,
      value,
      description,
      icon: Icon,
      iconColor = "text-vg-primary-500",
      iconBgColor = "bg-vg-primary-50 dark:bg-vg-primary-900/20",
      trend = "neutral",
      trendValue,
      loading = false,
      animate = true,
      error,
      onRetry,
      ...props
    },
    ref
  ) => {
    const getTrendColor = () => {
      switch (trend) {
        case "up":
          return "text-vg-success-500"
        case "down":
          return "text-vg-error-500"
        default:
          return "text-muted-foreground"
      }
    }

    const getTrendIcon = () => {
      switch (trend) {
        case "up":
          return "↑"
        case "down":
          return "↓"
        default:
          return "→"
      }
    }

    if (loading) {
      return (
        <EnhancedCard
          ref={ref}
          className={cn(statCardVariants({ variant }), className)}
          hover={false}
          animate={false}
          {...props}
        >
          <div className="space-y-3">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </EnhancedCard>
      )
    }

    if (error) {
      const starting = isBackendStarting(error);
      return (
        <EnhancedCard
          ref={ref}
          className={cn(statCardVariants({ variant: "error" }), className)}
          hover={false}
          animate={false}
          {...props}
        >
          <div className="flex flex-col h-full justify-between space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <div className="mt-2 space-y-2">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-500 flex items-center gap-2">
                {starting ? '⏳ Backend is starting up...' : '⚠️ Failed to load'}
              </p>
              {onRetry && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onRetry();
                  }}
                  className="text-xs text-primary underline hover:no-underline font-medium"
                >
                  ↻ Retry
                </button>
              )}
            </div>
          </div>
        </EnhancedCard>
      )
    }

    return (
      <EnhancedCard
        ref={ref}
        className={cn(statCardVariants({ variant, trend }), className)}
        animate={animate}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold tracking-tight">
                {value}
              </h3>
              {trendValue && (
                <span className={cn("text-sm font-medium flex items-center gap-1", getTrendColor())}>
                  <span>{getTrendIcon()}</span>
                  {trendValue}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {Icon && (
            <div className={cn(
              "rounded-xl p-3 transition-all duration-300 relative overflow-hidden",
              iconBgColor,
              "group-hover:scale-110 shadow-sm"
            )}>
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Icon className={cn("h-6 w-6 relative z-10", iconColor)} />
            </div>
          )}
        </div>

        {/* Premium glass shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60 pointer-events-none" />

        {/* Hover glow effect - Changed to Amber/Saffron */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none" />
      </EnhancedCard>
    )
  }
)
StatCard.displayName = "StatCard"

// Compact variant for smaller spaces
export interface CompactStatCardProps extends Omit<StatCardProps, 'description'> {
  compact?: boolean
}

const CompactStatCard = React.forwardRef<HTMLDivElement, CompactStatCardProps>(
  (
    {
      className,
      variant,
      title,
      value,
      icon: Icon,
      iconColor = "text-vg-primary-500",
      iconBgColor = "bg-vg-primary-50 dark:bg-vg-primary-900/20",
      trend = "neutral",
      trendValue,
      loading = false,
      ...props
    },
    ref
  ) => {
    if (loading) {
      return (
        <EnhancedCard
          ref={ref}
          className={cn(statCardVariants({ variant }), "p-4", className)}
          hover={false}
          animate={false}
          padding="none"
          {...props}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-vg-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </EnhancedCard>
      )
    }

    return (
      <EnhancedCard
        ref={ref}
        className={cn(statCardVariants({ variant }), "p-4", className)}
        padding="none"
        {...props}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn(
              "rounded-vg-lg p-2.5 transition-all duration-300",
              iconBgColor
            )}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h4 className="text-xl font-bold tracking-tight">
                {value}
              </h4>
              {trendValue && (
                <span className={cn(
                  "text-xs font-medium",
                  trend === "up" ? "text-vg-success-500" :
                    trend === "down" ? "text-vg-error-500" :
                      "text-muted-foreground"
                )}>
                  {trendValue}
                </span>
              )}
            </div>
          </div>
        </div>
      </EnhancedCard>
    )
  }
)
CompactStatCard.displayName = "CompactStatCard"

export { StatCard, CompactStatCard, statCardVariants }

