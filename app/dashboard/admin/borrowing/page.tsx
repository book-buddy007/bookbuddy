'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { NoInstitution } from "@/components/admin/NoInstitution";
import { EmptyState } from "@/components/ui/empty-state";
import { useAdminTenant } from "@/hooks/use-admin-tenant";
import { useAdminPolicies } from "@/hooks/use-admin-data";
import { savePolicies, type BorrowingPolicies as Policies } from "@/lib/tenant-admin";
import { useToast } from "@/components/ui/use-toast";

const PolicySectionAccordion = ({
  value,
  title,
  children
}: {
  value: string;
  title: string;
  children: React.ReactNode
}) => (
  <AccordionItem value={value}>
    <AccordionTrigger className="font-display text-lg font-extrabold tracking-[-0.02em]">{title}</AccordionTrigger>
    <AccordionContent className="px-1 pb-2 pt-4">{children}</AccordionContent>
  </AccordionItem>
);

const RateCalculator = ({
  dailyRate,
  days,
  gracePeriod,
  maxFine
}: {
  dailyRate: number;
  days: number;
  gracePeriod: number;
  maxFine: number
}) => {
  const fine = days <= gracePeriod ? 0 : Math.min((days - gracePeriod) * dailyRate, maxFine);
  const capped = days > gracePeriod && fine === maxFine;

  return (
    <div className="mt-4 rounded-2xl bg-bb-surface-2 p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon name="analytics" size={18} /> Fine calculator
      </h4>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div><dt className="text-bb-muted">Days overdue</dt><dd className="font-bold tabular-nums">{days}</dd></div>
        <div><dt className="text-bb-muted">Grace period</dt><dd className="font-bold tabular-nums">{gracePeriod} days</dd></div>
        <div><dt className="text-bb-muted">Daily rate</dt><dd className="font-bold tabular-nums">${dailyRate.toFixed(2)}</dd></div>
        <div><dt className="text-bb-muted">Calculated fine</dt><dd className="font-bold tabular-nums">${fine.toFixed(2)}</dd></div>
      </dl>
      {capped && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-bb-warning-ink">
          <Icon name="alert" size={16} /> Max fine limit reached
        </p>
      )}
    </div>
  );
};

const ComplianceChecker = ({ policies }: { policies: Policies }) => {
  const issues: string[] = [];
  if (policies.limits.student <= 0) issues.push("Student book limit should be greater than 0");
  if (policies.limits.teacher <= 0) issues.push("Teacher book limit should be greater than 0");
  if (policies.fines.dailyRate <= 0) issues.push("Daily fine rate should be greater than 0");
  if (policies.periods.book <= 0 || policies.periods.ebook <= 0 || policies.periods.audiobook <= 0) {
    issues.push("Borrowing periods should be greater than 0");
  }

  if (issues.length === 0) {
    return (
      <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-bb-success-soft px-4 py-3 text-sm font-semibold text-bb-success-ink">
        <Icon name="check-circle" size={18} /> All policies are compliant
      </p>
    );
  }

  return (
    <div role="alert" className="mt-4 rounded-xl bg-bb-warning-soft px-4 py-3 text-sm text-bb-warning-ink">
      <p className="mb-2 flex items-center gap-2 font-semibold">
        <Icon name="alert" size={18} /> Policy compliance issues
      </p>
      <ul className="list-disc space-y-1 pl-5">
        {issues.map((issue, index) => (
          <li key={index}>{issue}</li>
        ))}
      </ul>
    </div>
  );
};

