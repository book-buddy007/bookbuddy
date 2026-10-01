import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Institution } from "@/types/admin"
import { StatCard } from "@/components/ui/stat-card"
import { Building2, Users, User, BookOpen, MapPin, Phone, Globe, ShieldCheck } from "@/components/ui/icons"
import { Badge } from "@/components/ui/badge"

interface InstitutionDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  institution: Institution | null
}

export function InstitutionDetailSheet({
  open,
  onOpenChange,
  institution,
}: InstitutionDetailSheetProps) {
  if (!institution) return null

  // Parse metadata if it exists
  let meta: any = {}
  try {
    if ((institution as any).metadata) {
      meta = typeof (institution as any).metadata === 'string' 
        ? JSON.parse((institution as any).metadata) 
        : (institution as any).metadata
    }
  } catch (e) {
    console.error("Failed to parse metadata", e)
  }

  const establishedYear = meta.establishedYear || "N/A"
  const recognitionNumber = meta.recognitionNumber || "N/A"
  const principal = meta.principal || {}
  const librarian = meta.librarian || {}
  const contactNumbers = meta.contactNumbers || []
  const branches = meta.branches || []
  const website = meta.website || institution.domain || ""

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl md:max-w-3xl overflow-y-auto bg-white dark:bg-bb-bg border-l border-slate-200/60 dark:border-slate-700/40" side="right">
        <SheetHeader className="pb-6 border-b border-slate-200/60 dark:border-slate-700/40 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <SheetTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                <div className="p-2 rounded-xl bg-bb-accent-soft text-bb-accent-ink">
                  <Building2 className="h-5 w-5" />
                </div>
                {institution.name}
              </SheetTitle>
              <SheetDescription className="mt-1.5 text-slate-500 dark:text-slate-400">
                Joined on {new Date(institution.createdAt).toLocaleDateString()}
              </SheetDescription>
            </div>
            <Badge 
              variant={(institution as any).isActive !== false ? "default" : "secondary"}
              className={(institution as any).isActive !== false 
                ? "bg-bb-accent-soft text-bb-accent-ink  dark:text-emerald-300 border border-bb-accent/20 font-semibold" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold"}
            >
              {(institution as any).isActive !== false ? "Active Tenant" : "Suspended"}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard variant="featured" title="Established" value={establishedYear.toString()} icon="institution" />
            <StatCard title="Branches" value={branches.length} icon="map-pin" />
            <StatCard
              title="Total students"
              value={branches.reduce((sum: number, b: any) => sum + (Number(b.studentStrength) || 0), 0)}
              icon="profile"
            />
          </div>

          {/* Administration & Contact Card */}
          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-bb-bg/70 backdrop-blur-md shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <ShieldCheck className="h-5 w-5 text-bb-accent-ink" /> 
                Administration & Contact
              </h3>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-white/30 mb-3">Key Officials</h4>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/30">
                        <div className="p-1.5 rounded-lg bg-bb-accent-soft text-bb-accent-ink mt-0.5">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {principal.name || "Not specified"} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">(Principal)</span>
                          </p>
                          {(principal.email || principal.mobile) && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {principal.email} {principal.email && principal.mobile && '•'} {principal.mobile}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/30">
                        <div className="p-1.5 rounded-lg bg-bb-accent-soft text-bb-accent-ink mt-0.5">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {librarian.name || "Not specified"} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">(Head Librarian)</span>
                          </p>
                          {librarian.contact && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{librarian.contact}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-white/30 mb-3">Contact Info</h4>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/30">
                        <div className="p-1.5 rounded-lg bg-bb-accent-soft text-bb-accent-ink mt-0.5">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Website & Domain</p>
                          <p className="text-xs text-bb-accent-ink truncate max-w-[200px] mt-0.5">
                            {website || "No website"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/30">
                        <div className="p-1.5 rounded-lg bg-[var(--gold)]/10 text-bb-accent-ink mt-0.5">
                          <Phone className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Contact Numbers</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {contactNumbers.length > 0 ? contactNumbers.join(", ") : "None provided"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {branches.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <MapPin className="h-4 w-4 text-bb-accent-ink" /> Library Branches
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {branches.map((branch: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-slate-800/40 shadow-sm backdrop-blur-sm hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-sm text-bb-accent-ink flex items-center gap-2 mb-2">
                       <MapPin className="h-4 w-4" /> {branch.name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{branch.address}</p>
                    <div className="flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                       <span className="flex justify-between">
                         <span>In-Charge:</span>
                         <span className="font-medium text-slate-700 dark:text-slate-300">{branch.inCharge}</span>
                       </span>
                       <span className="flex justify-between">
                         <span>Capacity:</span>
                         <span className="font-medium text-slate-700 dark:text-slate-300">{branch.studentStrength} students</span>
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
