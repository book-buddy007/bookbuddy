"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icon, type BBIconName } from "@/components/ui/icon"

type Tone = "accent" | "success" | "danger"

const toneTile: Record<Tone, string> = {
  accent: "bg-bb-accent-soft text-bb-accent-ink",
  success: "bg-bb-success-soft text-bb-success-ink",
  danger: "bg-bb-danger-soft text-bb-danger-ink",
}

export interface AuthCardProps {
  title: string
  description?: React.ReactNode
  /** Optional status glyph shown above the title (success screens, expired links). */
  icon?: BBIconName
  tone?: Tone
  footer?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/** The white card that overlaps the navy band on every auth screen. Radius 28, e2. */
export function AuthCard({ title, description, icon, tone = "accent", footer, className, children }: AuthCardProps) {
  return (
    <section
      className={cn(
        "w-full rounded-bb-xl bg-bb-surface text-bb-text shadow-e2 animate-in fade-in-0 slide-in-from-bottom-2 duration-bb-ui",
        className,
      )}
    >
      <header className="flex flex-col items-center gap-3 px-6 pt-8 text-center sm:px-10 sm:pt-10">
        {icon && (
          <span className={cn("mb-1 grid h-16 w-16 place-items-center rounded-bb-lg", toneTile[tone])}>
            <Icon name={icon} size={30} />
          </span>
        )}
        <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[32px]">{title}</h1>
        {description && <p className="max-w-sm text-[15px] text-bb-muted">{description}</p>}
      </header>
      <div className="px-6 pb-8 pt-7 sm:px-10">{children}</div>
      {footer && (
        <footer className="border-t border-bb-border px-6 py-5 text-center text-sm text-bb-muted sm:px-10">{footer}</footer>
      )}
    </section>
  )
}

/** Card-shaped placeholder for route loading and Suspense fallbacks. */
export function AuthCardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="w-full rounded-bb-xl bg-bb-surface px-6 py-10 shadow-e2 sm:px-10">
      <div className="mx-auto h-8 w-48 animate-pulse rounded-full bg-bb-surface-2" />
      <div className="mx-auto mt-3 h-4 w-64 animate-pulse rounded-full bg-bb-surface-2" />
      <div className="mt-9 space-y-5">
        <div className="h-12 animate-pulse rounded-bb-md bg-bb-surface-2" />
        <div className="h-12 animate-pulse rounded-bb-md bg-bb-surface-2" />
        <div className="h-[52px] animate-pulse rounded-full bg-bb-surface-2" />
      </div>
    </div>
  )
}

/** Thin rule with a centred label ("or continue with"). */
export function AuthDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-bb-faint">
      <span className="h-px flex-1 bg-bb-border" />
      {children}
      <span className="h-px flex-1 bg-bb-border" />
    </div>
  )
}

/** Password input with a show/hide toggle that stays keyboard reachable. */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<typeof Input>, "type">>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = React.useState(false)
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? "text" : "password"} className={cn("pr-12", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-bb-muted transition-colors duration-bb-micro hover:bg-bb-surface-2 hover:text-bb-text focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Icon name={visible ? "eye-off" : "eye"} size={18} fillLayer={false} />
        </button>
      </div>
    )
  },
)

/** Full-width button that swaps its label for a spinner while pending. */
export function AuthButton({
  loading,
  loadingText,
  icon,
  children,
  disabled,
  className,
  ...props
}: ButtonProps & { loading?: boolean; loadingText?: string; icon?: BBIconName }) {
  return (
    <Button size="lg" className={cn("w-full", className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? (
        <>
          <Icon name="loader" size={18} fillLayer={false} className="animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        <>
          {children}
          {icon && <Icon name={icon} size={18} fillLayer={false} />}
        </>
      )}
    </Button>
  )
}

/** Google "G" mark (brand colours are Google's, not tokens). */
export function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
