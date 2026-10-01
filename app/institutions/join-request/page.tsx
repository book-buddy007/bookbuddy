"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Building2, 
  MapPin, 
  Users, 
  BookOpen, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Upload,
  FileText,
  ArrowLeft,
  Send,
  School,
  GraduationCap,
  Briefcase,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthStore } from "@/store/useAuthStore"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Form validation schema
const joinRequestSchema = z.object({
  tenantId: z.string().min(1, "Please select an institution"),
  requestedRole: z.string().default("student"),
  message: z.string().optional(),
  proofDocument: z.string().optional(),
});

type JoinRequestFormData = z.infer<typeof joinRequestSchema>;

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

export default function JoinRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canRequest, setCanRequest] = useState<boolean | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JoinRequestFormData>({
    resolver: zodResolver(joinRequestSchema),
    defaultValues: {
      requestedRole: "student",
    },
  });

  const selectedTenantId = watch("tenantId");

  // Fetch institutions on mount
  useEffect(() => {
    fetchInstitutions();
  }, []);

  // Pre-select institution if institutionId is in query params
  useEffect(() => {
    const institutionId = searchParams.get("institutionId");
    if (institutionId && institutions.length > 0) {
      setValue("tenantId", institutionId);
    }
  }, [searchParams, institutions, setValue]);

  // Update selected institution when tenantId changes
  useEffect(() => {
    if (selectedTenantId) {
      const institution = institutions.find((i) => i.id === selectedTenantId);
      setSelectedInstitution(institution || null);
      
      // Check eligibility
      if (institution && user) {
        checkEligibility(user.id, institution.id);
      }
    } else {
      setSelectedInstitution(null);
      setCanRequest(null);
    }
  }, [selectedTenantId, institutions, user]);

  const fetchInstitutions = async () => {
    try {
      setIsLoadingInstitutions(true);
      const response = await fetch('/api/institutions/browse');
      
      if (!response.ok) {
        throw new Error('Failed to fetch institutions');
      }

      const data = await response.json();
      setInstitutions(data);
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast({
        title: "Error",
        description: "Failed to load institutions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInstitutions(false);
    }
  };

  const checkEligibility = async (userId: string, tenantId: string) => {
    try {
      setCheckingEligibility(true);
      const response = await fetch(
        `/api/join-requests/check?tenantId=${tenantId}`
      );

      if (!response.ok) {
        throw new Error('Failed to check eligibility');
      }

      const data = await response.json();
      setCanRequest(data.canRequest);

      if (data.hasMembership) {
        toast({
          title: "Already a Member",
          description: "You are already a member of this institution.",
          variant: "default",
        });
      } else if (data.hasPendingRequest) {
        toast({
          title: "Pending Request",
          description: "You already have a pending request for this institution.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setCanRequest(null);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, JPG, or PNG file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement actual file upload to S3
    // For now, we'll just store the file name as a placeholder
    setUploadedFileName(file.name);
    setValue("proofDocument", `placeholder-url/${file.name}`);
    
    toast({
      title: "File Ready",
      description: `${file.name} is ready to upload.`,
    });
  };

  const onSubmit = async (data: JoinRequestFormData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit a join request.",
        variant: "destructive",
      });
      return;
    }

    if (canRequest === false) {
      toast({
        title: "Cannot Submit Request",
        description: "You already have a pending request or membership with this institution.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/join-requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: data.tenantId,
          requestedRole: data.requestedRole,
          message: data.message,
          proofDocument: data.proofDocument,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit join request');
      }

      const result = await response.json();

      toast({
        title: "Request Submitted!",
        description: `Your request to join ${selectedInstitution?.name} has been submitted successfully.`,
      });

      // Redirect to Browse Institutions page with My Requests tab active
      router.push('/institutions/browse?tab=requests');
    } catch (error: any) {
      console.error('Error submitting join request:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit join request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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

  // Check if user is independent student
  const isIndependentStudent = user?.accountType === 'INDEPENDENT';

  if (!isIndependentStudent) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <EnhancedCard variant="elevated">
          <EnhancedCardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-blue-50 dark:bg-blue-900/20 p-6 mb-4">
              <Building2 className="h-16 w-16 text-blue-700 dark:text-blue-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Join Request</h2>
            <p className="text-muted-foreground max-w-md">
              This feature is only available for independent students. Institutional users are already part of an organization.
            </p>
            <EnhancedButton
              variant="vg-primary"
              className="mt-6"
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </EnhancedButton>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-vg-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <EnhancedButton
          variant="outline"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </EnhancedButton>
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
            Request Institution Access
          </h1>
          <p className="text-muted-foreground text-lg">
            Submit a request to join an institutional library
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Institution Selection */}
        <EnhancedCard variant="elevated">
          <EnhancedCardHeader>
            <EnhancedCardTitle>Select Institution</EnhancedCardTitle>
            <EnhancedCardDescription>
              Choose the institution you would like to request access to
            </EnhancedCardDescription>
          </EnhancedCardHeader>
          <EnhancedCardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantId">Institution *</Label>
              <Select
                value={selectedTenantId}
                onValueChange={(value) => setValue("tenantId", value)}
                disabled={isLoadingInstitutions}
              >
                <SelectTrigger id="tenantId">
                  <SelectValue placeholder="Select an institution..." />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((institution) => (
                    <SelectItem key={institution.id} value={institution.id}>
                      {institution.name} ({getTypeLabel(institution.type)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tenantId && (
                <p className="text-sm text-red-600">{errors.tenantId.message}</p>
              )}
            </div>

            {/* Selected Institution Details */}
            {selectedInstitution && (
              <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    {selectedInstitution.logoUrl ? (
                      <AvatarImage src={selectedInstitution.logoUrl} alt={selectedInstitution.name} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                        {(() => {
                          const Icon = getInstitutionIcon(selectedInstitution.type);
                          return <Icon className="h-8 w-8" />;
                        })()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedInstitution.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{getTypeLabel(selectedInstitution.type)}</Badge>
                        {selectedInstitution.subscriptionTier && (
                          <Badge variant="secondary" className="capitalize">
                            {selectedInstitution.subscriptionTier}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {selectedInstitution.description && (
                      <p className="text-sm text-muted-foreground">
                        {selectedInstitution.description}
                      </p>
                    )}

                    {selectedInstitution.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{selectedInstitution.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span>{selectedInstitution.memberCount} members</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-cyan-600" />
                        <span>{selectedInstitution.bookCount} books</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Eligibility Check */}
            {checkingEligibility && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Checking eligibility...</AlertTitle>
                <AlertDescription>
                  Please wait while we verify your request status.
                </AlertDescription>
              </Alert>
            )}

            {canRequest === false && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Cannot Submit Request</AlertTitle>
                <AlertDescription>
                  You already have a pending request or membership with this institution.
                </AlertDescription>
              </Alert>
            )}

            {canRequest === true && selectedInstitution?.requireApproval && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Approval Required</AlertTitle>
                <AlertDescription>
                  This institution requires admin approval for join requests. You will be notified once your request is reviewed.
                </AlertDescription>
              </Alert>
            )}
          </EnhancedCardContent>
        </EnhancedCard>

        {/* Request Details - Only show if institution is selected and can request */}
        {selectedInstitution && canRequest !== false && (
          <>
            {/* Message */}
            <EnhancedCard variant="elevated">
              <EnhancedCardHeader>
                <EnhancedCardTitle>Request Details</EnhancedCardTitle>
                <EnhancedCardDescription>
                  Provide additional information about your request (optional)
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell the institution why you'd like to join..."
                    rows={4}
                    {...register("message")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Explain your reason for joining this institution (e.g., student, researcher, etc.)
                  </p>
                </div>

                {/* Proof Document Upload */}
                <div className="space-y-2">
                  <Label htmlFor="proofDocument">Supporting Document (Optional)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="proofDocument"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Label
                      htmlFor="proofDocument"
                      className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload Document</span>
                    </Label>
                    {uploadedFileName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{uploadedFileName}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload proof of enrollment, student ID, or other supporting documents (PDF, JPG, PNG - Max 5MB)
                  </p>
                </div>
              </EnhancedCardContent>
            </EnhancedCard>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-4">
              <EnhancedButton
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </EnhancedButton>
              {/* `canRequest === false` was dropped from `disabled` below: this
                  whole block already sits inside a `canRequest !== false`
                  guard, so the value is narrowed to true|null there and the
                  check could never fire. */}
              <EnhancedButton
                type="submit"
                variant="vg-primary"
                disabled={isSubmitting || !selectedTenantId}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Request
                  </>
                )}
              </EnhancedButton>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

