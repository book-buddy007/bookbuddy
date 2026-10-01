"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Segmented } from "@/components/ui/segmented"
import { Icon } from "@/components/ui/icon"

type Mode = "light" | "dark" | "system"

/**
 * Light / Dark / System selector. next-themes persists the choice (localStorage key
 * `bb-theme`) and applies it to <html> as data-theme and the `dark` class; "system"
 * follows prefers-color-scheme, which is the default.
 */
export function ThemeToggle({ className, fullWidth }: { className?: string; fullWidth?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <Segmented<Mode>
      aria-label="Colour theme"
      className={className}
      fullWidth={fullWidth}
      value={(mounted ? (theme as Mode) : "system") ?? "system"}
      onValueChange={setTheme}
      options={[
        { value: "light", label: <><Icon name="sun" size={16} />Light</> },
        { value: "dark", label: <><Icon name="theme" size={16} />Dark</> },
        { value: "system", label: "System" },
      ]}
    />
  )
}
