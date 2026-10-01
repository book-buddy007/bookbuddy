"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  EnhancedCard,
  EnhancedCardContent,
  EnhancedCardHeader,
  EnhancedCardTitle,
  EnhancedCardDescription,
} from "@/components/ui/enhanced-card";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { StatCard } from "@/components/ui/stat-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Calendar,
  FileText,
  Loader2,
} from "@/components/ui/icons";
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

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "APPROVED":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Format date
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
      <div className="p-6 max-w-4xl mx-auto">
        <EnhancedCard variant="elevated">
          <EnhancedCardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6 text-center">
              This page is only accessible to administrators and librarians.
            </p>
            <EnhancedButton onClick={() => router.push("/dashboard/admin")}>
              Back to Dashboard
            </EnhancedButton>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent">
          Join Requests
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and manage student access requests to your institution
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={stats.total.toString()}
          description="All time requests"
          icon={FileText}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          variant="default"
        />
        <StatCard
          title="Pending"
          value={stats.pending.toString()}
          description="Awaiting review"
          icon={Clock}
          iconColor="text-yellow-600"
          iconBgColor="bg-yellow-100"
          variant="default"
        />
        <StatCard
          title="Approved"
          value={stats.approved.toString()}
          description="Accepted requests"
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          variant="default"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected.toString()}
          description="Declined requests"
          icon={XCircle}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
          variant="default"
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by status:</label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Requests" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value= "PENDING">Pending</SelectItem>
            <SelectItem value= "APPROVED">Approved</SelectItem>
            <SelectItem value= "REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-vg-primary-600" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRequests.length === 0 && (
        <EnhancedCard variant="elevated">
          <EnhancedCardContent className="flex flex-col items-center justify-center py-12">
            <UserCheck className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Requests Found</h3>
            <p className="text-muted-foreground text-center">
              {statusFilter === "all"
                ? "No join requests have been submitted yet."
                : `No ${statusFilter} requests found.`}
            </p>
          </EnhancedCardContent>
        </EnhancedCard>
      )}

      {/* Requests List */}
      {!loading && filteredRequests.length > 0 && (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <EnhancedCard key={request.id} variant="elevated" interactive>
              <EnhancedCardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="" alt={request.user.name} />
                      <AvatarFallback className="bg-gradient-to-br from-vg-primary-500 to-vg-sanskrit-500 text-white">
                        {request.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {request.user.name}
                        </h3>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {request.user.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(request.createdAt)}
                        </div>
                      </div>

                      <div className="text-sm">
                        <span className="font-medium">Requested Role:</span>{" "}
                        <Badge variant="outline" className="ml-1">
                          {request.requestedRole}
                        </Badge>
                      </div>

                      {request.message && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Message:</p>
                          <p className="text-sm text-muted-foreground">
                            {request.message}
                          </p>
                        </div>
                      )}

                      {request.proofDocument && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <FileText className="h-4 w-4" />
                          <a
                            href={request.proofDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            View Proof Document
                          </a>
                        </div>
                      )}

                      {request.status === "REJECTED" && request.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm font-medium text-red-900 mb-1">
                            Rejection Reason:
                          </p>
                          <p className="text-sm text-red-700">
                            {request.rejectionReason}
                          </p>
                        </div>
                      )}

                      {request.reviewedAt && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Reviewed on {formatDate(request.reviewedAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {request.status === "PENDING" && (
                    <div className="flex gap-2">
                      <EnhancedButton
                        variant="vg-primary"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowApproveDialog(true);
                        }}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Approve
                      </EnhancedButton>
                      <EnhancedButton
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectDialog(true);
                        }}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Reject
                      </EnhancedButton>
                    </div>
                  )}
                </div>
              </EnhancedCardContent>
            </EnhancedCard>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Join Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this request? The user will be
              granted access to your institution as a{" "}
              <strong>{selectedRequest?.requestedRole}</strong>.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar>
                  <AvatarFallback className="bg-gradient-to-br from-vg-primary-500 to-vg-sanskrit-500 text-white">
                    {selectedRequest.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedRequest.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.user.email}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <EnhancedButton
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={processing}
            >
              Cancel
            </EnhancedButton>
            <EnhancedButton
              variant="vg-primary"
              onClick={handleApprove}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Approve Request
                </>
              )}
            </EnhancedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Join Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. The user will
              be notified.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar>
                  <AvatarFallback className="bg-gradient-to-br from-vg-primary-500 to-vg-sanskrit-500 text-white">
                    {selectedRequest.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedRequest.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.user.email}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rejection Reason (Optional)
                </label>
                <Textarea
                  placeholder="e.g., Insufficient documentation, Does not meet requirements..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <EnhancedButton
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
              disabled={processing}
            >
              Cancel
            </EnhancedButton>
            <EnhancedButton
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Reject Request
                </>
              )}
            </EnhancedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

