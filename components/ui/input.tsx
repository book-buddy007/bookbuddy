import * as React from "react"

import { cn } from "@/lib/utils"

/** Shared field chrome: 50px, radius 14, 1.5px border; focus = orange border + 4px ring. */
export const fieldClasses =
  "w-full rounded-bb-md border-[1.5px] border-bb-border bg-bb-surface px-4 text-[15px] text-bb-text transition-[border-color,box-shadow] duration-[120ms] placeholder:text-bb-faint focus-visible:border-bb-accent focus-visible:shadow-focus focus-visible:outline-none aria-[invalid=true]:border-bb-danger disabled:cursor-not-allowed disabled:bg-bb-surface-2 disabled:text-bb-faint"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          fieldClasses,
          "flex h-[50px] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
