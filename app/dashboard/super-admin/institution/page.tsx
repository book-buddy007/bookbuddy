"use client"

import { useState, useEffect } from "react"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { StatPill } from "@/components/ui/stat-pill"
import { Building2, Plus, Search, RefreshCw, MoreVertical, Eye, Globe, Pencil, Trash2, Users } from "@/components/ui/icons"
import { toast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-state"
import { getInstitutions, createInstitution, updateInstitution, deleteInstitution } from "@/lib/api/adminApi"
import { Institution } from "@/types/admin"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { AddInstitutionSheet } from "./components/AddInstitutionSheet"
import { InstitutionDetailSheet } from "./components/InstitutionDetailSheet"
import { InstitutionFormValues } from "@/components/institution-form"

export default function InstitutionPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [filteredInstitutions, setFilteredInstitutions] = useState<Institution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Sheet states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null)

  // Edit state
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Institution | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadInstitutions = async () => {
    setIsLoading(true)
    try {
      const res = await getInstitutions()
      if (res.success && res.data) {
        setInstitutions(res.data)
        setFilteredInstitutions(res.data)
      } else {
        toast({
          title: "Error Loading Data",
          description: res.error || "Failed to fetch institutions",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInstitutions()
  }, [])

  useEffect(() => {
    if (!search) {
      setFilteredInstitutions(institutions)
    } else {
      const lower = search.toLowerCase()
      setFilteredInstitutions(institutions.filter(inst => 
        inst.name.toLowerCase().includes(lower) || 
        inst.domain.toLowerCase().includes(lower)
      ))
    }
  }, [search, institutions])

  const handleCreateInstitution = async (data: InstitutionFormValues) => {
    try {
      const response = await createInstitution({
        name: data.schoolName,
        domain: data.website || `${data.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu`,
        adminEmail: data.principal?.email || "",
        adminName: data.principal?.name || "",
        branding: {
          metadata: JSON.stringify({
            establishedYear: data.establishedYear,
            recognitionNumber: data.recognitionNumber,
            principal: data.principal,
            librarian: data.librarian,
            headquarters: data.headquarters,
            contactNumbers: data.contactNumbers,
            branches: data.branches,
            website: data.website
          })
        }
      })
      if (response.success) {
        toast({ title: "Success", description: "Institution registered successfully" })
        loadInstitutions()
      } else {
        toast({ title: "Draft Failed", description: response.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not add institution", variant: "destructive" })
    }
  }

  const handleEditInstitution = async (data: InstitutionFormValues) => {
    if (!editingInstitution) return
    try {
      const response = await updateInstitution(editingInstitution.id, {
        name: data.schoolName,
        domain: data.website || editingInstitution.domain,
        description: data.headquarters?.address || editingInstitution.description,
        location: data.headquarters?.city || editingInstitution.location,
        branding: {
          ...editingInstitution.branding,
          metadata: JSON.stringify({
            establishedYear: data.establishedYear,
            recognitionNumber: data.recognitionNumber,
            principal: data.principal,
            librarian: data.librarian,
            headquarters: data.headquarters,
            contactNumbers: data.contactNumbers,
            branches: data.branches,
            website: data.website
          })
        }
      })
      if (response.success) {
        toast({ title: "Success", description: "Institution updated successfully" })
        setEditingInstitution(null)
        loadInstitutions()
      } else {
        toast({ title: "Update Failed", description: response.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not update institution", variant: "destructive" })
    }
  }

  const handleDeleteInstitution = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const response = await deleteInstitution(deleteTarget.id)
      if (response.success) {
        toast({ title: "Deleted", description: `"${deleteTarget.name}" has been removed.` })
        setDeleteTarget(null)
        loadInstitutions()
      } else {
        toast({ title: "Delete Failed", description: response.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not delete institution", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading && institutions.length === 0) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner size="large" text="Connecting to global databases..." />
      </div>
    )
  }

  const activeCount = institutions.filter((i: any) => i.isActive !== false).length
  const recentCount = institutions.filter(i => {
    const d = new Date(i.createdAt)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return d >= thirtyDaysAgo
  }).length

  // Helper to extract default values from metadata
  const getEditDefaultValues = (institution: Institution | null): Partial<InstitutionFormValues> | undefined => {
    if (!institution) return undefined;
    
    let meta: any = {};
    if (institution.branding?.metadata) {
      try {
        meta = JSON.parse(institution.branding.metadata as string);
      } catch (e) {
        // ignore parsing errors
      }
    }

    return {
      schoolName: institution.name,
      website: institution.domain,
      headquarters: meta.headquarters || { address: '', city: '', state: '', pinCode: '', coordinates: { lat: 20.5937, lng: 78.9629 } },
      establishedYear: meta.establishedYear ? Number(meta.establishedYear) : new Date().getFullYear(),
      recognitionNumber: meta.recognitionNumber || '',
      principal: meta.principal || { name: '', email: '', mobile: '' },
      librarian: meta.librarian || { name: '', contact: '' },
      contactNumbers: meta.contactNumbers || [''],
      branches: meta.branches || [],
    };
  };

  return (
    <div className="space-y-6 animate-vg-fade-in-up">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-10 shadow-2xl mb-8 border border-white/10" style={{background: 'linear-gradient(135deg, var(--night-ink) 0%, var(--indigo-deep) 30%, var(--peacock-teal) 60%, var(--deep-saffron) 100%)'}}>
        <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")'}} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--deep-saffron)]/[0.15] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-[var(--deep-saffron)] mr-2 animate-pulse"></span>
              Partner Network
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm font-display">
               Institution Directory
            </h1>
            <p className="text-indigo-100/90 text-lg max-w-xl font-medium">
               Manage partner schools, libraries, and organizations.
            </p>
          </div>
          
          <EnhancedButton 
            size="lg"
            className="shrink-0 bg-gradient-to-r from-[var(--deep-saffron)] to-[#FFAE42] hover:from-[#E68A2E] hover:to-[#FF9933] text-black shadow-lg shadow-[var(--deep-saffron)]/20 border-transparent font-bold !px-6"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Institution
          </EnhancedButton>
        </div>
      </div>

      {/* Stat Pills */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatPill
          label="Total Registered"
          value={institutions.length.toString()}
          icon={<Building2 className="h-5 w-5" />}
          accent="teal"
          isLoading={isLoading}
        />
        <StatPill
          label="Active Instances"
          value={activeCount.toString()}
          icon={<Globe className="h-5 w-5" />}
          accent="saffron"
          isLoading={isLoading}
          delayMs={100}
        />
        <StatPill
          label="New (Last 30 days)"
          value={recentCount.toString()}
          icon={<Users className="h-5 w-5" />}
          accent="gold"
          isLoading={isLoading}
          delayMs={200}
        />
      </div>

      {/* Search & Refresh Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white/70 dark:bg-[#0A0F1E]/70 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 shadow-sm backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search institutions by name or domain..."
            className="pl-10 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl h-10 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--deep-saffron)]/40 focus:border-[var(--deep-saffron)]/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <EnhancedButton
          variant="outline"
          size="icon"
          onClick={() => loadInstitutions()}
          title="Refresh data"
          className="rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 h-10 w-10"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </EnhancedButton>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-[#0A0F1E]/70 shadow-sm overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-700/40">
              <TableRow>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Name</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Domain</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Joined</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstitutions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-400 dark:text-slate-500">
                    {search ? "No institutions found matching your search." : "No institutions available. Add one to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInstitutions.map((inst: any) => (
                  <TableRow key={inst.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                    <TableCell className="font-medium cursor-pointer text-slate-900 dark:text-white" onClick={() => setSelectedInstitution(inst)}>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--deep-saffron)]/20 to-[var(--saffron)]/10 flex items-center justify-center text-[var(--deep-saffron)] font-bold text-sm ring-1 ring-[var(--deep-saffron)]/20">
                          {inst.name.charAt(0)}
                        </div>
                        <span className="hover:text-[var(--deep-saffron)] transition-colors">{inst.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">{inst.domain}</TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(inst.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={inst.isActive !== false ? "default" : "secondary"} 
                        className={inst.isActive !== false 
                          ? "bg-[var(--peacock-teal)]/15 text-[var(--peacock-teal)] dark:bg-[var(--peacock-teal)]/20 dark:text-emerald-300 border border-[var(--peacock-teal)]/20 font-semibold" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold"}
                      >
                        {inst.isActive !== false ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <EnhancedButton variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-400 hover:text-[var(--deep-saffron)] hover:border-[var(--deep-saffron)]/30">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </EnhancedButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px] p-2 rounded-xl shadow-lg border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-[#0F172A]">
                          <DropdownMenuItem className="cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium py-2 px-3 flex items-center gap-2" onSelect={(e) => { e.preventDefault(); setTimeout(() => setSelectedInstitution(inst), 100); }}>
                            <Eye className="h-4 w-4 text-[var(--peacock-teal)]" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium py-2 px-3 flex items-center gap-2" onSelect={(e) => { e.preventDefault(); setTimeout(() => setEditingInstitution(inst), 100); }}>
                            <Pencil className="h-4 w-4 text-[var(--deep-saffron)]" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                          <DropdownMenuItem className="cursor-pointer rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium py-2 px-3 flex items-center gap-2" onSelect={(e) => { e.preventDefault(); setTimeout(() => setDeleteTarget(inst), 100); }}>
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Institution Sheet */}
      <AddInstitutionSheet 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        onSubmit={handleCreateInstitution} 
      />

      {/* Edit Institution Sheet (re-uses AddInstitutionSheet) */}
      <AddInstitutionSheet
        open={editingInstitution !== null}
        onOpenChange={(open) => !open && setEditingInstitution(null)}
        onSubmit={handleEditInstitution}
        defaultValues={getEditDefaultValues(editingInstitution)}
        title="Edit Institution"
        description="Update the institution's details below."
      />

      {/* View Institution Detail Sheet */}
      <InstitutionDetailSheet 
        open={selectedInstitution !== null} 
        onOpenChange={(open) => !open && setSelectedInstitution(null)} 
        institution={selectedInstitution} 
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-[#0F172A]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>Delete Institution?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              This will permanently remove <span className="font-semibold text-slate-700 dark:text-slate-300">{deleteTarget?.name}</span> and 
              deactivate it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-slate-200 dark:border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteInstitution} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}