import * as React from "react"
import { cn } from "@/lib/utils"
import { Icon, type BBIconName } from "@/components/ui/icon"

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: BBIconName
  /** Selected/filter-on state: blaze gloss with a white (onfill) icon. */
  selected?: boolean
  /** Renders a remove (x) affordance and calls this when it is pressed. */
  onRemove?: () => void
}

/** 28px pill, surface-2, 13px/600; selected = blaze gloss. Static label, filter toggle or removable tag. */
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
        "transition-colors duration-bb-micro focus-visible:outline-none focus-visible:shadow-focus",
        "[@media(pointer:coarse)]:min-h-9",
        selected
          ? "bg-bb-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_8px_16px_-8px_rgba(255,77,0,.7)]"
          : "bg-bb-surface-2 text-bb-text",
        !props.onClick && !onRemove && "cursor-default",
        className
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={14} tone={selected ? "onfill" : "soft"} />}
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
          <Icon name="close" size={12} tone="line" />
        </span>
      )}
    </button>
  )
})
