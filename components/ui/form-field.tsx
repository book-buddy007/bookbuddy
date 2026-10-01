import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  htmlFor?: string
  /** Helper text under the control. */
  hint?: string
  /** Error text (13px, danger). Also pass aria-invalid to the control to tint its border. */
  error?: string
}

/** Label (13/600) + control + helper/error. One column on phone; callers grid it 2-up on desktop. */
export function FormField({ label, htmlFor, hint, error, className, children, ...props }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-[13px] text-bb-danger-ink">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-bb-muted">{hint}</p>
      ) : null}
    </div>
  )
}
