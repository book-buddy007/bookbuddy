"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuthStore } from "@/store/useAuthStore"
import { toast } from "@/hooks/use-toast"

const joinRequestSchema = z.object({
  tenantId: z.string().min(1, "Please select an institution"),
  requestedRole: z.string().default("student"),
  message: z.string().optional(),
  // Proof upload has no storage backend yet; the field stays so the API shape is unchanged.
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

// Types arrive as enum names (SCHOOL, COLLEGE…); compare case-insensitively.
const TYPE_LABELS: Record<string, string> = {
  school: 'School',
  college: 'College',
  university: 'University',
  corporate: 'Corporate',
};
const typeLabel = (type: string) => TYPE_LABELS[String(type ?? '').toLowerCase()] ?? type;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-bb-lg bg-bb-surface p-6 shadow-e1 sm:p-8">
      <h2 className="font-display text-xl font-bold text-bb-text">{title}</h2>
      {description && <p className="mt-1 text-sm text-bb-muted">{description}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JoinRequestFormData>({
    resolver: zodResolver(joinRequestSchema),
    defaultValues: { requestedRole: "student" },
  });

  const selectedTenantId = watch("tenantId");

  useEffect(() => {
    fetchInstitutions();
  }, []);

  // Pre-select the institution passed from the browse page
  useEffect(() => {
    const institutionId = searchParams.get("institutionId");
    if (institutionId && institutions.length > 0) {
      setValue("tenantId", institutionId);
    }
  }, [searchParams, institutions, setValue]);

  useEffect(() => {
    if (selectedTenantId) {
      const institution = institutions.find((i) => i.id === selectedTenantId);
      setSelectedInstitution(institution || null);

      if (institution && user) {
        checkEligibility(user.id, institution.id);
      }
    } else {
      setSelectedInstitution(null);
      setCanRequest(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, institutions, user]);

  const fetchInstitutions = async () => {
    try {
      setIsLoadingInstitutions(true);
      const response = await fetch('/api/institutions/browse');
      if (!response.ok) throw new Error('Failed to fetch institutions');

      const data = await response.json();
      setInstitutions(data);
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast({
        title: "Couldn't load institutions",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInstitutions(false);
    }
  };

  const checkEligibility = async (_userId: string, tenantId: string) => {
    try {
      setCheckingEligibility(true);
      const response = await fetch(`/api/join-requests/check?tenantId=${tenantId}`);
      if (!response.ok) throw new Error('Failed to check eligibility');

      const data = await response.json();
      setCanRequest(data.canRequest);

      if (data.hasMembership) {
        toast({ title: "Already a member", description: "You are already a member of this institution." });
      } else if (data.hasPendingRequest) {
        toast({ title: "Request pending", description: "You already have a pending request for this institution." });
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setCanRequest(null);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const onSubmit = async (data: JoinRequestFormData) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to submit a join request.",
        variant: "destructive",
      });
      return;
    }

    if (canRequest === false) {
      toast({
        title: "Can't submit this request",
        description: "You already have a pending request or membership with this institution.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/join-requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      toast({
        title: "Request sent",
        description: `Your request to join ${selectedInstitution?.name} has been submitted.`,
      });

      router.push('/institutions/browse?tab=requests');
    } catch (error: any) {
      console.error('Error submitting join request:', error);
      toast({
        title: "Couldn't send the request",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isIndependentStudent = user?.accountType === 'INDEPENDENT';

  if (!isIndependentStudent) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <EmptyState
          icon="institution"
          title="You're already part of an institution"
          description="Join requests are for independent students. Your library comes from your institution."
          action={
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:py-10">
      <Link
        href="/institutions/browse"
        className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-bb-muted hover:text-bb-text focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Icon name="arrow-left" size={16} fillLayer={false} />
        Back to institutions
      </Link>

      <PageHeader
        eyebrow="Institutions"
        title="Request access"
        description="Ask an institution to add you to its library."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Section title="Institution" description="Choose the library you want to join.">
          <FormField label="Institution" htmlFor="tenantId" error={errors.tenantId?.message}>
            <Select
              value={selectedTenantId}
              onValueChange={(value) => setValue("tenantId", value, { shouldValidate: true })}
              disabled={isLoadingInstitutions}
            >
              <SelectTrigger id="tenantId" aria-invalid={errors.tenantId ? "true" : "false"}>
                <SelectValue placeholder={isLoadingInstitutions ? "Loading institutions…" : "Select an institution"} />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((institution) => (
                  <SelectItem key={institution.id} value={institution.id}>
                    {institution.name} ({typeLabel(institution.type)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {selectedInstitution && (
            <div className="flex items-start gap-4 rounded-bb-md bg-bb-surface-2 p-4">
              {selectedInstitution.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedInstitution.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-bb-md object-cover" />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-bb-md bg-bb-navy text-white">
                  <Icon name="institution" size={26} />
                </span>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <h3 className="font-display text-lg font-bold text-bb-text">{selectedInstitution.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-lg bg-bb-info-soft px-2 py-0.5 text-xs font-semibold text-bb-info-ink">
                      {typeLabel(selectedInstitution.type)}
                    </span>
                    {selectedInstitution.subscriptionTier && (
                      <span className="rounded-lg bg-bb-accent-soft px-2 py-0.5 text-xs font-semibold capitalize text-bb-accent-ink">
                        {selectedInstitution.subscriptionTier.toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
                {selectedInstitution.description && <p className="text-sm text-bb-muted">{selectedInstitution.description}</p>}
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-bb-muted">
                  {selectedInstitution.location && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="map-pin" size={14} fillLayer={false} />
                      {selectedInstitution.location}
                    </span>
                  )}
                  <span>{selectedInstitution.memberCount} members</span>
                  <span>{selectedInstitution.bookCount} books</span>
                </p>
              </div>
            </div>
          )}

          {checkingEligibility && (
            <Alert variant="info" role="status">
              <Icon name="loader" fillLayer={false} className="animate-spin" />
              <AlertTitle>Checking your request status…</AlertTitle>
            </Alert>
          )}

          {canRequest === false && (
            <Alert variant="destructive">
              <Icon name="alert-circle" fillLayer={false} />
              <AlertTitle>You can&apos;t request this one</AlertTitle>
              <AlertDescription>You already have a pending request or membership with this institution.</AlertDescription>
            </Alert>
          )}

          {canRequest === true && selectedInstitution?.requireApproval && (
            <Alert variant="info">
              <Icon name="info" fillLayer={false} />
              <AlertTitle>An admin reviews each request</AlertTitle>
              <AlertDescription>You&apos;ll be notified once yours has been reviewed.</AlertDescription>
            </Alert>
          )}
        </Section>

        {selectedInstitution && canRequest !== false && (
          <>
            <Section title="Your request" description="Optional, but it helps the admin decide quickly.">
              <FormField
                label="Message"
                htmlFor="message"
                hint="Who you are and why you'd like to join, for example your class and roll number."
              >
                <Textarea id="message" placeholder="I'm a Class 10 student at…" rows={4} {...register("message")} />
              </FormField>

              <div className="flex items-start gap-3 rounded-bb-md border border-dashed border-bb-border p-4">
                <Icon name="upload" size={20} className="mt-0.5 shrink-0 text-bb-faint" />
                <div className="text-sm">
                  <p className="font-semibold text-bb-text">
                    Supporting document <span className="ml-1 rounded-md bg-bb-surface-2 px-1.5 py-0.5 text-xs font-semibold text-bb-muted">Not available yet</span>
                  </p>
                  <p className="mt-1 text-bb-muted">
                    Uploading proof of enrolment isn&apos;t supported yet. Put your student ID in the message instead.
                  </p>
                </div>
              </div>
            </Section>

            {/* `canRequest === false` is already excluded by the guard around this block. */}
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={isSubmitting || !selectedTenantId}>
                {isSubmitting ? <Icon name="loader" fillLayer={false} className="animate-spin" /> : <Icon name="send" fillLayer={false} />}
                {isSubmitting ? "Sending…" : "Send request"}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
