'use client';

import { useState, useEffect } from "react";
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle, EnhancedCardFooter } from "@/components/ui/enhanced-card";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { useAdminState } from "@/hooks/use-admin-state";
import { LoadingSkeleton } from "@/components/admin/shared/Skeleton";
import {
  Download, FileSpreadsheet, FileText, Calendar,
  BookOpen, UserCheck, Printer, BarChart3, TrendingUp
} from "@/components/ui/icons";
import { useToast } from "@/components/ui/use-toast";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

// Mock report templates
const reportTemplates = [
  {
    id: 1,
    name: "Circulation Summary",
    description: "Overview of all borrowing activity",
    icon: <BookOpen className="h-8 w-8 text-blue-500" />,
    type: "circulation"
  },
  {
    id: 2,
    name: "User Activity",
    description: "User registration and engagement metrics",
    icon: <UserCheck className="h-8 w-8 text-green-500" />,
    type: "users"
  },
  {
    id: 3,
    name: "Overdue Items",
    description: "List of all currently overdue materials",
    icon: <Calendar className="h-8 w-8 text-amber-500" />,
    type: "overdue"
  },
  {
    id: 4,
    name: "Fine Collections",
    description: "Summary of fines issued and collected",
    icon: <BarChart3 className="h-8 w-8 text-purple-500" />,
    type: "fines"
  }
];

// Mock reports generated
const recentReports = [
  {
    id: 1,
    name: "Monthly Circulation - March 2023",
    type: "circulation",
    format: "PDF",
    generatedAt: "2023-04-01T10:23:45Z",
    size: "1.2 MB"
  },
  {
    id: 2,
    name: "User Activity Q1 2023",
    type: "users",
    format: "Excel",
    generatedAt: "2023-04-02T14:15:30Z",
    size: "3.4 MB"
  },
  {
    id: 3,
    name: "Overdue Report - March 28, 2023",
    type: "overdue",
    format: "PDF",
    generatedAt: "2023-03-28T09:10:22Z",
    size: "0.9 MB"
  }
];

