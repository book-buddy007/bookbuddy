"use client"

import * as React from "react"

/** True when the visitor prefers reduced motion, in the OS or in Book Buddy's own accessibility setting. */
export function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const read = () => setReduced(mq.matches || document.documentElement.hasAttribute("data-reduce-motion"))
    read()
    mq.addEventListener("change", read)
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reduce-motion"] })
    return () => {
      mq.removeEventListener("change", read)
      mo.disconnect()
    }
  }, [])
  return reduced
}

/** Becomes true (and stays true) once the element has scrolled into the lower part of the viewport. */
export function useSeen<T extends Element>(threshold = 0.2) {
  const ref = React.useRef<T>(null)
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, seen] as const
}

/** True at and above `minWidth` px (a media-query subscription, not a resize listener). */
export function useMinWidth(minWidth: number) {
  const [wide, setWide] = React.useState(true)
  React.useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`)
    const read = () => setWide(mq.matches)
    read()
    mq.addEventListener("change", read)
    return () => mq.removeEventListener("change", read)
  }, [minWidth])
  return wide
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a)
  const B = hex(b)
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("")
}
/** Interpolates along a colour ramp: p = 0 is the first stop, p = n-1 the last. */
export const at = (arr: string[], p: number) => {
  const i = Math.min(Math.floor(p), arr.length - 2)
  return mix(arr[i], arr[i + 1], Math.min(1, p - i))
}
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
