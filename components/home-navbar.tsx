"use client"

import { useState } from "react"
import Link from "next/link"
import { getLoadingButtonClasses } from "@/components/landing/loading-button"
import { GraduationCap, Menu, X } from "@/components/ui/icons"
import { brand } from "@/shared/design/content"

export function HomeNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--night-ink)]/80 border-b border-[var(--gold)]/10 shadow-lg shadow-black/10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <div className="p-2 rounded-lg bg-gradient-to-r from-[var(--deep-saffron)] to-[var(--saffron)] shadow-lg shadow-[var(--saffron)]/20">
                <GraduationCap className="h-6 w-6 text-white drop-shadow-md" />
              </div>
              <span className="gradient-text-indic font-extrabold">{brand.name}</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm font-medium text-[var(--ivory-cream)]/70 hover:text-[var(--gold)] transition-colors duration-300"
            >
              Features
            </Link>
            <Link
              href="#reading-modes"
              className="text-sm font-medium text-[var(--ivory-cream)]/70 hover:text-[var(--gold)] transition-colors duration-300"
            >
              Reading Modes
            </Link>
            <Link
              href="#varta"
              className="text-sm font-medium text-[var(--ivory-cream)]/70 hover:text-[var(--gold)] transition-colors duration-300"
            >
              Varta
            </Link>
            <Link
              href="#faq"
              className="text-sm font-medium text-[var(--ivory-cream)]/70 hover:text-[var(--gold)] transition-colors duration-300"
            >
              FAQ
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className={getLoadingButtonClasses({ variant: "ghost", size: "md", className: "!text-[var(--ivory-cream)]/80 hover:!text-[var(--gold)] font-semibold" })}>
              <span className="relative z-10 inline-flex items-center justify-center gap-2">Sign In</span>
            </Link>
            <Link
              href="/register"
              className={getLoadingButtonClasses({ variant: "primary", size: "md", className: "!bg-gradient-to-r !from-[var(--deep-saffron)] !to-[var(--saffron)] shadow-lg hover:shadow-xl shadow-[var(--saffron)]/20 hover:shadow-[var(--saffron)]/40" })}>
              <span className="relative z-10 inline-flex items-center justify-center gap-2">Get Started</span>
            </Link>
          </div>

          <button className="md:hidden p-2 rounded-md text-[var(--ivory-cream)]" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden py-4 px-4 bg-[var(--night-ink)]/95 backdrop-blur-lg border-b border-[var(--gold)]/10">
          <nav className="flex flex-col space-y-4">
            <Link
              href="#features"
              className="text-sm font-medium text-[var(--ivory-cream)]/70 hover:text-[var(--gold)] transition-colors duration-300"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#reading-modes"
              className="text-sm font-medium text-[var(--ivory-cream)]/70 hover:text-[var(--gold)] transition-colors duration-300"
              onClick={() => setIsMenuOpen(false)}
            >
              Reading Modes
            </Link>
            <Link
              href="#varta"
              className="text-sm font-medium text-[var(--ivory-cream)]/70 hover:text-[var(--gold)] transition-colors duration-300"
              onClick={() => setIsMenuOpen(false)}
            >
              Varta
            </Link>
            <Link
              href="#faq"
              className="text-sm font-medium text-[var(--ivory-cream)]/70 hover:text-[var(--gold)] transition-colors duration-300"
              onClick={() => setIsMenuOpen(false)}
            >
              FAQ
            </Link>
            <div className="flex flex-col space-y-2 pt-2 border-t border-[var(--gold)]/10">
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                /* The landing is a forced-LIGHT theme (see app/home.module.css:
                   --night-ink/--ivory-cream are overridden light), but the shared
                   `outline` variant still carries `dark:bg-gray-900/90`, which fires
                   when the OS is in dark mode → the button background went dark while
                   the forced near-black text stayed put, i.e. dark-on-dark/invisible.
                   Pin the background light in BOTH themes (!important beats the dark:
                   variant) so it always reads as the light-mode pill it's meant to be. */
                className={getLoadingButtonClasses({ variant: "outline", size: "md", className: "w-full !bg-white/90 hover:!bg-white !text-[var(--ivory-cream)] !border-[var(--gold)]/40" })}>
                <span className="relative z-10 inline-flex items-center justify-center gap-2">Sign In</span>
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMenuOpen(false)}
                className={getLoadingButtonClasses({ variant: "primary", size: "md", className: "w-full !bg-gradient-to-r !from-[var(--deep-saffron)] !to-[var(--saffron)]" })}>
                <span className="relative z-10 inline-flex items-center justify-center gap-2">Get Started</span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
