import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { InstitutionForm, InstitutionFormValues } from "@/components/institution-form"
import { Building2 } from "@/components/ui/icons"

interface AddInstitutionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: InstitutionFormValues) => Promise<void>
  isLoading?: boolean
  title?: string
  description?: string
  defaultValues?: Partial<InstitutionFormValues>
}

export function AddInstitutionSheet({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  title = "Add New Institution",
  description = "Register a new school or library network node. Fill in the details below to create their profile and administrative account.",
  defaultValues
}: AddInstitutionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-white dark:bg-bb-bg border-l border-slate-200/60 dark:border-slate-700/40" side="right">
        <SheetHeader className="pb-6 border-b border-slate-200/60 dark:border-slate-700/40 mb-6">
          <SheetTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
            <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--deep-saffron)]/15 to-[var(--saffron)]/10 text-[var(--deep-saffron)]">
              <Building2 className="h-5 w-5" />
            </div>
            {title}
          </SheetTitle>
          <SheetDescription className="text-slate-500 dark:text-slate-400">
            {description}
          </SheetDescription>
        </SheetHeader>
        
        <div className="pb-10">
          <InstitutionForm 
            defaultValues={defaultValues}
            onSubmit={async (data) => {
              await onSubmit(data)
              onOpenChange(false)
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
