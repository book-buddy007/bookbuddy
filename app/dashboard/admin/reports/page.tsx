'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Icon, type BBIconName } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/use-toast";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import { NoInstitution } from "@/components/admin/NoInstitution";
import { useAdminTenant } from "@/hooks/use-admin-tenant";
import { downloadReport, type ReportType } from "@/lib/tenant-admin";

interface ReportTemplate {
  type: ReportType;
  name: string;
  description: string;
  icon: BBIconName;
  /** Only circulation is about a period; the others are a snapshot of right now. */
  usesDateRange: boolean;
}

const reportTemplates: ReportTemplate[] = [
  { type: "circulation", name: "Circulation", description: "Every loan borrowed in the period you choose", icon: "library", usesDateRange: true },
  { type: "users", name: "Members", description: "Everyone in your institution with role, status and last sign-in", icon: "user-check", usesDateRange: false },
  { type: "overdue", name: "Overdue items", description: "Everything overdue right now, with fines and reminders sent", icon: "overdue", usesDateRange: false },
  { type: "fines", name: "Fines accrued", description: "Fines accrued on overdue items under your fine policy", icon: "analytics", usesDateRange: false },
];

/** YYYY-MM-DD for a local calendar date (not UTC, so "today" is the admin's today). */
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Resolves a preset to inclusive from/to dates. */
function presetRange(preset: string, today = new Date()): { from: string; to: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (preset) {
    case "today": return { from: ymd(today), to: ymd(today) };
    case "yesterday": return { from: ymd(addDays(today, -1)), to: ymd(addDays(today, -1)) };
    case "last-7": return { from: ymd(addDays(today, -6)), to: ymd(today) };
    case "this-month": return { from: ymd(new Date(y, m, 1)), to: ymd(today) };
    case "last-month": return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    case "this-quarter": return { from: ymd(new Date(y, Math.floor(m / 3) * 3, 1)), to: ymd(today) };
    case "this-year": return { from: ymd(new Date(y, 0, 1)), to: ymd(today) };
    default: return { from: ymd(addDays(today, -29)), to: ymd(today) }; // last-30
  }
}

const ReportTemplateGrid = ({ templates, onSelect }: {
  templates: ReportTemplate[];
  onSelect: (template: ReportTemplate) => void;
}) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    {templates.map((template) => (
      <button
        key={template.type}
        type="button"
        onClick={() => onSelect(template)}
        className="bb-lift flex flex-col items-center rounded-[18px] bg-bb-surface p-6 text-center shadow-e1 focus-visible:outline-none focus-visible:shadow-focus"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-bb-accent-soft">
          <Icon name={template.icon} size={28} />
        </span>
        <h3 className="mt-4 text-base font-semibold">{template.name}</h3>
        <p className="mt-1.5 text-[13px] text-bb-muted">{template.description}</p>
      </button>
    ))}
  </div>
);

const ReportGenerationForm = ({ template, generating, onGenerate, onCancel }: {
  template: ReportTemplate;
  generating: boolean;
  onGenerate: (range?: { from: string; to: string }) => void;
  onCancel: () => void;
}) => {
  const [dateRange, setDateRange] = useState("last-30");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const isCustomRange = dateRange === "custom";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!template.usesDateRange) return onGenerate();
    onGenerate(isCustomRange ? { from: customStartDate, to: customEndDate } : presetRange(dateRange));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6">
      <h2 className="flex items-center gap-3 font-display text-xl font-extrabold tracking-[-0.02em]">
        <Icon name={template.icon} size={26} /> {template.name} report
      </h2>

      <p className="text-sm text-bb-muted">
        Downloads as a CSV file, which opens in Excel, Numbers and Google Sheets.
      </p>

      {template.usesDateRange ? (
        <>
          <FormField label="Date range" htmlFor="date-range">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="date-range"><SelectValue placeholder="Select date range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last-7">Last 7 days</SelectItem>
                <SelectItem value="last-30">Last 30 days</SelectItem>
                <SelectItem value="this-month">This month</SelectItem>
                <SelectItem value="last-month">Last month</SelectItem>
                <SelectItem value="this-quarter">This quarter</SelectItem>
                <SelectItem value="this-year">This year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {isCustomRange && (
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Start date" htmlFor="start-date" hint="At most one year">
                <Input id="start-date" type="date" value={customStartDate} max={customEndDate || undefined} onChange={(e) => setCustomStartDate(e.target.value)} required />
              </FormField>
              <FormField label="End date" htmlFor="end-date">
                <Input id="end-date" type="date" value={customEndDate} min={customStartDate || undefined} onChange={(e) => setCustomEndDate(e.target.value)} required />
              </FormField>
            </div>
          )}
        </>
      ) : (
        <p className="rounded-xl bg-bb-surface-2 px-4 py-3 text-sm">
          This report is a snapshot of your institution as it is right now.
        </p>
      )}

      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={generating}>
          Cancel
        </Button>
        <Button type="submit" disabled={generating}>
          <Icon name={generating ? "loader" : "download"} size={18} className={generating ? "animate-spin" : undefined} />
          {generating ? "Preparing…" : "Download report"}
        </Button>
      </div>
    </form>
  );
};

export default function ReportsPage() {
  const { tenantId, loading: tenantLoading } = useAdminTenant();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (range?: { from: string; to: string }) => {
    if (!tenantId || !selectedTemplate) return;
    setGenerating(true);
    try {
      const filename = await downloadReport(tenantId, selectedTemplate.type, range);
      toast({ title: "Report downloaded", description: filename });
      setSelectedTemplate(null);
    } catch (err: any) {
      toast({ title: "Couldn't generate the report", description: err?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Admin"
        title="Reports"
        description="Download circulation, member, overdue and fine reports for your institution."
      />

      {!tenantLoading && !tenantId ? (
        <NoInstitution />
      ) : !selectedTemplate ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Choose a report</h2>
          <ReportTemplateGrid templates={reportTemplates} onSelect={setSelectedTemplate} />
        </section>
      ) : (
        <ReportGenerationForm
          template={selectedTemplate}
          generating={generating}
          onGenerate={handleGenerate}
          onCancel={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}
