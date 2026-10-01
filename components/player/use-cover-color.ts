"use client"

import { useEffect, useState } from "react"

/**
 * Dominant (vivid) colour of a cover image, used to tint the player's ambient blobs.
 * Samples a 24px thumbnail and averages the more saturated, mid-brightness pixels. If the
 * image is cross-origin without CORS headers the canvas is tainted and we quietly fall back
 * to `fallback` (blaze) — the player must look right either way.
 */
export function useCoverColor(url: string | null | undefined, fallback = "#FF4D00") {
  const [color, setColor] = useState(fallback)

  useEffect(() => {
    setColor(fallback)
    if (!url) return
    let cancelled = false
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const size = 24
        const canvas = document.createElement("canvas")
        canvas.width = canvas.height = size
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < data.length; i += 4) {
          const max = Math.max(data[i], data[i + 1], data[i + 2])
          const min = Math.min(data[i], data[i + 1], data[i + 2])
          const sat = max === 0 ? 0 : (max - min) / max
          if (data[i + 3] < 200 || max < 60 || max > 245 || sat < 0.25) continue
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
        }
        if (!cancelled && n > 8) setColor(`rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`)
      } catch {
        /* tainted canvas: keep the fallback */
      }
    }
    img.src = url
    return () => {
      cancelled = true
    }
  }, [url, fallback])

  return color
}
