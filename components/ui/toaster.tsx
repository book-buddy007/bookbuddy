"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { Icon } from "@/components/ui/icon"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const bad = props.variant === "destructive"
        return (
          <Toast key={id} {...props}>
            <span
              aria-hidden
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${bad ? "bg-[rgba(255,84,104,.18)]" : "bg-[rgba(61,220,132,.16)]"}`}
            >
              <Icon name={bad ? "alert" : "check-circle"} size={18} />
            </span>
            <div className="grid flex-1 gap-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
