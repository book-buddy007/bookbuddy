import * as React from "react"
import { cn } from "@/lib/utils"

export interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "card" | "text" | "circle" | "button"
  animate?: boolean
}

const LoadingSkeleton = React.forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ className, variant = "default", animate = true, ...props }, ref) => {
    const baseClasses = "bg-gray-200 dark:bg-gray-700 rounded-vg-md"
    const animateClasses = animate ? "animate-pulse" : ""

    const variantClasses = {
      default: "h-4 w-full",
      card: "h-32 w-full rounded-vg-xl",
      text: "h-4 w-3/4",
      circle: "h-12 w-12 rounded-full",
      button: "h-10 w-24 rounded-vg-lg",
    }

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          animateClasses,
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
LoadingSkeleton.displayName = "LoadingSkeleton"

// Skeleton group for multiple skeletons
export interface SkeletonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number
  spacing?: "sm" | "md" | "lg"
  variant?: LoadingSkeletonProps["variant"]
}

const SkeletonGroup = React.forwardRef<HTMLDivElement, SkeletonGroupProps>(
  ({ className, count = 3, spacing = "md", variant = "default", ...props }, ref) => {
    const spacingClasses = {
      sm: "space-y-2",
      md: "space-y-4",
      lg: "space-y-6",
    }

    return (
      <div
        ref={ref}
        className={cn(spacingClasses[spacing], className)}
        {...props}
      >
        {Array.from({ length: count }).map((_, index) => (
          <LoadingSkeleton key={index} variant={variant} />
        ))}
      </div>
    )
  }
)
SkeletonGroup.displayName = "SkeletonGroup"

// Card skeleton with header and content
export interface CardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  showHeader?: boolean
  showFooter?: boolean
}

const CardSkeleton = React.forwardRef<HTMLDivElement, CardSkeletonProps>(
  ({ className, showHeader = true, showFooter = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-vg-xl border border-border bg-card p-6 space-y-4",
          className
        )}
        {...props}
      >
        {showHeader && (
          <div className="space-y-2">
            <LoadingSkeleton className="h-6 w-1/3" />
            <LoadingSkeleton className="h-4 w-2/3" />
          </div>
        )}
        <div className="space-y-3">
          <LoadingSkeleton className="h-4 w-full" />
          <LoadingSkeleton className="h-4 w-5/6" />
          <LoadingSkeleton className="h-4 w-4/6" />
        </div>
        {showFooter && (
          <div className="flex gap-2 pt-2">
            <LoadingSkeleton variant="button" />
            <LoadingSkeleton variant="button" />
          </div>
        )}
      </div>
    )
  }
)
CardSkeleton.displayName = "CardSkeleton"

// Table skeleton
export interface TableSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number
  columns?: number
}

const TableSkeleton = React.forwardRef<HTMLDivElement, TableSkeletonProps>(
  ({ className, rows = 5, columns = 4, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-3", className)}
        {...props}
      >
        {/* Header */}
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, index) => (
            <LoadingSkeleton key={`header-${index}`} className="h-8 flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <LoadingSkeleton key={`cell-${rowIndex}-${colIndex}`} className="h-12 flex-1" />
            ))}
          </div>
        ))}
      </div>
    )
  }
)
TableSkeleton.displayName = "TableSkeleton"

// Dashboard skeleton with stats and cards
export interface DashboardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  showStats?: boolean
  statsCount?: number
  cardsCount?: number
}

const DashboardSkeleton = React.forwardRef<HTMLDivElement, DashboardSkeletonProps>(
  ({ className, showStats = true, statsCount = 4, cardsCount = 3, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-6", className)}
        {...props}
      >
        {/* Header */}
        <div className="space-y-2">
          <LoadingSkeleton className="h-8 w-1/4" />
          <LoadingSkeleton className="h-4 w-1/3" />
        </div>

        {/* Stats */}
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: statsCount }).map((_, index) => (
              <LoadingSkeleton key={`stat-${index}`} variant="card" className="h-28" />
            ))}
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: cardsCount }).map((_, index) => (
            <CardSkeleton key={`card-${index}`} />
          ))}
        </div>
      </div>
    )
  }
)
DashboardSkeleton.displayName = "DashboardSkeleton"

export {
  LoadingSkeleton,
  SkeletonGroup,
  CardSkeleton,
  TableSkeleton,
  DashboardSkeleton,
}

