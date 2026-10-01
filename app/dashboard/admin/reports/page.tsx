'use client';

import { useState, useEffect } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { FormField } from "@/components/ui/form-field";
import { Icon, type BBIconName } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/use-toast";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";

interface ReportTemplate {
  id: number;
  name: string;
  description: string;
  icon: BBIconName;
  type: string;
}

interface GeneratedReport {
  id: number;
  name: string;
  type: string;
  format: string;
  generatedAt: string;
  size: string;
}

// Report templates
const reportTemplates: ReportTemplate[] = [
  { id: 1, name: "Circulation Summary", description: "Overview of all borrowing activity", icon: "library", type: "circulation" },
  { id: 2, name: "User Activity", description: "User registration and engagement metrics", icon: "user-check", type: "users" },
  { id: 3, name: "Overdue Items", description: "List of all currently overdue materials", icon: "overdue", type: "overdue" },
  { id: 4, name: "Fine Collections", description: "Summary of fines issued and collected", icon: "analytics", type: "fines" },
];

// Sample reports. No report-generation backend exists yet.
const recentReports: GeneratedReport[] = [
  { id: 1, name: "Monthly Circulation - March 2023", type: "circulation", format: "PDF", generatedAt: "2023-04-01T10:23:45Z", size: "1.2 MB" },
  { id: 2, name: "User Activity Q1 2023", type: "users", format: "Excel", generatedAt: "2023-04-02T14:15:30Z", size: "3.4 MB" },
  { id: 3, name: "Overdue Report - March 28, 2023", type: "overdue", format: "PDF", generatedAt: "2023-03-28T09:10:22Z", size: "0.9 MB" },
];

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(dateString));

const ReportTemplateGrid = ({ templates, onSelect }: {
  templates: ReportTemplate[];
  onSelect: (template: ReportTemplate) => void;
}) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    {templates.map((template) => (
      <button
        key={template.id}
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

const ReportGenerationForm = ({ template, onGenerate, onCancel }: {
  template: ReportTemplate;
  onGenerate: (formData: any) => void;
  onCancel: () => void;
}) => {
  const [format, setFormat] = useState("pdf");
  const [dateRange, setDateRange] = useState("last-30");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const isCustomRange = dateRange === "custom";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      templateId: template.id,
      format,
      dateRange,
      ...(isCustomRange && { startDate: customStartDate, endDate: customEndDate })
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6">
      <h2 className="flex items-center gap-3 font-display text-xl font-extrabold tracking-[-0.02em]">
        <Icon name={template.icon} size={26} /> {template.name} report
      </h2>

      <FormField label="Report format" htmlFor="format">
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger id="format"><SelectValue placeholder="Select format" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF document</SelectItem>
            <SelectItem value="excel">Excel spreadsheet</SelectItem>
            <SelectItem value="csv">CSV file</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

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
          <FormField label="Start date" htmlFor="start-date">
            <Input id="start-date" type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} required />
          </FormField>
          <FormField label="End date" htmlFor="end-date">
            <Input id="end-date" type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} required />
          </FormField>
        </div>
      )}

      {template.type === "users" && (
        <FormField label="User segments" htmlFor="user-segments">
          <Select defaultValue="all">
            <SelectTrigger id="user-segments"><SelectValue placeholder="Select user segments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              <SelectItem value="ACTIVE">Active users</SelectItem>
              <SelectItem value="INACTIVE">Inactive users</SelectItem>
              <SelectItem value="new">New registrations</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      )}

      {template.type === "circulation" && (
        <FormField label="Material type" htmlFor="material-type">
          <Select defaultValue="all">
            <SelectTrigger id="material-type"><SelectValue placeholder="Select material type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All materials</SelectItem>
              <SelectItem value="books">Physical books</SelectItem>
              <SelectItem value="ebooks">E-books</SelectItem>
              <SelectItem value="audiobooks">Audiobooks</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      )}

      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          <Icon name="printer" size={18} /> Generate report
        </Button>
      </div>
    </form>
  );
};

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const { toast } = useToast();

  // Simulate loading data from API
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setReports(recentReports);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleGenerateReport = (formData: any) => {
    const template = reportTemplates.find(t => t.id === formData.templateId);
    if (!template) return;

    toast({
      title: "Generating sample report",
      description: `${template.name}: this adds a sample row. No file is produced.`
    });

    // Simulate delay and then add to reports
    setTimeout(() => {
      const newReport: GeneratedReport = {
        id: Date.now(),
        name: `${template.name} - ${new Date().toLocaleDateString()}`,
        type: template.type,
        format: formData.format === 'excel' ? 'Excel' : 'PDF',
        generatedAt: new Date().toISOString(),
        size: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`
      };

      setReports((prev) => [newReport, ...prev]);
      toast({ title: "Sample report added", description: `${template.name} now appears under recent reports.` });
      setSelectedTemplate(null);
    }, 2500);
  };

  const handleDownloadReport = (report: GeneratedReport) => {
    toast({
      title: "Nothing to download yet",
      description: `${report.name} is a sample entry. Report files aren't generated yet.`
    });
  };

  const columns: DataColumn<GeneratedReport>[] = [
    { key: "name", header: "Report name", cell: (r) => <span className="font-semibold">{r.name}</span> },
    { key: "type", header: "Type", cell: (r) => <span className="capitalize">{r.type}</span> },
    {
      key: "format",
      header: "Format",
      cell: (r) => <Chip icon={r.format === "Excel" ? "analytics" : "pdf"}>{r.format}</Chip>,
    },
    { key: "generated", header: "Generated", cell: (r) => formatDate(r.generatedAt), className: "whitespace-nowrap text-bb-muted" },
    { key: "size", header: "Size", cell: (r) => r.size, className: "whitespace-nowrap text-bb-muted" },
  ];

  const thisMonth = reports.filter(r => new Date(r.generatedAt).getMonth() === new Date().getMonth()).length;

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Admin"
        title="Reports"
        description="Generate and manage library management system reports."
        actions={<Chip icon="info">Sample data</Chip>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard variant="featured" title="Report templates" value={reportTemplates.length} description="Available report types" icon="pdf" loading={isLoading} />
        <StatCard title="Generated reports" value={reports.length} description="Total reports created" icon="analytics" loading={isLoading} />
        <StatCard title="This month" value={thisMonth} description="Reports generated this month" icon="calendar" loading={isLoading} />
      </div>

      {!selectedTemplate ? (
        <>
          <section className="space-y-4">
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Report templates</h2>
            <ReportTemplateGrid templates={reportTemplates} onSelect={setSelectedTemplate} />
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Recent reports</h2>
            <DataTable
              columns={columns}
              rows={reports}
              rowKey={(r) => r.id}
              loading={isLoading}
              emptyIcon="pdf"
              emptyTitle="No reports generated yet"
              emptyDescription="Pick a template above to generate your first report."
              actionsHeader="Actions"
              renderActions={(r) => <button onClick={() => handleDownloadReport(r)}>Download</button>}
            />
          </section>
        </>
      ) : (
        <ReportGenerationForm
          template={selectedTemplate}
          onGenerate={handleGenerateReport}
          onCancel={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}
