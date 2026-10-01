"use client"

import * as React from "react"
import Link from "next/link"
import { BrandLockup } from "@/components/ui/brand-mark"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#reading-modes", label: "Reading Modes" },
  { href: "#varta", label: "Varta" },
  { href: "#faq", label: "FAQ" },
]

/** Landing navigation, drawn on the navy hero. Links collapse into a sheet on phones. */
export function LandingNav() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <div className="relative z-10 flex items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-16 lg:py-6">
        <Link href="/" aria-label="Book Buddy home" className="rounded-lg focus-visible:outline-none focus-visible:shadow-focus">
          <BrandLockup size={22} onDark />
        </Link>
        <nav aria-label="Sections" className="hidden gap-9 text-[15px] text-bb-dim md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-md transition-colors hover:text-white focus-visible:outline-none focus-visible:shadow-focus">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3 sm:gap-5">
          <Link href="/login" className="hidden min-h-11 items-center text-[15px] font-medium text-white hover:text-bb-peach sm:inline-flex">
            Sign In
          </Link>
          <Button asChild size="md" className="hidden sm:inline-flex">
            <Link href="/register">Get Started</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10 focus-visible:outline-none focus-visible:shadow-focus md:hidden"
          >
            <Icon name="menu" size={24} fillLayer={false} />
          </button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="md:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div aria-hidden className="mx-auto -mt-2 mb-4 h-1.5 w-10 rounded-full bg-bb-border" />
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 text-lg font-semibold hover:bg-bb-surface-2">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
