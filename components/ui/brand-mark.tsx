import * as React from "react"
import { cn } from "@/lib/utils"

/** The two-circle mark: a cobalt circle overlapped by a glossy blaze one. */
export function BrandMark({ height = 26, className }: { height?: number; className?: string }) {
  const d = height
  return (
    <span aria-hidden className={cn("relative inline-block shrink-0", className)} style={{ width: d * 1.54, height: d }}>
      <span
        className="absolute left-0 top-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,.5)]"
        style={{ width: d, height: d, background: "linear-gradient(160deg,#4C6FFF 0%,var(--bb-cobalt) 60%)" }}
      />
      <span
        className="absolute top-0 rounded-full bg-bb-primary opacity-95 shadow-[inset_0_1px_0_rgba(255,255,255,.6)]"
        style={{ width: d, height: d, left: d * 0.54 }}
      />
    </span>
  )
}

/** Mark + "Book Buddy" wordmark (Bricolage 800). `onDark` forces white text. */
export function BrandLockup({ size = 22, onDark, className }: { size?: number; onDark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark height={Math.round(size * 1.18)} />
      <span
        className={cn("font-display font-extrabold leading-none tracking-[-0.03em]", onDark ? "text-white" : "text-bb-text")}
        style={{ fontSize: size }}
      >
        Book Buddy
      </span>
    </span>
  )
}
