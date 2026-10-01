"use client"

import * as React from "react"
import { useAppStore } from "@/store/useAppStore"

/**
 * Applies the Settings → Accessibility switches to the whole app.
 * They were saved in the app store but nothing read them, so the toggles did nothing.
 * The attributes are styled in styles/bb-tokens.css ("Accessibility preferences").
 */
export function A11yPreferences() {
  const reduceMotion = useAppStore((s) => s.reduceMotion)
  const highContrast = useAppStore((s) => s.highContrast)

  React.useEffect(() => {
    const root = document.documentElement
    root.toggleAttribute("data-reduce-motion", reduceMotion)
    if (highContrast) root.setAttribute("data-contrast", "high")
    else root.removeAttribute("data-contrast")
  }, [reduceMotion, highContrast])

  return null
}
