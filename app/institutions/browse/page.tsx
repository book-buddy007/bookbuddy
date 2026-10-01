"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { SearchInput } from "@/components/ui/search-input"
import { Segmented } from "@/components/ui/segmented"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthStore } from "@/store/useAuthStore"
import { toast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Institution {
  id: string;
  name: string;
  domain: string;
  type: string;
  description: string | null;
  location: string | null;
  logoUrl: string | null;
  subscriptionTier: string | null;
  memberCount: number;
  bookCount: number;
  allowStudentSignup: boolean;
  requireApproval: boolean;
}

interface JoinRequest {
  id: string;
  tenantId: string;
  requestedRole: string;
  message: string | null;
  proofDocument: string | null;
  // Prisma enum NAMES — what the API actually sends. @map() in the schema
  // sets the database value, not the JavaScript one.
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  tenant: {
    id: string;
    name: string;
    type: string;
    location: string | null;
    logoUrl: string | null;
  };
}

type Tab = "browse" | "requests"

// Types arrive as enum names (SCHOOL, COLLEGE…); compare case-insensitively.
const TYPE_LABELS: Record<string, string> = {
  school: 'School',
  college: 'College',
  university: 'University',
  corporate: 'Corporate',
};
const typeLabel = (type: string) => TYPE_LABELS[String(type ?? '').toLowerCase()] ?? type;

const STATUS_LABEL: Record<JoinRequest['status'], string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function Logo({ name, logoUrl, size = 56 }: { name: string; logoUrl: string | null; size?: number }) {
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" width={size} height={size} className="shrink-0 rounded-bb-md bg-bb-surface-2 object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-bb-md bg-bb-navy font-display text-lg font-extrabold text-white"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-bb-lg bg-bb-surface p-6 shadow-e1">
      <div className="flex gap-4">
        <div className="h-14 w-14 rounded-bb-md bg-bb-surface-2" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-5 w-2/3 rounded-full bg-bb-surface-2" />
          <div className="h-4 w-1/3 rounded-full bg-bb-surface-2" />
        </div>
      </div>
      <div className="mt-6 h-4 w-full rounded-full bg-bb-surface-2" />
      <div className="mt-2 h-4 w-3/4 rounded-full bg-bb-surface-2" />
      <div className="mt-6 h-11 rounded-full bg-bb-surface-2" />
    </div>
  )
}

