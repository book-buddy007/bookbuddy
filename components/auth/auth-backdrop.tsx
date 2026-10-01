import Link from "next/link"
import { BrandLockup } from "@/components/ui/brand-mark"
import { cn } from "@/lib/utils"

/**
 * AuthBackdrop — the shared frame for every auth screen: a navy hero band (grid + glow)
 * carrying the brand, with the form card overlapping its lower edge on the cloud background.
 * `wide` widens the column for two-up content (onboarding); `actions` sits at the band's right.
 */
export function AuthBackdrop({
  children,
  wide,
  actions,
}: {
  children: React.ReactNode
  wide?: boolean
  actions?: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-bb-bg">
      <div className="relative overflow-hidden bg-bb-ink px-5 pb-32 pt-[max(2rem,var(--bb-safe-top))] sm:px-8 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:56px_56px]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full [background:radial-gradient(circle,rgba(255,77,0,0.30)_0%,rgba(30,58,138,0.26)_45%,transparent_70%)]" />
        <div className="relative flex items-center justify-between gap-4">
          <Link href="/" aria-label="Book Buddy home" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:shadow-focus">
            <BrandLockup size={22} onDark />
          </Link>
          {actions}
        </div>
      </div>
      <main
        className={cn(
          "relative z-10 mx-auto -mt-24 flex w-full flex-1 flex-col px-4 pb-16",
          wide ? "max-w-[760px] sm:px-6" : "max-w-[520px] sm:px-0",
        )}
      >
        {children}
      </main>
    </div>
  )
}
