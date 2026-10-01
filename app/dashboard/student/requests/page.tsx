"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle, EnhancedCardDescription } from "@/components/ui/enhanced-card"
import { StatCard } from "@/components/ui/stat-card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import adminStyles from "@/app/admin.module.css"
import {
  Building2,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  FileText,
  Calendar,
  AlertCircle,
  School,
  GraduationCap,
  Briefcase,
  Plus,
  Trash2,
  TrendingUp,
  Sparkles
} from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
     JavaScript one, so the lowercase cases this switch used never matched and
     every badge fell through to the unstyled default. Normalised rather than
     re-cased so a stray lowercase value from anywhere still renders. */
  const getStatusBadge = (rawStatus: string) => {
    const status = String(rawStatus ?? '').toLowerCase();
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInstitutionIcon = (type: string) => {
    switch (type) {
      case 'school':
        return School;
      case 'college':
      case 'university':
        return GraduationCap;
      case 'corporate':
        return Briefcase;
      default:
        return Building2;
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

  return (
    <div className="space-y-8 animate-vg-fade-in relative z-10">
      {!isIndependentStudent ? (
        <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
          <div className={adminStyles.archMotif} />
          <EnhancedCardContent className="relative z-10 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 mb-6 shadow-xl text-white flex items-center justify-center">
              <Building2 className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Institution Access
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-md mx-auto mb-8">
              This feature is only available for independent students. Institutional users are already part of an organization.
            </p>
            <EnhancedButton
              size="lg"
              className="!bg-gradient-to-r !from-indigo-600 !to-indigo-500 hover:!from-indigo-700 hover:!to-indigo-600 !text-white border-transparent"
              onClick={() => router.push('/dashboard/student')}
            >
              Back to Dashboard
            </EnhancedButton>
          </EnhancedCardContent>
        </EnhancedCard>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <Send className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                Institution Access Requests
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                Track your requests to join institutional libraries
              </p>
            </div>
            <div className="flex items-center gap-3">
              <EnhancedButton
                size="lg"
                className="!bg-gradient-to-r !from-indigo-600 !to-indigo-500 hover:!from-indigo-700 hover:!to-indigo-600 !text-white shadow-lg hover:shadow-xl border-transparent"
                onClick={() => router.push('/institutions/browse')}
              >
                <Plus className="h-5 w-5 mr-2" />
                New Request
              </EnhancedButton>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Requests"
              value={stats.total.toString()}
              icon={Send}
              iconColor="text-indigo-600 dark:text-indigo-400"
              iconBgColor="bg-indigo-50 dark:bg-indigo-900/20"
              variant="primary"
            />
            <StatCard
              title="Pending"
              value={stats.pending.toString()}
              icon={Clock}
              iconColor="text-amber-600 dark:text-amber-400"
              iconBgColor="bg-amber-50 dark:bg-amber-900/20"
              variant="warning"
            />
            <StatCard
              title="Approved"
              value={stats.approved.toString()}
              icon={CheckCircle}
              iconColor="text-emerald-600 dark:text-emerald-400"
              iconBgColor="bg-emerald-50 dark:bg-emerald-900/20"
              variant="success"
            />
            <StatCard
              title="Rejected"
              value={stats.rejected.toString()}
              icon={XCircle}
              iconColor="text-red-600 dark:text-red-400"
              iconBgColor="bg-red-50 dark:bg-red-900/20"
              variant="error"
            />
          </div>

          {/* Requests List */}
          {isLoading ? (
            <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
              <EnhancedCardContent className="p-12 flex justify-center items-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  <p className="text-slate-500 font-medium text-lg">Loading requests...</p>
                </div>
              </EnhancedCardContent>
            </EnhancedCard>
          ) : requests.length === 0 ? (
            <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
              <div className={adminStyles.archMotif} />
              <EnhancedCardContent className="relative z-10 p-16 text-center">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 p-6 mb-6 flex items-center justify-center">
                  <Send className="h-10 w-10 text-indigo-500" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">No Requests Yet</h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg max-w-md mx-auto mb-8">
                  You haven't submitted any requests to join institutional libraries. Browse available institutions to get started.
                </p>
                <EnhancedButton
                  size="lg"
                  className="!bg-gradient-to-r !from-indigo-600 !to-indigo-500 hover:!from-indigo-700 hover:!to-indigo-600 !text-white transition-all shadow-md group"
                  onClick={() => router.push('/institutions/browse')}
                >
                  <Sparkles className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                  Browse Institutions
                </EnhancedButton>
              </EnhancedCardContent>
            </EnhancedCard>
          ) : (
            <div className="space-y-6">
              {requests.map((request) => {
                const Icon = getInstitutionIcon(request.tenant.type);

                return (
                  <EnhancedCard key={request.id} variant="elevated" className={adminStyles.scallopedArch}>
                    <div className={adminStyles.archMotif} />
                    <EnhancedCardContent className="relative z-10 p-6 sm:p-8 mt-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Institution Logo */}
                        <div className="flex-shrink-0">
                          <Avatar className="h-20 w-20 ring-4 ring-indigo-500/20 shadow-md">
                            {request.tenant.logoUrl ? (
                              <AvatarImage src={request.tenant.logoUrl} alt={request.tenant.name} />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                                <Icon className="h-10 w-10" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </div>

                        {/* Request Details */}
                        <div className="flex-1 space-y-4">
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div>
                              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                {request.tenant.name}
                              </h3>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                  {getTypeLabel(request.tenant.type)}
                                </span>
                                {getStatusBadge(request.status)}
                              </div>
                            </div>

                            {/* Actions */}
                            {request.status === 'PENDING' && (
                              <EnhancedButton
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 whitespace-nowrap"
                                onClick={() => setRequestToCancel(request)}
                                disabled={cancelingId === request.id}
                              >
                                {cancelingId === request.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Cancelling...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Cancel Request
                                  </>
                                )}
                              </EnhancedButton>
                            )}
                          </div>

                          {/* Location */}
                          {request.tenant.location && (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                              <MapPin className="h-4 w-4 text-indigo-500" />
                              <span className="font-medium text-sm">{request.tenant.location}</span>
                            </div>
                          )}

                          {/* Message */}
                          {request.message && (
                            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-semibold">Your Message</p>
                              <p className="text-slate-800 dark:text-slate-200 text-sm">{request.message}</p>
                            </div>
                          )}

                          {/* Rejection Reason */}
                          {request.status === 'REJECTED' && request.rejectionReason && (
                            <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle className="font-semibold text-red-800 dark:text-red-300">Rejection Reason</AlertTitle>
                              <AlertDescription className="text-red-700 dark:text-red-400 text-sm mt-1">{request.rejectionReason}</AlertDescription>
                            </Alert>
                          )}

                          {/* Dates */}
                          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400 flex-wrap pt-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span>Submitted: {formatDate(request.createdAt)}</span>
                            </div>
                            {request.reviewedAt && (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                <span>Reviewed: {formatDate(request.reviewedAt)}</span>
                              </div>
                            )}
                            {request.proofDocument && (
                              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                <FileText className="h-4 w-4" />
                                <span>Document attached</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </EnhancedCardContent>
                  </EnhancedCard>
                );
              })}
            </div>
          )}

          {/* Cancel Confirmation Dialog */}
          <AlertDialog open={!!requestToCancel} onOpenChange={(open) => !open && setRequestToCancel(null)}>
            <AlertDialogContent className="rounded-2xl border border-indigo-100 dark:border-indigo-900 shadow-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">Cancel Request?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-600 dark:text-slate-400 text-base">
                  Are you sure you want to cancel your request to join <span className="font-semibold text-slate-900 dark:text-slate-200">{requestToCancel?.tenant.name}</span>?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6">
                <AlertDialogCancel className="border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 font-medium">Wait, keep it</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => requestToCancel && handleCancelRequest(requestToCancel)}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium"
                >
                  Yes, Cancel Request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