export default function BrowseInstitutionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  // Browse state
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  // My requests state
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [requestToCancel, setRequestToCancel] = useState<JoinRequest | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(searchParams.get('tab') === 'requests' ? 'requests' : 'browse');

  useEffect(() => {
    fetchInstitutions();
  }, []);

  useEffect(() => {
    if (activeTab === "requests" && user) {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, typeFilter, locationFilter, institutions]);

  const fetchInstitutions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/institutions/browse');
      if (!response.ok) throw new Error('Failed to fetch institutions');

      const data = await response.json();
      setInstitutions(data);
      setFilteredInstitutions(data);
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast({
        title: "Couldn't load institutions",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...institutions];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inst) =>
          inst.name.toLowerCase().includes(query) ||
          inst.description?.toLowerCase().includes(query) ||
          inst.domain.toLowerCase().includes(query) ||
          inst.location?.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((inst) => String(inst.type).toUpperCase() === typeFilter);
    }

    if (locationFilter !== "all") {
      filtered = filtered.filter((inst) => inst.location === locationFilter);
    }

    setFilteredInstitutions(filtered);
  };

  const fetchRequests = async () => {
    if (!user) return;

    try {
      setRequestsLoading(true);
      const response = await fetch(`/api/join-requests/user?userId=${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch join requests');

      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching join requests:', error);
      toast({
        title: "Couldn't load your requests",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleCancelRequest = async (request: JoinRequest) => {
    if (!user) return;

    try {
      setCancelingId(request.id);
      const response = await fetch(`/api/join-requests/${request.id}/cancel?userId=${user.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to cancel request');

      toast({
        title: "Request cancelled",
        description: `Your request to join ${request.tenant.name} has been cancelled.`,
      });
      fetchRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Couldn't cancel the request",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelingId(null);
      setRequestToCancel(null);
    }
  };

  const handleRequestAccess = (institutionId: string) => {
    router.push(`/institutions/join-request?institutionId=${institutionId}`);
  };

  const uniqueLocations = Array.from(
    new Set(institutions.map((i) => i.location).filter((l): l is string => l !== null))
  ).sort();

  // Only independent students browse; institutional users already belong somewhere.
  const isIndependentStudent = user?.accountType === 'INDEPENDENT';

  if (!isIndependentStudent) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <EmptyState
          icon="institution"
          title="You're already part of an institution"
          description="Browsing and joining institutions is for independent students. Your library comes from your institution."
          action={
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const filtersActive = !!searchQuery || typeFilter !== "all" || locationFilter !== "all";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-10">
      <PageHeader
        eyebrow="Institutions"
        title="Find your library"
        description="Request access to your school, college or organisation's library."
        actions={
          <Segmented<Tab>
            value={activeTab}
            onValueChange={setActiveTab}
            options={[
              { value: "browse", label: "Browse" },
              { value: "requests", label: "My requests" },
            ]}
          />
        }
      />

      {activeTab === "browse" ? (
        <section className="space-y-6" aria-label="Browse institutions">
          <div className="flex flex-col gap-3 rounded-bb-lg bg-bb-surface p-4 shadow-e1 md:flex-row md:items-center">
            <SearchInput
              aria-label="Search institutions"
              placeholder="Search by name, domain or city…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              wrapperClassName="flex-1"
            />
            <div className="grid grid-cols-2 gap-3 md:flex">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger aria-label="Type" className="md:w-44">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="SCHOOL">Schools</SelectItem>
                  <SelectItem value="COLLEGE">Colleges</SelectItem>
                  <SelectItem value="UNIVERSITY">Universities</SelectItem>
                  <SelectItem value="CORPORATE">Corporate</SelectItem>
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger aria-label="Location" className="md:w-44">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {uniqueLocations.map((location) => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isLoading && (
            <p className="text-sm text-bb-muted" aria-live="polite">
              Showing {filteredInstitutions.length} of {institutions.length} institutions
            </p>
          )}

          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : filteredInstitutions.length === 0 ? (
            <EmptyState
              icon="search"
              title="No institutions found"
              description={filtersActive ? "Try a different search or clear the filters." : "No institutions are accepting requests right now."}
              action={
                filtersActive ? (
                  <Button variant="outline" onClick={() => { setSearchQuery(""); setTypeFilter("all"); setLocationFilter("all"); }}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredInstitutions.map((institution) => (
                <li key={institution.id} className="flex flex-col rounded-bb-lg bg-bb-surface p-6 shadow-e1">
                  <div className="flex items-start gap-4">
                    <Logo name={institution.name} logoUrl={institution.logoUrl} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-lg font-bold text-bb-text">{institution.name}</h2>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="rounded-lg bg-bb-info-soft px-2 py-0.5 text-xs font-semibold text-bb-info-ink">
                          {typeLabel(institution.type)}
                        </span>
                        {institution.subscriptionTier && (
                          <span className="rounded-lg bg-bb-accent-soft px-2 py-0.5 text-xs font-semibold capitalize text-bb-accent-ink">
                            {institution.subscriptionTier.toLowerCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {institution.description && (
                    <p className="mt-4 line-clamp-2 text-sm text-bb-muted">{institution.description}</p>
                  )}
                  {institution.location && (
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-bb-muted">
                      <Icon name="map-pin" size={16} fillLayer={false} />
                      <span className="truncate">{institution.location}</span>
                    </p>
                  )}

                  <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-bb-border pt-4">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-bb-faint">Members</dt>
                      <dd className="font-display text-xl font-bold text-bb-text">{institution.memberCount}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-bb-faint">Books</dt>
                      <dd className="font-display text-xl font-bold text-bb-text">{institution.bookCount}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto pt-5">
                    <Button className="w-full" onClick={() => handleRequestAccess(institution.id)}>
                      Request access
                      <Icon name="arrow-right" fillLayer={false} />
                    </Button>
                    {institution.requireApproval && (
                      <p className="mt-2 text-center text-xs text-bb-muted">An admin reviews each request.</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="space-y-4" aria-label="My join requests">
          {requestsLoading ? (
            <div className="space-y-4" aria-busy="true">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-bb-lg bg-bb-surface shadow-e1" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon="send"
              title="No join requests yet"
              description="Browse institutions and request access to get started."
              action={<Button onClick={() => setActiveTab("browse")}>Browse institutions</Button>}
            />
          ) : (
            <ul className="space-y-4">
              {requests.map((request) => (
                <li key={request.id} className="rounded-bb-lg bg-bb-surface p-6 shadow-e1">
                  <div className="flex flex-wrap items-start gap-4">
                    <Logo name={request.tenant.name} logoUrl={request.tenant.logoUrl} size={48} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-lg font-bold text-bb-text">{request.tenant.name}</h2>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-bb-muted">
                        <span>{typeLabel(request.tenant.type)}</span>
                        {request.tenant.location && (
                          <span className="inline-flex items-center gap-1">
                            <Icon name="map-pin" size={14} fillLayer={false} />
                            {request.tenant.location}
                          </span>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={request.status} label={STATUS_LABEL[request.status] ?? request.status} />
                  </div>

                  <dl className="mt-5 grid gap-4 rounded-bb-md bg-bb-surface-2 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-bb-faint">Requested role</dt>
                      <dd className="mt-1 font-semibold capitalize text-bb-text">{request.requestedRole.toLowerCase()}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-bb-faint">Submitted</dt>
                      <dd className="mt-1 font-semibold text-bb-text">{formatDate(request.createdAt)}</dd>
                    </div>
                    {request.message && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-bb-faint">Message</dt>
                        <dd className="mt-1 text-bb-text">{request.message}</dd>
                      </div>
                    )}
                    {request.status === 'REJECTED' && request.rejectionReason && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-bb-danger-ink">Reason</dt>
                        <dd className="mt-1 text-bb-danger-ink">{request.rejectionReason}</dd>
                      </div>
                    )}
                    {request.status === 'APPROVED' && request.reviewedAt && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-bb-success-ink">Approved</dt>
                        <dd className="mt-1 text-bb-success-ink">{formatDate(request.reviewedAt)}</dd>
                      </div>
                    )}
                  </dl>

                  {request.status === 'PENDING' && (
                    <div className="mt-4 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => setRequestToCancel(request)} disabled={cancelingId === request.id}>
                        {cancelingId === request.id && <Icon name="loader" fillLayer={false} className="animate-spin" />}
                        Cancel request
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <AlertDialog open={!!requestToCancel} onOpenChange={(open) => !open && setRequestToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this join request?</AlertDialogTitle>
            <AlertDialogDescription>
              Your request to join <span className="font-semibold">{requestToCancel?.tenant.name}</span> will be withdrawn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep request</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => requestToCancel && handleCancelRequest(requestToCancel)}
              className="bg-bb-danger text-white hover:brightness-95"
            >
              Cancel request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
