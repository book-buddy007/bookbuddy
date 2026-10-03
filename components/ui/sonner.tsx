"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-[18px] group-[.toaster]:border-white/10 group-[.toaster]:bg-[var(--bb-glass-dark)] group-[.toaster]:text-[#F2F4F8] group-[.toaster]:shadow-[0_24px_40px_-20px_rgba(10,15,36,.8)] group-[.toaster]:backdrop-blur-xl",
          description: "group-[.toast]:text-[#A9B4D0]",
          actionButton:
            "group-[.toast]:bg-transparent group-[.toast]:font-bold group-[.toast]:text-[#FF8A3D]",
          cancelButton:
            "group-[.toast]:bg-white/10 group-[.toast]:text-[#F2F4F8]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
