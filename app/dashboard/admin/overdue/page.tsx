'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge, type BBStatus } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NoInstitution } from '@/components/admin/NoInstitution';
import { useAdminTenant } from '@/hooks/use-admin-tenant';
import { useAdminOverdue } from '@/hooks/use-admin-data';
import { sendOverdueReminders, type OverdueItem } from '@/lib/tenant-admin';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);

const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateString));
};

// Severity bands onto the design-system statuses.
const severity = (days: number): { status: BBStatus; label: string } =>
  days <= 3
    ? { status: 'due-soon', label: 'Recent' }
    : days <= 7
      ? { status: 'due-soon', label: 'Moderate' }
      : days <= 14
        ? { status: 'overdue', label: 'Significant' }
        : { status: 'overdue', label: 'Severe' };

const SORTERS: Record<string, (a: OverdueItem, b: OverdueItem) => number> = {
  daysOverdue: (a, b) => b.daysOverdue - a.daysOverdue,
  fine: (a, b) => b.fine - a.fine,
  borrower: (a, b) => a.borrower.name.localeCompare(b.borrower.name),
  title: (a, b) => a.title.localeCompare(b.title),
};

export default function OverduePage() {
  const { tenantId, loading: tenantLoading } = useAdminTenant();
  const { data, isLoading, isError, error, refetch } = useAdminOverdue();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("daysOverdue");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const overdueItems = data?.items ?? [];
  const summary = data?.summary;

  const tabFiltered = (() => {
    switch (activeTab) {
      case "recent":
        return overdueItems.filter(item => item.daysOverdue <= 7);
      case "severe":
        return overdueItems.filter(item => item.daysOverdue > 7);
      case "noreminder":
        return overdueItems.filter(item => item.remindersSent === 0);
      default:
        return overdueItems;
    }
  })();
  const filteredItems = [...tabFiltered].sort(SORTERS[sortBy] ?? SORTERS.daysOverdue);

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const allSelected = filteredItems.length > 0 && filteredItems.every(item => selectedItems.includes(item.id));
  const toggleSelectAll = () => {
    setSelectedItems(allSelected ? [] : filteredItems.map(item => item.id));
  };

  const sendReminders = async () => {
    if (!tenantId) return;
    setIsSendingReminders(true);
    try {
      const result = await sendOverdueReminders(tenantId, selectedItems);
      const parts = [
        result.sent > 0 && `${result.sent} sent`,
        result.skipped.length > 0 && `${result.skipped.length} skipped (${result.skipped[0].reason.toLowerCase()})`,
        result.failed.length > 0 && `${result.failed.length} failed to send`,
      ].filter(Boolean);
      toast({
        title: result.sent > 0 ? "Reminders sent" : "No reminders sent",
        description: parts.join(", "),
        variant: result.sent === 0 && result.failed.length > 0 ? "destructive" : undefined,
      });
      setSelectedItems([]);
      setReminderDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["tenant-admin", tenantId, "overdue"] });
    } catch (err: any) {
      toast({ title: "Couldn't send reminders", description: err?.message, variant: "destructive" });
    } finally {
      setIsSendingReminders(false);
    }
  };

  const columns: DataColumn<OverdueItem>[] = [
    {
      key: 'select',
      header: <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />,
      cell: (item) => (
        <Checkbox
          checked={selectedItems.includes(item.id)}
          onCheckedChange={() => toggleSelection(item.id)}
          aria-label={`Select ${item.title}`}
        />
      ),
      className: 'w-12',
    },
    { key: 'title', header: 'Title', cell: (item) => <span className="font-semibold">{item.title}</span> },
    {
      key: 'student',
      header: 'Borrower',
      cell: (item) => (
        <>
          <div>{item.borrower.name}</div>
          <div className="text-xs text-bb-muted">{item.borrower.email}</div>
        </>
      ),
    },
    { key: 'due', header: 'Due date', cell: (item) => formatDate(item.dueDate), className: 'whitespace-nowrap text-bb-muted' },
    { key: 'days', header: 'Days overdue', cell: (item) => <span className="tabular-nums">{item.daysOverdue}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => {
        const s = severity(item.daysOverdue);
        return <StatusBadge status={s.status} label={s.label} />;
      },
    },
    { key: 'fine', header: 'Fine', cell: (item) => <span className="tabular-nums">{formatCurrency(item.fine)}</span> },
    { key: 'reminders', header: 'Reminders', cell: (item) => <span className="tabular-nums">{item.remindersSent}</span> },
    { key: 'last', header: 'Last reminder', cell: (item) => formatDate(item.lastReminderAt), className: 'whitespace-nowrap text-bb-muted' },
  ];

  const header = (
    <PageHeader
      className="mb-0"
      eyebrow="Admin"
      title="Overdue management"
      description="Track overdue items and email reminders to borrowers."
    />
  );

  if (!tenantLoading && !tenantId) {
    return (
      <div className="space-y-8">
        {header}
        <NoInstitution />
      </div>
    );
  }

  const loading = tenantLoading || isLoading;
  const selectedRows = overdueItems.filter(item => selectedItems.includes(item.id));

  return (
    <div className="space-y-8">
      {header}

      {isError ? (
        <EmptyState
          icon="alert-circle"
          title="Couldn't load overdue items"
          description={(error as Error)?.message}
          action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard variant="featured" title="Total overdue items" value={summary?.count ?? 0} description="Across all borrowers" icon="overdue" loading={loading} />
            <StatCard title="Total fines accrued" value={formatCurrency(summary?.totalFines ?? 0)} description="Under your fine policy" icon="subscription" loading={loading} />
            <StatCard title="Average days overdue" value={summary?.averageDaysOverdue ?? 0} description="Days past due date" icon="calendar" loading={loading} />
            <StatCard title="No reminders sent" value={summary?.withoutReminders ?? 0} description="Items needing attention" icon="mail" loading={loading} />
          </div>

          {data?.truncated && (
            <p role="status" className="rounded-xl bg-bb-warning-soft px-4 py-3 text-sm text-bb-warning-ink">
              Showing the {overdueItems.length} longest-overdue items. Resolve some to see the rest.
            </p>
          )}

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedItems([]); }} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="all">All overdue</TabsTrigger>
                <TabsTrigger value="recent">Recent (≤7 days)</TabsTrigger>
                <TabsTrigger value="severe">Severe (&gt;7 days)</TabsTrigger>
                <TabsTrigger value="noreminder">No reminders</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48" aria-label="Sort by">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daysOverdue">Days overdue</SelectItem>
                  <SelectItem value="fine">Fine amount</SelectItem>
                  <SelectItem value="borrower">Borrower name</SelectItem>
                  <SelectItem value="title">Book title</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" disabled={selectedItems.length === 0} onClick={() => setReminderDialogOpen(true)}>
                <Icon name="send" size={16} /> Send reminders{selectedItems.length > 0 ? ` (${selectedItems.length})` : ''}
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={filteredItems}
            rowKey={(item) => item.id}
            loading={loading}
            emptyIcon="check-circle"
            emptyTitle={overdueItems.length === 0 ? "Nothing is overdue" : "No overdue items found"}
            emptyDescription={overdueItems.length === 0 ? "Every loan is on time." : "Nothing matches this filter."}
          />
        </>
      )}

      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send overdue reminders</DialogTitle>
            <DialogDescription>
              This emails {selectedRows.length} borrower(s) about the items below. Anyone reminded in the last 24 hours is skipped.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm">
            {selectedRows.map(item => (
              <li key={item.id} className="flex items-center gap-2">
                <Icon name="read" size={16} />
                {item.title} <span className="text-bb-muted">({item.borrower.name})</span>
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendReminders} disabled={isSendingReminders}>
              {isSendingReminders ? (
                <>
                  <Icon name="loader" size={16} className="animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Icon name="send" size={16} /> Send reminders
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
