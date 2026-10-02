"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface JoinRequest {
  id: string;
  userId: string;
  tenantId: string;
  requestedRole: string;
  message: string | null;
  proofDocument: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    accountType: string;
  };
}

export default function AdminJoinRequestsPage() {
  const router = useRouter();
  const { user, currentTenantId } = useAuthStore();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  /* Proof documents are private; the backend hands out a five-minute link per view.
     The tab is opened before the request so popup blockers treat it as a click. */
  const openProofDocument = async (requestId: string) => {
    const win = window.open("", "_blank");
    try {
      const res = await fetch(`/api/join-requests/${encodeURIComponent(requestId)}/proof-url`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.message || data?.error || "Couldn't open the document");
      if (win) {
        win.opener = null;
        win.location.href = data.url;
      } else {
        window.location.href = data.url;
      }
    } catch (err: any) {
      win?.close();
      toast({ title: "Couldn't open the document", description: err?.message, variant: "destructive" });
    }
  };

  // Fetch join requests for the institution
  const fetchRequests = async () => {
    if (!currentTenantId) return;

    try {
      setLoading(true);
      // Routed through the Next proxy rather than a hardcoded localhost origin:
      // the direct call could never have worked outside a dev machine, and the
      // proxy is what attaches the session the backend now requires.
      const response = await fetch(
        `/api/join-requests/tenant/${currentTenantId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch join requests");
      }

      const data = await response.json();
      setRequests(data);
      setFilteredRequests(data);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "Failed to load join requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentTenantId]);

  // Filter requests based on status
  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(
        requests.filter((req) => req.status === statusFilter)
      );
    }
  }, [statusFilter, requests]);

  // Calculate statistics
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "PENDING").length,
    approved: requests.filter((r) => r.status === "APPROVED").length,
    rejected: requests.filter((r) => r.status === "REJECTED").length,
  };

  // Handle approve request
  const handleApprove = async () => {
    if (!selectedRequest || !user?.id) return;

    try {
      setProcessing(true);
      // The reviewer is taken from the session server-side, so no reviewerId.
      const response = await fetch(
        `/api/join-requests/${selectedRequest.id}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to approve request");
      }

      toast({
        title: "Success",
        description: "Join request approved successfully!",
      });

      setShowApproveDialog(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject request
  const handleReject = async () => {
    if (!selectedRequest || !user?.id) return;

    try {
      setProcessing(true);
      const response = await fetch(
        `/api/join-requests/${selectedRequest.id}/reject`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rejectionReason: rejectionReason || "Request rejected by administrator",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reject request");
      }

      toast({
        title: "Success",
        description: "Join request rejected.",
      });

      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <StatusBadge status="pending" />;
      case "APPROVED":
        return <StatusBadge status="returned" label="Approved" />;
      case "REJECTED":
        return <StatusBadge status="overdue" label="Rejected" />;
      default:
        return <Chip>{status}</Chip>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if user is admin or librarian
  const isAdminOrLibrarian =
    user?.role === "ADMIN" || user?.role === "LIBRARIAN";

  if (!isAdminOrLibrarian) {
    return (
      <EmptyState
        className="mx-auto mt-8 max-w-xl"
        icon="lock"
        title="Access denied"
        description="This page is only accessible to administrators and librarians."
        action={<Button onClick={() => router.push("/dashboard/admin")}>Back to dashboard</Button>}
      />
    );
  }

  const requesterSummary = (r: JoinRequest) => (
    <div className="flex items-center gap-3 rounded-xl bg-bb-surface-2 p-3">
      <Avatar>
        <AvatarFallback className="bg-bb-navy text-white">{r.user.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-semibold">{r.user.name}</p>
        <p className="truncate text-sm text-bb-muted">{r.user.email}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Admin"
        title="Join requests"
        description="Review and manage student access requests to your institution."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard variant="featured" title="Total requests" value={stats.total} description="All time requests" icon="send" loading={loading} />
        <StatCard title="Pending" value={stats.pending} description="Awaiting review" icon="calendar" loading={loading} />
        <StatCard title="Approved" value={stats.approved} description="Accepted requests" icon="check-circle" loading={loading} />
        <StatCard title="Rejected" value={stats.rejected} description="Declined requests" icon="x-circle" loading={loading} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Requests</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by status">
            <SelectValue placeholder="All requests" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All requests</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-[22px]" />
          ))}
        </div>
      )}

      {!loading && filteredRequests.length === 0 && (
        <EmptyState
          icon="user-check"
          title="No requests found"
          description={
            statusFilter === "all"
              ? "No join requests have been submitted yet."
              : `No ${statusFilter.toLowerCase()} requests found.`
          }
        />
      )}

      {!loading && filteredRequests.length > 0 && (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <article key={request.id} className="rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src="" alt={request.user.name} />
                    <AvatarFallback className="bg-bb-navy text-white">
                      {request.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{request.user.name}</h3>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-bb-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="mail" size={16} /> {request.user.email}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="calendar" size={16} /> {formatDate(request.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">Requested role</span>
                      <Chip>{request.requestedRole}</Chip>
                    </div>

                    {request.message && (
                      <div className="rounded-xl bg-bb-surface-2 px-4 py-3">
                        <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-bb-muted">Message</p>
                        <p className="text-sm">{request.message}</p>
                      </div>
                    )}

                    {request.proofDocument && (
                      request.proofDocument.startsWith("join-proofs/") ? (
                        <button
                          type="button"
                          onClick={() => openProofDocument(request.id)}
                          className="inline-flex items-center gap-2 rounded text-sm font-semibold text-bb-accent-ink hover:underline focus-visible:outline-none focus-visible:shadow-focus"
                        >
                          <Icon name="pdf" size={16} /> View proof document
                        </button>
                      ) : (
                        <p className="text-sm text-bb-muted">
                          A document was mentioned, but it was sent before uploads were supported and can&apos;t be opened.
                        </p>
                      )
                    )}

                    {request.status === "REJECTED" && request.rejectionReason && (
                      <div role="alert" className="rounded-xl bg-bb-danger-soft px-4 py-3 text-bb-danger-ink">
                        <p className="text-sm font-semibold">Rejection reason</p>
                        <p className="mt-0.5 text-sm">{request.rejectionReason}</p>
                      </div>
                    )}

                    {request.reviewedAt && (
                      <p className="text-xs text-bb-muted">Reviewed on {formatDate(request.reviewedAt)}</p>
                    )}
                  </div>
                </div>

                {request.status === "PENDING" && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowApproveDialog(true);
                      }}
                    >
                      <Icon name="user-check" size={16} /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectDialog(true);
                      }}
                    >
                      <Icon name="x-circle" size={16} /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Approve dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve join request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this request? The user will be granted access to your institution as a{" "}
              <strong>{selectedRequest?.requestedRole}</strong>.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && requesterSummary(selectedRequest)}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? (
                <>
                  <Icon name="loader" size={16} className="animate-spin" /> Approving…
                </>
              ) : (
                <>
                  <Icon name="user-check" size={16} /> Approve request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject join request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. The user will be notified.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {requesterSummary(selectedRequest)}
              <FormField label="Rejection reason (optional)" htmlFor="rejection-reason">
                <Textarea
                  id="rejection-reason"
                  placeholder="e.g., Insufficient documentation, does not meet requirements"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </FormField>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? (
                <>
                  <Icon name="loader" size={16} className="animate-spin" /> Rejecting…
                </>
              ) : (
                <>
                  <Icon name="x-circle" size={16} /> Reject request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
