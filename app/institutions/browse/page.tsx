"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LoadingButton } from "@/components/landing/loading-button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  MapPin,
  Building2,
  Users,
  BookOpen,
  Filter,
  School,
  GraduationCap,
  Building,
  Briefcase,
  ChevronRight,
  Loader2,
  Sparkles,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft
} from "@/components/ui/icons"
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

export default function BrowseInstitutionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  // Browse Institutions state
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  // My Requests state
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [requestToCancel, setRequestToCancel] = useState<JoinRequest | null>(null);
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || "browse");

  // Fetch institutions on mount
  useEffect(() => {
    fetchInstitutions();
  }, []);

  // Fetch requests when switching to My Requests tab
  useEffect(() => {
    if (activeTab === "requests" && user) {
      fetchRequests();
    }
  }, [activeTab, user]);

  // Apply filters whenever search or filter values change
  useEffect(() => {
    applyFilters();
  }, [searchQuery, typeFilter, locationFilter, institutions]);

  const fetchInstitutions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/institutions/browse');
      
      if (!response.ok) {
        throw new Error('Failed to fetch institutions');
      }

      const data = await response.json();
      setInstitutions(data);
      setFilteredInstitutions(data);
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast({
        title: "Error",
        description: "Failed to load institutions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...institutions];

    // Apply search filter
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

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((inst) => inst.type === typeFilter);
    }

    // Apply location filter
    if (locationFilter !== "all") {
      filtered = filtered.filter((inst) => inst.location === locationFilter);
    }

    setFilteredInstitutions(filtered);
  };

  // Fetch join requests for the user
  const fetchRequests = async () => {
    if (!user) return;

    try {
      setRequestsLoading(true);
      const response = await fetch(`/api/join-requests/user?userId=${user.id}`);

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
      setRequestsLoading(false);
    }
  };

  // Handle cancel request
  const handleCancelRequest = async (request: JoinRequest) => {
    if (!user) return;

    try {
      setCancelingId(request.id);
      const response = await fetch(`/api/join-requests/${request.id}/cancel?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel request');
      }

      toast({
        title: "Request Cancelled",
        description: `Your request to join ${request.tenant.name} has been cancelled.`,
      });

      // Refresh requests list
      fetchRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelingId(null);
      setRequestToCancel(null);
    }
  };

  const getInstitutionIcon = (type: string) => {
    switch (type) {
      case 'school':
        return School;
      case 'college':
        return GraduationCap;
      case 'university':
        return Building2;
      case 'corporate':
        return Briefcase;
      default:
        return Building;
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

  // Helper functions for request status
  // Normalised: the API sends uppercase enum names, so the lowercase cases
  // below never matched and every request fell through to the default.
  const getStatusIcon = (rawStatus: string) => {
    const status = String(rawStatus ?? '').toLowerCase();
    switch (status) {
      case 'pending':
        return Clock;
      case 'approved':
        return CheckCircle2;
      case 'rejected':
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  const getStatusColor = (rawStatus: string) => {
    const status = String(rawStatus ?? '').toLowerCase();
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTierColor = (tier: string | null) => {
    if (!tier) return 'default';
    switch (tier.toLowerCase()) {
      case 'basic':
        return 'default';
      case 'standard':
        return 'secondary';
      case 'premium':
        return 'default';
      case 'enterprise':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleRequestAccess = (institutionId: string, institutionName: string) => {
    // Navigate to join request page with institution pre-selected
    router.push(`/institutions/join-request?institutionId=${institutionId}`);
  };

  const handleViewDetails = (institutionId: string) => {
    router.push(`/institutions/${institutionId}`);
  };

  // Get unique locations for filter
  const uniqueLocations = Array.from(
    new Set(institutions.map((i) => i.location).filter((l): l is string => l !== null))
  ).sort();

  // Check if user is independent student
  const isIndependentStudent = user?.accountType === 'INDEPENDENT';

  if (!isIndependentStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
        <div className="landing-glass-card-premium rounded-3xl p-12 max-w-2xl text-center overflow-hidden animate-landing-scale-in">
          {/* Premium glass shine effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60 pointer-events-none" />

          <div className="relative">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-600 p-6 mb-6 shadow-2xl">
              <Building2 className="h-12 w-12 text-white drop-shadow-lg" />
            </div>
            <h2 className="text-4xl font-bold landing-gradient-text mb-4">Institution Browse</h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto mb-8">
              This feature is only available for independent students. Institutional users are already part of an organization.
            </p>
            <LoadingButton
              variant="primary"
              size="xl"
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </LoadingButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="py-16 px-4 md:px-6 max-w-7xl mx-auto space-y-12 animate-landing-fade-in-up">
        {/* Back to Dashboard Button */}
        <div className="flex justify-start">
          <LoadingButton
            variant="outline"
            size="lg"
            onClick={() => router.push('/dashboard/student')}
            className="group hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300"
          >
            <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Dashboard
          </LoadingButton>
        </div>

        {/* Header */}
        <div className="space-y-3 text-center md:text-left">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight landing-gradient-text">
            Browse Institutions
          </h1>
          <p className="text-gray-700 dark:text-gray-300 text-xl leading-relaxed">
            Discover and request access to institutional libraries
          </p>
        </div>

        {/* Tabs for Browse and My Requests */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto md:mx-0 grid-cols-2">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Browse Institutions
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              My Requests
            </TabsTrigger>
          </TabsList>

          {/* Browse Institutions Tab */}
          <TabsContent value="browse" className="space-y-8 mt-8">

        {/* Search and Filters */}
        <div className="landing-glass-card-premium rounded-3xl p-8 overflow-hidden animate-landing-glass-shine">
          {/* Premium glass shine effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60 pointer-events-none" />

          <div className="relative space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Search */}
              <div className="md:col-span-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search institutions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div className="md:col-span-1">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-cyan-500">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value= "SCHOOL">Schools</SelectItem>
                    <SelectItem value= "COLLEGE">Colleges</SelectItem>
                    <SelectItem value= "UNIVERSITY">Universities</SelectItem>
                    <SelectItem value= "CORPORATE">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div className="md:col-span-1">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-cyan-500">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center gap-3 text-base text-gray-600 dark:text-gray-400">
              <Filter className="h-5 w-5" />
              <span className="font-medium">
                Showing {filteredInstitutions.length} of {institutions.length} institutions
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-cyan-500" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredInstitutions.length === 0 && (
          <div className="landing-glass-card-premium rounded-3xl p-16 text-center overflow-hidden">
            {/* Premium glass shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60 pointer-events-none" />

            <div className="relative">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-gray-400 to-gray-600 p-6 mb-6 shadow-xl">
                <Building2 className="h-12 w-12 text-white drop-shadow-lg" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">No institutions found</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto">
                {searchQuery || typeFilter !== "all" || locationFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "There are no institutions available at the moment."}
              </p>
            </div>
          </div>
        )}

        {/* Institution Cards Grid */}
        {!isLoading && filteredInstitutions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 landing-stagger-children">
            {filteredInstitutions.map((institution) => {
              const Icon = getInstitutionIcon(institution.type);

              return (
                <div
                  key={institution.id}
                  className="landing-glass-card-premium rounded-3xl p-6 hover:scale-105 transition-all duration-500 cursor-pointer group overflow-hidden animate-landing-glass-shine"
                  onClick={() => handleViewDetails(institution.id)}
                  style={{
                    boxShadow: `
                      0 12px 40px rgba(29, 78, 216, 0.15),
                      0 6px 20px rgba(0, 0, 0, 0.1),
                      0 3px 10px rgba(0, 0, 0, 0.05),
                      inset 0 2px 4px rgba(255, 255, 255, 0.7),
                      inset 0 -2px 4px rgba(0, 0, 0, 0.05)
                    `
                  }}
                >
                  {/* Premium glass shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60 pointer-events-none" />

                  <div className="relative space-y-6">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16 ring-4 ring-blue-500/20 shadow-lg">
                        {institution.logoUrl ? (
                          <AvatarImage src={institution.logoUrl} alt={institution.name} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                            <Icon className="h-8 w-8" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                          {institution.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {getTypeLabel(institution.type)}
                          </span>
                          {institution.subscriptionTier && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white capitalize">
                              {institution.subscriptionTier}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-4">
                      {/* Description */}
                      {institution.description && (
                        <p className="text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {institution.description}
                        </p>
                      )}

                      {/* Location */}
                      {institution.location && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <MapPin className="h-5 w-5 text-blue-500" />
                          <span className="truncate font-medium">{institution.location}</span>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Members</p>
                            <p className="text-base font-bold text-gray-900 dark:text-white">{institution.memberCount}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-md">
                            <BookOpen className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Books</p>
                            <p className="text-base font-bold text-gray-900 dark:text-white">{institution.bookCount}</p>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <LoadingButton
                        variant="primary"
                        size="lg"
                        className="w-full group/btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestAccess(institution.id, institution.name);
                        }}
                      >
                        <Sparkles className="mr-2 h-5 w-5 group-hover/btn:rotate-12 transition-transform duration-300" />
                        Request Access
                        <ChevronRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-1 transition-transform duration-300" />
                      </LoadingButton>

                      {/* Approval Notice */}
                      {institution.requireApproval && (
                        <p className="text-sm text-center text-gray-500 dark:text-gray-400 font-medium">
                          ⚠️ Requires admin approval
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </TabsContent>

          {/* My Requests Tab */}
          <TabsContent value="requests" className="space-y-8 mt-8">
            {/* Loading State */}
            {requestsLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-cyan-500" />
              </div>
            )}

            {/* Empty State */}
            {!requestsLoading && requests.length === 0 && (
              <div className="landing-glass-card-premium rounded-3xl p-16 text-center overflow-hidden animate-landing-scale-in">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60 pointer-events-none" />
                <div className="relative">
                  <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-600 p-6 mb-6 shadow-2xl">
                    <Send className="h-12 w-12 text-white drop-shadow-lg" />
                  </div>
                  <h3 className="text-3xl font-bold landing-gradient-text mb-4">No Join Requests</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto mb-8">
                    You haven't submitted any join requests yet. Browse institutions and request access to get started.
                  </p>
                  <LoadingButton
                    variant="primary"
                    size="xl"
                    onClick={() => setActiveTab("browse")}
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Browse Institutions
                  </LoadingButton>
                </div>
              </div>
            )}

            {/* Requests List */}
            {!requestsLoading && requests.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Your Join Requests ({requests.length})
                  </h2>
                </div>

                <div className="grid gap-6">
                  {requests.map((request) => {
                    const StatusIcon = getStatusIcon(request.status);
                    const InstitutionIcon = getInstitutionIcon(request.tenant.type);

                    return (
                      <div
                        key={request.id}
                        className="landing-glass-card-premium rounded-3xl p-8 overflow-hidden hover:shadow-2xl transition-all duration-300 animate-landing-glass-shine"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60 pointer-events-none" />

                        <div className="relative space-y-6">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                              {/* Institution Logo */}
                              <Avatar className="h-16 w-16 rounded-2xl border-2 border-white dark:border-gray-700 shadow-lg">
                                <AvatarImage src={request.tenant.logoUrl || undefined} alt={request.tenant.name} />
                                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white text-xl font-bold">
                                  {request.tenant.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>

                              {/* Institution Info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 truncate">
                                  {request.tenant.name}
                                </h3>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                  <div className="flex items-center gap-1.5">
                                    <InstitutionIcon className="h-4 w-4" />
                                    <span className="capitalize">{request.tenant.type}</span>
                                  </div>
                                  {request.tenant.location && (
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="h-4 w-4" />
                                      <span>{request.tenant.location}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold ${getStatusColor(request.status)}`}>
                              <StatusIcon className="h-4 w-4" />
                              <span className="capitalize">{request.status}</span>
                            </div>
                          </div>

                          {/* Request Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Requested Role</p>
                              <p className="font-semibold text-gray-900 dark:text-white capitalize">{request.requestedRole}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Submitted On</p>
                              <p className="font-semibold text-gray-900 dark:text-white">{formatDate(request.createdAt)}</p>
                            </div>
                            {request.message && (
                              <div className="md:col-span-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Message</p>
                                <p className="text-gray-700 dark:text-gray-300">{request.message}</p>
                              </div>
                            )}
                            {request.status === 'REJECTED' && request.rejectionReason && (
                              <div className="md:col-span-2">
                                <p className="text-sm text-red-500 dark:text-red-400 mb-1">Rejection Reason</p>
                                <p className="text-red-700 dark:text-red-300">{request.rejectionReason}</p>
                              </div>
                            )}
                            {request.status === 'APPROVED' && request.reviewedAt && (
                              <div className="md:col-span-2">
                                <p className="text-sm text-green-500 dark:text-green-400 mb-1">Approved On</p>
                                <p className="text-green-700 dark:text-green-300">{formatDate(request.reviewedAt)}</p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          {request.status === 'PENDING' && (
                            <div className="flex justify-end">
                              <LoadingButton
                                variant="destructive"
                                size="lg"
                                onClick={() => setRequestToCancel(request)}
                                isLoading={cancelingId === request.id}
                              >
                                <XCircle className="mr-2 h-5 w-5" />
                                Cancel Request
                              </LoadingButton>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!requestToCancel} onOpenChange={(open) => !open && setRequestToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Join Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your request to join{' '}
              <span className="font-semibold">{requestToCancel?.tenant.name}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => requestToCancel && handleCancelRequest(requestToCancel)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

