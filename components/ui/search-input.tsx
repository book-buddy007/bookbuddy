import * as React from "react"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"

export interface SearchInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  /** Class for the outer wrapper (the input itself takes `className`). */
  wrapperClassName?: string
  /** Show the ⌘K keycaps at the right (desktop only). */
  shortcut?: boolean
}

/** Pill search field on the surface with e1, search glyph on the left, same focus ring as Input. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, wrapperClassName, placeholder = "Search", shortcut, ...props },
  ref
) {
  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <Icon name="search" size={20} tone="line" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bb-muted" />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        className={cn(
          "h-12 w-full rounded-full border-[1.5px] border-transparent bg-bb-surface pl-12 pr-4 text-[15px] text-bb-text shadow-[var(--bb-shadow-e1),inset_0_0_0_1px_var(--bb-border)]",
          shortcut && "md:pr-20",
          "placeholder:text-bb-faint transition-[border-color,box-shadow,background-color] duration-bb-micro",
          "focus-visible:border-bb-accent focus-visible:shadow-focus focus-visible:outline-none",
          "[&::-webkit-search-cancel-button]:appearance-none",
          className
        )}
        {...props}
      />
      {shortcut && (
        <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 gap-[3px] md:flex">
          <kbd className="flex h-6 min-w-6 items-center justify-center rounded-[7px] bg-bb-surface-2 px-1.5 font-sans text-xs font-bold text-bb-muted">⌘</kbd>
          <kbd className="flex h-6 min-w-6 items-center justify-center rounded-[7px] bg-bb-surface-2 font-sans text-xs font-bold text-bb-muted">K</kbd>
        </span>
      )}
    </div>
  )
})
