import Link from "next/link"
import { BrandLockup } from "@/components/ui/brand-mark"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Offline · Book Buddy" }

// Shown by the service worker when a page can't be reached.
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bb-ink px-6 text-center text-white">
      <BrandLockup size={28} onDark />
      <Icon name="wifi" size={56} className="text-white" />
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">You&apos;re offline</h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] text-white/70">
          Book Buddy needs a connection to open your library. Check your network and try again.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/dashboard">Try again</Link>
      </Button>
    </main>
  )
}
