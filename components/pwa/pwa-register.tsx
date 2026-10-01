"use client"

import { useEffect } from "react"

/**
 * Registers /sw.js in production builds. In development any previously registered worker
 * is removed instead, so a stale cache can never mask hot-reloaded code.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()))
      return
    }
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined)
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])
  return null
}
