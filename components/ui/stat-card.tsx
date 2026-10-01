import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { type LucideIcon } from "@/components/ui/icons"
import { Icon, type BBIconName } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Stat card: radius 18, padding 18, 13px muted label, Bricolage 34/800 value.
 * `featured` (alias of the old `primary`) is the navy gradient variant; use at most one
 * per row. The legacy semantic variants only tint the trend/accent now — the design
 * system has no coloured left-border cards.
 */
const statCardVariants = cva(
  "relative overflow-hidden rounded-[18px] p-[18px] transition-[transform,box-shadow] duration-bb-ui ease-bb",
  {
    variants: {
      variant: {
        default: "bg-bb-surface text-bb-text shadow-e1",
        featured: "bg-bb-navy text-white shadow-[var(--bb-shadow-navy)]",
        primary: "bg-bb-navy text-white shadow-[var(--bb-shadow-navy)]",
        info: "bg-bb-surface text-bb-text shadow-e1",
        success: "bg-bb-surface text-bb-text shadow-e1",
        warning: "bg-bb-surface text-bb-text shadow-e1",
        error: "bg-bb-surface text-bb-text shadow-e1",
        cultural: "bg-bb-surface text-bb-text shadow-e1",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface StatCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof statCardVariants> {
  title: string
  value: string | number
  description?: string
  /** Either a duotone glyph name or a (compat) lucide icon component. */
  icon?: LucideIcon | React.ElementType | BBIconName
  /** Legacy props, accepted so existing call sites compile; the icon is always duotone. */
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
  error?.code === "BACKEND_STARTING" || error?.status === 503 || error?.status === 502

function StatIcon({ icon, featured }: { icon: StatCardProps["icon"]; featured: boolean }) {
  if (!icon) return null
  const Glyph = icon
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]",
        featured ? "bg-white/10 text-white" : "bg-bb-accent-soft text-bb-text"
      )}
    >
      {typeof Glyph === "string" ? (
        <Icon name={Glyph as BBIconName} size={22} />
      ) : (
        <Glyph className="h-[22px] w-[22px]" />
      )}
    </div>
  )
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      variant,
      title,
      value,
      description,
      icon,
      iconColor: _iconColor,
      iconBgColor: _iconBgColor,
      trend = "neutral",
      trendValue,
      loading = false,
      animate: _animate,
      error,
      onRetry,
      ...props
    },
    ref
  ) => {
    const featured = variant === "featured" || variant === "primary"
    const muted = featured ? "text-white/70" : "text-bb-muted"

    if (loading) {
      return (
        <div ref={ref} className={cn(statCardVariants({ variant }), className)} {...props}>
          <div className="space-y-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      )
    }

    if (error) {
      const starting = isBackendStarting(error)
      return (
        <div ref={ref} className={cn(statCardVariants({ variant: "default" }), className)} {...props}>
          <p className="text-[13px] text-bb-muted">{title}</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-bb-warning-ink">
            <Icon name="alert" size={18} />
            {starting ? "Backend is starting up…" : "Failed to load"}
          </p>
          {onRetry && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onRetry()
              }}
              className="mt-2 text-[13px] font-semibold text-bb-accent-ink hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      )
    }

    const trendColor =
      trend === "up" ? "text-bb-success-ink" : trend === "down" ? "text-bb-danger-ink" : muted

    return (
      <div ref={ref} className={cn(statCardVariants({ variant }), className)} {...props}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={cn("text-[13px] font-medium", muted)}>{title}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-[34px] font-extrabold leading-none tracking-[-0.03em]">
                {value}
              </span>
              {trendValue && (
                <span className={cn("text-[13px] font-semibold", trendColor)}>
                  {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
                </span>
              )}
            </div>
            {description && <p className={cn("mt-2 text-xs", muted)}>{description}</p>}
          </div>
          <StatIcon icon={icon} featured={featured} />
        </div>
      </div>
    )
  }
)
StatCard.displayName = "StatCard"

// Compact variant for smaller spaces
export interface CompactStatCardProps extends Omit<StatCardProps, "description"> {
  compact?: boolean
}

const CompactStatCard = React.forwardRef<HTMLDivElement, CompactStatCardProps>(
  ({ className, variant, title, value, icon, trend = "neutral", trendValue, loading = false, error: _e, onRetry: _r, iconColor: _c, iconBgColor: _b, animate: _a, compact: _cp, ...props }, ref) => {
    const featured = variant === "featured" || variant === "primary"
    return (
      <div ref={ref} className={cn(statCardVariants({ variant }), "p-4", className)} {...props}>
        <div className="flex items-center gap-3">
          {loading ? <Skeleton className="h-11 w-11 rounded-[14px]" /> : <StatIcon icon={icon} featured={featured} />}
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-xs font-medium", featured ? "text-white/70" : "text-bb-muted")}>{title}</p>
            {loading ? (
              <Skeleton className="mt-1 h-5 w-16" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold tracking-[-0.03em]">{value}</span>
                {trendValue && (
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      trend === "up" ? "text-bb-success-ink" : trend === "down" ? "text-bb-danger-ink" : "text-bb-muted"
                    )}
                  >
                    {trendValue}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)
CompactStatCard.displayName = "CompactStatCard"

export { StatCard, CompactStatCard, statCardVariants }