// Format date string
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Report Templates Component
const ReportTemplateGrid = ({ templates, onSelect }: {
  templates: typeof reportTemplates,
  onSelect: (template: any) => void
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {templates.map((template) => (
        <EnhancedCard
          key={template.id}
          variant="elevated"
          interactive={true}
          className="cursor-pointer"
          onClick={() => onSelect(template)}
        >
          <EnhancedCardContent className="p-6 flex flex-col items-center text-center">
            <div className="p-3 rounded-vg-lg bg-gradient-to-br from-vg-primary-50 to-vg-sanskrit-50 dark:from-vg-primary-900/20 dark:to-vg-sanskrit-900/20">
              {template.icon}
            </div>
            <h3 className="font-semibold text-lg mt-4 bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
              {template.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {template.description}
            </p>
          </EnhancedCardContent>
        </EnhancedCard>
      ))}
    </div>
  );
};

// Report Generation Form Component
const ReportGenerationForm = ({ template, onGenerate, onCancel }: {
  template: typeof reportTemplates[0],
  onGenerate: (formData: any) => void,
  onCancel: () => void
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
      ...(isCustomRange && { 
        startDate: customStartDate,
        endDate: customEndDate
      })
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          {template.icon}
          <span className="ml-2">{template.name} Report</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="format">Report Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="format" className="w-full mt-1">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                <SelectItem value="csv">CSV File</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="date-range">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="date-range" className="w-full mt-1">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
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
          </div>
          
          {isCustomRange && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  className="mt-1"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  required={isCustomRange}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  className="mt-1"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  required={isCustomRange}
                />
              </div>
            </div>
          )}
          
          {template.type === "users" && (
            <div>
              <Label htmlFor="user-segments">User Segments</Label>
              <Select defaultValue="all">
                <SelectTrigger id="user-segments" className="w-full mt-1">
                  <SelectValue placeholder="Select user segments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value= "ACTIVE">Active Users</SelectItem>
                  <SelectItem value= "INACTIVE">Inactive Users</SelectItem>
                  <SelectItem value="new">New Registrations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {template.type === "circulation" && (
            <div>
              <Label htmlFor="material-type">Material Type</Label>
              <Select defaultValue="all">
                <SelectTrigger id="material-type" className="w-full mt-1">
                  <SelectValue placeholder="Select material type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  <SelectItem value="books">Physical Books</SelectItem>
                  <SelectItem value="ebooks">E-Books</SelectItem>
                  <SelectItem value="audiobooks">Audiobooks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="flex items-center">
          <Printer className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </CardFooter>
    </Card>
  );
};

// Recent Reports Table Component
const RecentReportsTable = ({ reports, onDownload }: {
  reports: typeof recentReports,
  onDownload: (report: any) => void
}) => {
  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No reports have been generated yet
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Report Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Generated</TableHead>
            <TableHead>Size</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">{report.name}</TableCell>
              <TableCell>
                <span className="capitalize">{report.type}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  {report.format === "Excel" ? (
                    <FileSpreadsheet className="h-4 w-4 mr-1.5 text-green-600" />
                  ) : (
                    <FileText className="h-4 w-4 mr-1.5 text-blue-600" />
                  )}
                  {report.format}
                </div>
              </TableCell>
              <TableCell>{formatDate(report.generatedAt)}</TableCell>
              <TableCell>{report.size}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload(report)}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Download</span>
                  <Download className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof reportTemplates[0] | null>(null);
  const [reports, setReports] = useState<typeof recentReports>([]);
  const { toast } = useToast();
  
  // Simulate loading data from API
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setReports(recentReports);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleSelectTemplate = (template: typeof reportTemplates[0]) => {
    setSelectedTemplate(template);
  };
  
  const handleCancelReport = () => {
    setSelectedTemplate(null);
  };
  
  const handleGenerateReport = (formData: any) => {
    // Simulate report generation
    const template = reportTemplates.find(t => t.id === formData.templateId);
    if (!template) return;
    
    toast({
      title: "Report Generation Started",
      description: `Your ${template.name} report is being generated.`
    });
    
    // Simulate delay and then add to reports
    setTimeout(() => {
      const newReport = {
        id: Date.now(),
        name: `${template.name} - ${new Date().toLocaleDateString()}`,
        type: template.type,
        format: formData.format === 'excel' ? 'Excel' : 'PDF',
        generatedAt: new Date().toISOString(),
        size: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`
      };
      
      setReports([newReport, ...reports]);
      
      toast({
        title: "Report Generated",
        description: `Your ${template.name} report is ready to download.`
      });
      
      setSelectedTemplate(null);
    }, 2500);
  };
  
  const handleDownloadReport = (report: typeof recentReports[0]) => {
    toast({
      title: "Download Started",
      description: `Downloading ${report.name}...`
    });
  };

  return (
    <div className="p-6 space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
          <BarChart3 className="h-10 w-10 text-blue-700 dark:text-blue-500" />
          Reports
        </h1>
        <p className="text-muted-foreground text-lg">
          Generate and manage library management system reports
        </p>
      </div>

      <LoadingSkeleton loading={isLoading}>
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Report Templates"
            value={reportTemplates.length.toString()}
            description="Available report types"
            icon={FileText}
            iconColor="text-blue-700 dark:text-blue-500"
            iconBgColor="bg-blue-50 dark:bg-blue-900/20"
            variant="primary"
          />
          <StatCard
            title="Generated Reports"
            value={reports.length.toString()}
            description="Total reports created"
            icon={FileSpreadsheet}
            iconColor="text-vg-success-600"
            iconBgColor="bg-vg-success-50 dark:bg-vg-success-900/20"
            variant="success"
          />
          <StatCard
            title="This Month"
            value={reports.filter(r => new Date(r.generatedAt).getMonth() === new Date().getMonth()).length.toString()}
            description="Reports generated this month"
            icon={TrendingUp}
            iconColor="text-teal-600 dark:text-teal-500"
            iconBgColor="bg-teal-50 dark:bg-teal-900/20"
            variant="cultural"
          />
        </div>

        <div className="space-y-8">
          {!selectedTemplate ? (
            <>
              <div>
                <h2 className="text-2xl font-semibold mb-6 bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                  Report Templates
                </h2>
                <ReportTemplateGrid
                  templates={reportTemplates}
                  onSelect={handleSelectTemplate}
                />
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-6 bg-gradient-to-r from-vg-success-600 to-vg-primary-600 bg-clip-text text-transparent">
                  Recent Reports
                </h2>
                <RecentReportsTable
                  reports={reports}
                  onDownload={handleDownloadReport}
                />
              </div>
            </>
          ) : (
            <ReportGenerationForm
              template={selectedTemplate}
              onGenerate={handleGenerateReport}
              onCancel={handleCancelReport}
            />
          )}
        </div>
      </LoadingSkeleton>
    </div>
  );
}
