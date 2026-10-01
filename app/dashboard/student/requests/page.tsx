"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { EmptyState } from "@/components/ui/empty-state"
import { Icon, type BBIconName } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/ui/stat-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

interface JoinRequest {
  id: string;
  tenantId: string;
  requestedRole: string;
  message: string | null;
  proofDocument: string | null;
  /* Prisma enum NAMES, which is what the API sends. The previous mixed-case
     union ('PENDING' | 'approved' | 'rejected') matched nothing the server
     actually returns and made tsc flag the three correct comparisons below
     while missing the badge switch, which was the real bug. */
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

export default function StudentRequestsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [requestToCancel, setRequestToCancel] = useState<JoinRequest | null>(null);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      // Identity comes from the session — no userId in the URL.
      const response = await fetch('/api/join-requests/user');

      if (!response.ok) {
        throw new Error('Failed to fetch join requests');
      }

      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching join requests:', error);
      toast({
        title: "Error",
        description: "Failed to load join requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async (request: JoinRequest) => {
    if (!user) return;

    try {
      setCancelingId(request.id);
      const response = await fetch(
        `/api/join-requests/${request.id}/cancel`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel request');
      }

      toast({
        title: "Request Cancelled",
        description: `Your request to join ${request.tenant.name} has been cancelled.`,
      });

      // Refresh the list
      fetchRequests();
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelingId(null);
      setRequestToCancel(null);
    }
  };

  /* The API sends Prisma ENUM NAMES — PENDING / APPROVED / REJECTED. The
     @map("pending") directives in the schema set the *database* value, not the
     JavaScript one. Normalised rather than re-cased so a stray lowercase value
     from anywhere still renders. */
  const getStatusBadge = (rawStatus: string) => {
    const status = String(rawStatus ?? '').toLowerCase();
    switch (status) {
      case 'pending':
        return <StatusBadge status="pending" />;
      case 'approved':
        return <StatusBadge status="returned" label="Approved" />;
      case 'rejected':
        return <StatusBadge status="overdue" label="Rejected" />;
      default:
        return <Chip>{status}</Chip>;
    }
  };

  const getInstitutionIcon = (type: string): BBIconName => {
    switch (type) {
      case 'school':
      case 'college':
      case 'university':
        return 'class';
      default:
        return 'institution';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      school: 'School',
      college: 'College',
      university: 'University',
      corporate: 'Corporate',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate statistics
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  };

  // Check if user is independent student
  const isIndependentStudent = user?.accountType === 'INDEPENDENT' || user?.role === 'STUDENT'; // Fallback for UI testing

  if (!isIndependentStudent) {
    return (
      <EmptyState
        className="min-h-[400px]"
        icon="institution"
        title="Institution access"
        description="This feature is only available for independent students. Institutional users are already part of an organization."
        action={<Button size="lg" onClick={() => router.push('/dashboard/student')}>Back to dashboard</Button>}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Student"
        title="Institution access requests"
        description="Track your requests to join institutional libraries."
        actions={
          <Button size="lg" onClick={() => router.push('/institutions/browse')}>
            <Icon name="plus" size={18} /> New request
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard variant="featured" title="Total requests" value={stats.total} icon="send" loading={isLoading} />
        <StatCard title="Pending" value={stats.pending} icon="calendar" loading={isLoading} />
        <StatCard title="Approved" value={stats.approved} icon="check-circle" loading={isLoading} />
        <StatCard title="Rejected" value={stats.rejected} icon="x-circle" loading={isLoading} />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-[22px]" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon="send"
          title="No requests yet"
          description="You haven't submitted any requests to join institutional libraries. Browse available institutions to get started."
          action={
            <Button size="lg" onClick={() => router.push('/institutions/browse')}>
              <Icon name="institution" size={18} /> Browse institutions
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <article key={request.id} className="rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row">
                <Avatar className="h-16 w-16 shrink-0 shadow-e1">
                  {request.tenant.logoUrl ? (
                    <AvatarImage src={request.tenant.logoUrl} alt={request.tenant.name} />
                  ) : (
                    <AvatarFallback className="bg-bb-navy text-white">
                      <Icon name={getInstitutionIcon(request.tenant.type)} size={28} />
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-extrabold tracking-[-0.02em]">{request.tenant.name}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Chip>{getTypeLabel(request.tenant.type)}</Chip>
                        {getStatusBadge(request.status)}
                      </div>
                    </div>

                    {request.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setRequestToCancel(request)}
                        disabled={cancelingId === request.id}
                      >
                        {cancelingId === request.id ? (
                          <>
                            <Icon name="loader" size={16} className="animate-spin" /> Cancelling…
                          </>
                        ) : (
                          <>
                            <Icon name="trash" size={16} /> Cancel request
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {request.tenant.location && (
                    <p className="flex items-center gap-2 text-sm text-bb-muted">
                      <Icon name="map-pin" size={16} /> {request.tenant.location}
                    </p>
                  )}

                  {request.message && (
                    <div className="rounded-xl bg-bb-surface-2 px-4 py-3">
                      <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-bb-muted">Your message</p>
                      <p className="text-sm">{request.message}</p>
                    </div>
                  )}

                  {request.status === 'REJECTED' && request.rejectionReason && (
                    <div role="alert" className="flex items-start gap-3 rounded-xl bg-bb-danger-soft px-4 py-3 text-bb-danger-ink">
                      <Icon name="alert-circle" size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Rejection reason</p>
                        <p className="mt-0.5 text-sm">{request.rejectionReason}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-bb-muted">
                    <span className="inline-flex items-center gap-2">
                      <Icon name="calendar" size={16} /> Submitted {formatDate(request.createdAt)}
                    </span>
                    {request.reviewedAt && (
                      <span className="inline-flex items-center gap-2">
                        <Icon name="check-circle" size={16} /> Reviewed {formatDate(request.reviewedAt)}
                      </span>
                    )}
                    {request.proofDocument && (
                      <span className="inline-flex items-center gap-2 font-semibold text-bb-accent-ink">
                        <Icon name="pdf" size={16} /> Document attached
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <AlertDialog open={!!requestToCancel} onOpenChange={(open) => !open && setRequestToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your request to join{" "}
              <span className="font-semibold text-bb-text">{requestToCancel?.tenant.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Wait, keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => requestToCancel && handleCancelRequest(requestToCancel)}
              className="bg-bb-danger text-white hover:brightness-95"
            >
              Yes, cancel request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
