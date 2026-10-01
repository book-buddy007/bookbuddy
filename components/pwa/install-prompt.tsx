"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { BrandMark } from "@/components/ui/brand-mark"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "bb-install-dismissed"
const DISMISS_DAYS = 14

function readDismissed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY))
    return !!t && Date.now() - t < DISMISS_DAYS * 864e5
  } catch {
    return false
  }
}

/**
 * Phone-only "Install Book Buddy" card. Chrome/Android get the native install prompt;
 * iOS Safari (no install API) gets Add-to-Home-Screen instructions. Hidden once the app
 * runs standalone, or for two weeks after "Not now".
 */
export function InstallPrompt({ className }: { className?: string }) {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [ios, setIos] = React.useState(false)
  const [hidden, setHidden] = React.useState(true)

  React.useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone || readDismissed()) return
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIos(isIos)
    setHidden(!isIos)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setHidden(false)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const dismiss = () => {
    setHidden(true)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* private mode: just hide for this view */
    }
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    if (outcome === "accepted") setHidden(true)
    else dismiss()
  }

  if (hidden) return null

  return (
    <section
      aria-label="Install Book Buddy"
      className={cn("relative flex items-center gap-3 rounded-[20px] bg-bb-navy p-4 pr-12 text-white shadow-e2 md:hidden", className)}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-bb-ink">
        <BrandMark height={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-tight">Install Book Buddy</p>
        <p className="mt-0.5 text-xs leading-snug text-white/70">
          {ios ? "Tap Share, then “Add to Home Screen”." : "Opens full-screen from your home screen"}
        </p>
      </div>
      {!ios && (
        <Button size="sm" onClick={install}>
          Install
        </Button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Not now"
        className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10 focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Icon name="close" size={18} fillLayer={false} />
      </button>
    </section>
  )
}
