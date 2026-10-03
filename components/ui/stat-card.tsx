import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { type LucideIcon } from "@/components/ui/icons"
import { Icon, type BBIconName } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Stat card: radius 24, padding 18, glossy 44px icon tile (blaze, or cobalt with `hue="ai"`),
 * 13px muted label, Bricolage 34/800 value, optional 36px sparkline and a success/danger trend
 * pill. `featured` (alias of the old `primary`) is the navy stage variant with a corner glow;
 * use at most one per row. The legacy semantic variants only tint the trend/accent now — the
 * design system has no coloured left-border cards.
 */
const statCardVariants = cva(
  "relative overflow-hidden rounded-[24px] p-[18px] transition-[transform,box-shadow] duration-bb-ui ease-bb",
  {
    variants: {
      variant: {
        default: "bg-bb-surface text-bb-text shadow-e1",
        featured: "bg-bb-stage text-[#F2F4F8] shadow-stage",
        primary: "bg-bb-stage text-[#F2F4F8] shadow-stage",
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
  /** Icon tile colour: blaze (default) or cobalt for AI metrics. */
  hue?: "default" | "ai"
  /** Optional series drawn as a 36px area chart under the value. */
  sparkline?: number[]
  loading?: boolean
  animate?: boolean
  error?: any
  onRetry?: () => void
}

const isBackendStarting = (error: any) =>
  error?.code === "BACKEND_STARTING" || error?.status === 503 || error?.status === 502

function StatIcon({ icon, featured, hue }: { icon: StatCardProps["icon"]; featured: boolean; hue?: "default" | "ai" }) {
  if (!icon) return null
  const Glyph = icon
  const ai = hue === "ai"
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-bb-tile",
        featured
          ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.2)]"
          : ai
            ? "bg-bb-grad-cobalt text-white shadow-[inset_0_1px_0_rgba(255,255,255,.45),0_10px_18px_-10px_rgba(59,91,219,.85)]"
            : "bg-bb-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_10px_18px_-10px_rgba(255,77,0,.8)]"
      )}
    >
      {typeof Glyph === "string" ? (
        <Icon name={Glyph as BBIconName} size={22} tone={featured ? "soft" : "onfill"} />
      ) : (
        <Glyph className="h-[22px] w-[22px]" />
      )}
    </div>
  )
}

/** 36px area sparkline; the stroke keeps a constant width however the card stretches. */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 200, 34 - ((v - min) / span) * 28] as const)
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("")
  return (
    <svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden className="mt-3 block h-9 w-full">
      <path d={`${line}L200 40L0 40Z`} fill={color} opacity={0.14} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function TrendPill({ trend, children }: { trend: "up" | "down" | "neutral"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-[9px] py-[3px] text-xs font-bold",
        trend === "up" && "bg-bb-success-soft text-bb-success-ink",
        trend === "down" && "bg-bb-danger-soft text-bb-danger-ink",
        trend === "neutral" && "bg-bb-surface-2 text-bb-text-muted"
      )}
    >
      {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {children}
    </span>
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
      hue,
      sparkline,
      loading = false,
      animate: _animate,
      error,
      onRetry,
      ...props
    },
    ref
  ) => {
    const featured = variant === "featured" || variant === "primary"
    const muted = featured ? "text-[#A9B4D0]" : "text-bb-muted"

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

    return (
      <div ref={ref} className={cn(statCardVariants({ variant }), className)} {...props}>
        {featured && (
          <div className="pointer-events-none absolute -right-[60px] -top-[70px] h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(255,77,0,.35),transparent_70%)]" />
        )}
        <div className="relative flex items-center justify-between gap-3">
          <StatIcon icon={icon} featured={featured} hue={hue} />
          {trendValue && <TrendPill trend={trend}>{trendValue}</TrendPill>}
        </div>
        <div className="relative mt-2.5">
          <p className={cn("text-[13px]", muted)}>{title}</p>
          <p className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]">{value}</p>
          {description && <p className={cn("mt-1.5 text-xs", muted)}>{description}</p>}
        </div>
        {sparkline && (
          <div className="relative">
            <Sparkline data={sparkline} color={hue === "ai" ? "#3B5BDB" : featured ? "#FF8A3D" : "#FF4D00"} />
          </div>
        )}
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
  ({ className, variant, title, value, icon, trend = "neutral", trendValue, hue, sparkline: _s, loading = false, error: _e, onRetry: _r, iconColor: _c, iconBgColor: _b, animate: _a, compact: _cp, ...props }, ref) => {
    const featured = variant === "featured" || variant === "primary"
    return (
      <div ref={ref} className={cn(statCardVariants({ variant }), "p-4", className)} {...props}>
        <div className="flex items-center gap-3">
          {loading ? <Skeleton className="h-11 w-11 rounded-bb-tile" /> : <StatIcon icon={icon} featured={featured} hue={hue} />}
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-xs font-medium", featured ? "text-[#A9B4D0]" : "text-bb-muted")}>{title}</p>
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
