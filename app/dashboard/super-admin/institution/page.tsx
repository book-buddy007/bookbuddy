"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable, type DataColumn } from "@/components/ui/data-table"
import { Icon } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { SearchInput } from "@/components/ui/search-input"
import { StatusBadge } from "@/components/ui/status-badge"
import { toast } from "@/hooks/use-toast"
import { getInstitutions, createInstitution, updateInstitution, deleteInstitution } from "@/lib/api/adminApi"
import { Institution } from "@/types/admin"
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
      <div role="status" className="flex h-[50vh] flex-col items-center justify-center gap-3 text-bb-muted">
        <Icon name="loader" size={32} className="animate-spin" />
        <span className="text-sm">Loading institutions…</span>
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

  const columns: DataColumn<any>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (inst) => (
        <button
          type="button"
          onClick={() => setSelectedInstitution(inst)}
          className="flex items-center gap-3 text-left font-semibold hover:text-bb-accent-ink focus-visible:outline-none focus-visible:shadow-focus"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-bb-accent-soft text-sm font-bold text-bb-accent-ink">
            {inst.name.charAt(0)}
          </span>
          {inst.name}
        </button>
      ),
    },
    { key: 'domain', header: 'Domain', cell: (inst) => inst.domain, className: 'text-bb-muted' },
    {
      key: 'joined',
      header: 'Joined',
      cell: (inst) => new Date(inst.createdAt).toLocaleDateString(),
      className: 'whitespace-nowrap text-bb-muted',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (inst) =>
        inst.isActive !== false ? <StatusBadge status="returned" label="Active" /> : <StatusBadge status="overdue" label="Suspended" />,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'w-12 text-right',
      cell: (inst) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${inst.name}`}>
              <Icon name="more-v" size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[190px]">
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => setSelectedInstitution(inst), 100); }}>
              <Icon name="eye" size={16} className="mr-2" /> View profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => setEditingInstitution(inst), 100); }}>
              <Icon name="edit" size={16} className="mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-bb-danger-ink" onSelect={(e) => { e.preventDefault(); setTimeout(() => setDeleteTarget(inst), 100); }}>
              <Icon name="trash" size={16} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Partner network"
        title="Institution directory"
        description="Manage partner schools, libraries, and organizations."
        actions={
          <Button size="lg" onClick={() => setIsAddOpen(true)}>
            <Icon name="plus" size={18} /> Add institution
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard variant="featured" title="Total registered" value={institutions.length} icon="institution" loading={isLoading} />
        <StatCard title="Active instances" value={activeCount} icon="globe" loading={isLoading} />
        <StatCard title="New (last 30 days)" value={recentCount} icon="user-plus" loading={isLoading} />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput
            wrapperClassName="flex-1"
            placeholder="Search institutions by name or domain"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outline" size="icon-md" onClick={() => loadInstitutions()} title="Refresh data" aria-label="Refresh data" className="shrink-0">
            <Icon name="rotate-cw" size={18} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>

        <DataTable
          columns={columns}
          rows={filteredInstitutions}
          rowKey={(inst: any) => inst.id}
          emptyIcon={search ? 'search' : 'institution'}
          emptyTitle={search ? 'No institutions found' : 'No institutions yet'}
          emptyDescription={search ? 'No institutions match your search.' : 'Add one to get started.'}
          emptyAction={
            search ? undefined : (
              <Button onClick={() => setIsAddOpen(true)}>
                <Icon name="plus" size={18} /> Add institution
              </Button>
            )
          }
        />
      </section>

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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete institution?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-semibold text-bb-text">{deleteTarget?.name}</span> and
              deactivate it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInstitution}
              disabled={isDeleting}
              className="bg-bb-danger text-white hover:brightness-95"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
