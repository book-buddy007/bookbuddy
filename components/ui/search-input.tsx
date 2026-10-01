import * as React from "react"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"

export interface SearchInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  /** Class for the outer wrapper (the input itself takes `className`). */
  wrapperClassName?: string
}

/** Pill search field: cloud background, search glyph on the left, same focus ring as Input. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, wrapperClassName, placeholder = "Search", ...props },
  ref
) {
  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        className={cn(
          "h-12 w-full rounded-full border-[1.5px] border-transparent bg-bb-bg pl-12 pr-4 text-[15px] text-bb-text",
          "placeholder:text-bb-faint transition-[border-color,box-shadow,background-color] duration-[120ms]",
          "focus-visible:border-bb-accent focus-visible:bg-bb-surface focus-visible:shadow-focus focus-visible:outline-none",
          "[&::-webkit-search-cancel-button]:appearance-none",
          className
        )}
        {...props}
      />
    </div>
  )
})
