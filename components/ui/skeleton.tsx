import { cn } from "@/lib/utils"

// Loading placeholder: surface-2 with a soft shimmer (frozen under reduced motion).
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-bb-sm bg-bb-surface-2",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-bb-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent dark:before:via-white/10",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
