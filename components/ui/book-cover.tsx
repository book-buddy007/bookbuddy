import * as React from "react"
import { cn } from "@/lib/utils"

export type CoverSubject = "physics" | "science" | "english" | "history" | "hindi"
const SUBJECTS: CoverSubject[] = ["physics", "science", "english", "history", "hindi"]

/** Pick a stable subject gradient from a title when the subject is unknown. */
export function coverSubjectFor(title: string, subject?: string | null): CoverSubject {
  const s = (subject ?? "").toLowerCase()
  const hit = SUBJECTS.find((k) => s.includes(k))
  if (hit) return hit
  if (/math|chem|bio|science/.test(s)) return "science"
  if (/hindi|sanskrit|urdu|marathi/.test(s)) return "hindi"
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash)
  return SUBJECTS[Math.abs(hash) % SUBJECTS.length]
}

export interface BookCoverProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subject?: string | null
  /** Real cover image. Falls back to the subject gradient when absent or broken. */
  coverUrl?: string | null
  /** Pixel width; height follows the 84:124 book ratio unless `height` is given. */
  width?: number
  height?: number
}

/**
 * Every book cover in the app goes through this: real image if there is one, otherwise a
 * subject gradient, always with the diagonal sheen and the spine strip.
 */
export function BookCover({ title, subject, coverUrl, width = 84, height, className, style, ...props }: BookCoverProps) {
  const [failed, setFailed] = React.useState(false)
  const h = height ?? Math.round((width * 124) / 84)
  const spine = width >= 150 ? 10 : 7
  const showImage = !!coverUrl && !coverUrl.includes("placeholder") && !failed
  const key = coverSubjectFor(title, subject)
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-[4px_12px_12px_4px] shadow-e2", className)}
      style={{ width, height: h, background: `var(--bb-cover-${key})`, ...style }}
      {...props}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl!}
          alt={title}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span
          className="absolute inset-x-0 top-0 line-clamp-4 break-words p-[12%] pl-[18%] font-display font-extrabold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: Math.max(10, Math.round(width * 0.14)) }}
        >
          {title}
        </span>
      )}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.28)_48%,transparent_60%)]" />
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,rgba(0,0,0,.3),rgba(255,255,255,.1))]"
        style={{ width: spine }}
      />
    </div>
  )
}
