import * as React from "react"
import { cn } from "@/lib/utils"
import { Icon, type BBIconName } from "@/components/ui/icon"

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: BBIconName
  /** Selected/filter-on state: accent-soft with an accent ring. */
  selected?: boolean
  /** Renders a remove (x) affordance and calls this when it is pressed. */
  onRemove?: () => void
}

/** 28px pill, surface-2, 13px/600. Static label, filter toggle or removable tag. */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { icon, selected, onRemove, className, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={props.onClick ? !!selected : undefined}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold",
        "transition-colors duration-[120ms] focus-visible:outline-none focus-visible:shadow-focus",
        "[@media(pointer:coarse)]:min-h-9",
        selected
          ? "bg-bb-accent-soft text-bb-accent-ink ring-[1.5px] ring-inset ring-bb-accent"
          : "bg-bb-surface-2 text-bb-text",
        !props.onClick && !onRemove && "cursor-default",
        className
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
      {onRemove && (
        <span
          role="button"
          aria-label="Remove"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              e.stopPropagation()
              onRemove()
            }
          }}
          className="-mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10"
        >
          <Icon name="close" size={12} fillLayer={false} />
        </span>
      )}
    </button>
  )
})
