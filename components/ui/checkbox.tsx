"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "@/components/ui/icons"

import { cn } from "@/lib/utils"

// 24px, radius 7, checked = blaze gradient + white check. A 44px invisible hit area
// keeps it tappable on touch without changing the drawn size.
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer relative h-6 w-6 shrink-0 rounded-[7px] border-[1.5px] border-bb-border bg-bb-surface transition-[box-shadow,background-color,border-color] duration-[120ms] focus-visible:outline-none focus-visible:shadow-focus focus-visible:border-bb-accent disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-transparent data-[state=checked]:bg-bb-primary data-[state=checked]:text-white after:absolute after:-inset-2.5 after:content-[''] [@media(pointer:fine)]:after:hidden",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-4 w-4" strokeWidth={2.4} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
