"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/components/ui/use-mobile"
import { cn } from "@/lib/utils"

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** Footer actions. Right-aligned on desktop; full-width stacked on phones. */
  footer?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

/**
 * One API for both surfaces: a centred dialog (radius 28) from tablet up, and a bottom
 * sheet with a grabber on phones — phones never get popovers or floating dialogs.
 */
export function Modal({ open, onOpenChange, title, description, footer, children, className }: ModalProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className={className}>
          <div aria-hidden className="mx-auto -mt-2 mb-2 h-1.5 w-10 rounded-full bg-bb-border" />
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="py-4">{children}</div>
          {footer && <SheetFooter className="flex-col gap-2 [&>button]:w-full">{footer}</SheetFooter>}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter className="gap-2 sm:gap-3">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
