import * as React from "react"
import { cn } from "@/lib/utils"
import { BookCover } from "@/components/ui/book-cover"
import { Progress } from "@/components/ui/progress"
import { Chip } from "@/components/ui/chip"
import type { BBIconName } from "@/components/ui/icon"

export interface BookListCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: string
  publisher?: string
  subject?: string | null
  coverUrl?: string | null
  /** 0–100. Omit to hide the progress bar. */
  progress?: number
  formats?: { label: string; icon?: BBIconName }[]
  /** Adds hover lift + focus ring for cards that open something. */
  interactive?: boolean
}

/** Design-system book card: white, radius 18, padding 16, cover 84x124 beside the details. */
export function BookListCard({
  title,
  publisher,
  subject,
  coverUrl,
  progress,
  formats,
  interactive,
  className,
  ...props
}: BookListCardProps) {
  return (
    <div
      className={cn(
        "flex gap-4 rounded-[18px] bg-bb-surface p-4 shadow-e1",
        interactive && "bb-lift cursor-pointer focus-visible:outline-none focus-visible:shadow-focus",
        className
      )}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    >
      <BookCover title={title} subject={subject} coverUrl={coverUrl} width={84} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug">{title}</h3>
        {publisher && <p className="mt-0.5 truncate text-[13px] text-bb-muted">{publisher}</p>}
        {typeof progress === "number" && (
          <div className="mt-3 flex items-center gap-2">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs font-semibold text-bb-muted">{Math.round(progress)}%</span>
          </div>
        )}
        {formats && formats.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {formats.map((f) => (
              <Chip key={f.label} icon={f.icon}>
                {f.label}
              </Chip>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
