"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { landing } from "@/shared/design/content"
import { Hero3D } from "@/components/landing/hero-3d"

/** Navy hero: grid + glow, headline, CTAs, the Read/Listen indicator and the 3D book → headphones scene (kept as-is, re-tinted). */
export function HeroSection() {
  const [listening, setListening] = React.useState(false)

  return (
    <section
      className="relative overflow-hidden bg-bb-ink text-white [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:56px_56px]"
    >
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-10 h-[860px] w-[860px] rounded-full [background:radial-gradient(circle,rgba(255,77,0,0.30)_0%,rgba(59,91,219,0.26)_42%,transparent_70%)]" />

      <div className="relative mx-auto grid max-w-[1360px] grid-cols-[minmax(0,1fr)] items-center gap-6 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,min(724px,54%))] lg:px-16 lg:pb-24 lg:pt-14">
        <div className="flex min-w-0 flex-col gap-7">
          <span className="inline-flex h-[34px] items-center gap-2 self-start whitespace-nowrap rounded-full border border-bb-night-line bg-white/[0.04] px-4 text-sm text-bb-dim">
            <span aria-hidden className="h-2 w-2 rounded-full bg-bb-accent shadow-[0_0_12px_var(--bb-blaze)]" />
            {landing.eyebrow}
          </span>
          <h1 className="font-display text-[clamp(44px,6vw,80px)] font-extrabold leading-[0.96] tracking-[-0.04em] [text-wrap:balance]">
            {landing.headline.lead}{" "}
            <span className="bg-gradient-to-b from-orange-300 to-orange-500 to-60% bg-clip-text text-transparent">{landing.headline.accent}</span>
          </h1>
          <p className="max-w-[540px] text-lg leading-[1.55] text-bb-dim-2 sm:text-xl [text-wrap:pretty]">{landing.subhead}</p>
          <div className="flex flex-col gap-3.5 sm:flex-row">
            <Button asChild size="lg" className="h-[58px] px-[30px] text-[17px]">
              <Link href="/register">Book a Demo</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-[58px] border border-white/20 bg-white/[0.04] px-[30px] text-[17px] font-semibold text-[#F2F4F8] hover:bg-white/10 hover:text-white">
              <Link href="/catalog">Explore Guest Library</Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-1.5">
            <div role="img" aria-label={listening ? "Now in listen mode" : "Now in read mode"} className="flex gap-1 rounded-full border border-bb-night-line bg-bb-night-panel p-1 text-[13px] font-semibold">
              <span className={cn("flex h-[30px] items-center rounded-full px-3.5 transition-[background,color] duration-300", listening ? "text-bb-dim" : "bg-white text-bb-ink")}>Read</span>
              <span className={cn("flex h-[30px] items-center rounded-full px-3.5 transition-[background,color] duration-300", listening ? "bg-bb-primary text-white" : "text-bb-dim")}>Listen</span>
            </div>
            <span className="text-sm text-bb-dim">One book, every mode — synced.</span>
          </div>
        </div>

        {/* The open spread swings ~104px (17% of the 620px stage) to the left of the stage box; the 14.4% gutter keeps that overhang inside this column, clear of the copy. */}
        <div className="pl-[14.4%]">
          <Hero3D onListening={setListening} className="mx-auto w-full lg:mx-0" />
        </div>
      </div>
    </section>
  )
}
