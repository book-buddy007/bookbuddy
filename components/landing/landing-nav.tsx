"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { BrandLockup } from "@/components/ui/brand-mark"
import { Icon, type BBIconName } from "@/components/ui/icon"

const LINKS: { href: string; label: string; icon: BBIconName }[] = [
  { href: "#day", label: "A day", icon: "clock" },
  { href: "#institutions", label: "Institutions", icon: "institution" },
  { href: "#security", label: "Security", icon: "shield" },
  { href: "#faq", label: "FAQ", icon: "chat" },
]

const pill = "focus-visible:outline-none focus-visible:shadow-focus"

/**
 * Sticky frosted navy navigation. From md up the section links sit inline; below 768px they
 * collapse into a menu button that opens a panel (closed by a link, Escape or the button).
 */
export function LandingNav() {
  const [open, setOpen] = React.useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === "dark"

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 z-50 border-b border-white/[.08] bg-[rgba(10,15,36,.88)] text-[#F2F4F8] [-webkit-backdrop-filter:blur(18px)_saturate(1.4)] [backdrop-filter:blur(18px)_saturate(1.4)]"
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-5 px-[clamp(20px,4vw,56px)] py-3.5">
        <Link href="/" aria-label="Book Buddy home" className={`rounded-lg ${pill}`}>
          <BrandLockup size={21} onDark />
        </Link>

        <div className="hidden items-center gap-[30px] text-[15px] text-[#A9B4D0] md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={`rounded-md transition-colors hover:text-white ${pill}`}>
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setTheme(dark ? "light" : "dark")}
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            className={`flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/[.14] bg-white/5 ${pill}`}
          >
            <Icon name={dark ? "sun" : "moon"} size={20} />
          </button>
          <Link href="/login" className={`hidden min-h-11 items-center rounded-full px-3 text-[15px] font-semibold md:inline-flex ${pill}`}>
            Sign in
          </Link>
          <Link
            href="/register"
            className={`hidden h-[42px] items-center rounded-full bg-bb-primary px-5 text-[15px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.65),inset_0_-2px_0_rgba(120,30,0,.25),0_10px_24px_-10px_rgba(255,77,0,.8)] md:inline-flex ${pill}`}
          >
            Get started
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="landing-menu"
            className={`flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/[.14] bg-white/5 md:hidden ${pill}`}
          >
            <Icon name={open ? "close" : "menu"} size={20} tone="line" />
          </button>
        </div>
      </div>

      {open && (
        <div
          id="landing-menu"
          className="absolute inset-x-3 top-[calc(100%+8px)] flex flex-col gap-0.5 rounded-3xl border border-white/10 bg-[rgba(10,15,36,.97)] p-2.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)] [-webkit-backdrop-filter:blur(18px)] [backdrop-filter:blur(18px)] md:hidden"
        >
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className={`flex h-[52px] items-center gap-3 rounded-[14px] px-3.5 text-[17px] font-semibold ${pill}`}>
              <Icon name={l.icon} size={22} /> {l.label}
            </a>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href="/login" onClick={() => setOpen(false)} className={`flex h-[50px] items-center justify-center rounded-full border border-white/20 font-semibold ${pill}`}>
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className={`flex h-[50px] items-center justify-center rounded-full bg-bb-primary font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.55)] ${pill}`}
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