export default function BorrowingPage() {
  const { tenantId, loading: tenantLoading } = useAdminTenant();
  const { data, isLoading: policiesLoading, isError, error, refetch } = useAdminPolicies();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [localPolicies, setLocalPolicies] = useState<Policies | null>(null);
  const [saving, setSaving] = useState(false);
  const [daysOverdue, setDaysOverdue] = useState(5);

  // Start the form from what the server has; later refetches don't overwrite unsaved edits.
  useEffect(() => {
    if (data && !localPolicies) setLocalPolicies(data.policies);
  }, [data, localPolicies]);

  const isLoading = tenantLoading || policiesLoading || (!!tenantId && !isError && !localPolicies);
  const dirty = !!data && !!localPolicies && JSON.stringify(data.policies) !== JSON.stringify(localPolicies);

  const handleInputChange = (
    section: keyof Policies,
    field: string,
    value: string
  ) => {
    const numericValue = parseFloat(value);

    if (!isNaN(numericValue) && localPolicies) {
      setLocalPolicies({
        ...localPolicies,
        [section]: {
          ...localPolicies[section as keyof Policies],
          [field]: numericValue
        }
      });
    }
  };

  const handleSave = async () => {
    if (!tenantId || !localPolicies) return;
    setSaving(true);
    try {
      const saved = await savePolicies(tenantId, localPolicies);
      setLocalPolicies(saved.policies);
      queryClient.setQueryData(["tenant-admin", tenantId, "policies"], saved);
      // Fines on the overdue list depend on these numbers.
      queryClient.invalidateQueries({ queryKey: ["tenant-admin", tenantId, "overdue"] });
      toast({
        title: "Policies saved",
        description: "Fines on the overdue page now use these rates."
      });
    } catch (err: any) {
      toast({ title: "Couldn't save policies", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const numberField = (
    id: string,
    label: string,
    hint: string,
    section: keyof Policies,
    field: string,
    step?: string
  ) => (
    <FormField label={label} htmlFor={id} hint={hint}>
      <Input
        id={id}
        type="number"
        step={step}
        value={(localPolicies?.[section] as any)?.[field] ?? ''}
        onChange={(e) => handleInputChange(section, field, e.target.value)}
      />
    </FormField>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Admin"
        title="Borrowing policies"
        description="Configure borrowing limits, fines, and periods."
        actions={
          <>
            <Button onClick={handleSave} disabled={!dirty || saving || !tenantId}>
              <Icon name={saving ? "loader" : "save"} size={18} className={saving ? "animate-spin" : undefined} /> {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      />

      {!tenantLoading && !tenantId ? (
        <NoInstitution />
      ) : isError ? (
        <EmptyState
          icon="alert-circle"
          title="Couldn't load policies"
          description={(error as Error)?.message}
          action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>}
        />
      ) : isLoading || !localPolicies ? (
        <Skeleton className="h-96 rounded-[22px]" />
      ) : (
        <>
          <section className="rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6">
            <Accordion type="single" collapsible defaultValue="limits">
              <PolicySectionAccordion value="limits" title="Borrowing limits">
                <div className="grid gap-5 md:grid-cols-2">
                  {numberField("student-limit", "Student book limit", "Maximum number of books a student can borrow at once", "limits", "student")}
                  {numberField("teacher-limit", "Teacher book limit", "Maximum number of books a teacher can borrow at once", "limits", "teacher")}
                  {numberField("renewal-limit", "Maximum renewals", "Maximum number of times a book can be renewed", "limits", "maxRenewals")}
                </div>
              </PolicySectionAccordion>

              <PolicySectionAccordion value="fines" title="Fine rates">
                <div className="grid gap-5 md:grid-cols-3">
                  {numberField("daily-rate", "Daily fine rate ($)", "Fine charged per day for overdue items", "fines", "dailyRate", "0.01")}
                  {numberField("grace-period", "Grace period (days)", "Days before fines begin to accrue", "fines", "gracePeriod")}
                  {numberField("max-fine", "Maximum fine ($)", "Maximum fine amount per item", "fines", "maxFine", "0.01")}
                </div>

                <div className="mt-6">
                  <label htmlFor="days-overdue" className="text-[13px] font-semibold">
                    Simulate days overdue: <span className="tabular-nums">{daysOverdue}</span>
                  </label>
                  <input
                    id="days-overdue"
                    type="range"
                    min="0"
                    max="30"
                    value={daysOverdue}
                    onChange={(e) => setDaysOverdue(parseInt(e.target.value))}
                    className="mt-2 w-full accent-[var(--bb-accent)]"
                  />
                </div>

                <RateCalculator
                  dailyRate={localPolicies.fines.dailyRate}
                  days={daysOverdue}
                  gracePeriod={localPolicies.fines.gracePeriod}
                  maxFine={localPolicies.fines.maxFine}
                />
              </PolicySectionAccordion>

              <PolicySectionAccordion value="periods" title="Borrowing periods">
                <div className="grid gap-5 md:grid-cols-3">
                  {numberField("book-period", "Physical books (days)", "Standard borrowing period for physical books", "periods", "book")}
                  {numberField("ebook-period", "E-books (days)", "Standard borrowing period for e-books", "periods", "ebook")}
                  {numberField("audiobook-period", "Audiobooks (days)", "Standard borrowing period for audiobooks", "periods", "audiobook")}
                </div>
              </PolicySectionAccordion>
            </Accordion>

            <ComplianceChecker policies={localPolicies} />
          </section>
        </>
      )}
    </div>
  );
}
