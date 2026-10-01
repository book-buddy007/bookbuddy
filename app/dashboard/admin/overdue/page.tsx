'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
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

// Sample overdue items. There is no overdue endpoint behind this page yet.
const mockOverdueItems = [
  {
    id: 1,
    title: "The Great Gatsby",
    student: "Emily Davis",
    email: "e.davis@example.edu",
    dueDate: "2023-04-10",
    daysOverdue: 15,
    fine: 7.50,
    remindersSent: 2,
    lastReminder: "2023-04-17"
  },
  {
    id: 2,
    title: "To Kill a Mockingbird",
    student: "James Wilson",
    email: "jwilson@example.edu",
    dueDate: "2023-04-15",
    daysOverdue: 10,
    fine: 5.00,
    remindersSent: 1,
    lastReminder: "2023-04-18"
  },
  {
    id: 3,
    title: "1984",
    student: "Sophia Martinez",
    email: "smartinez@example.edu",
    dueDate: "2023-04-18",
    daysOverdue: 7,
    fine: 3.50,
    remindersSent: 1,
    lastReminder: "2023-04-20"
  },
  {
    id: 4,
    title: "Pride and Prejudice",
    student: "Alex Johnson",
    email: "ajohnson@example.edu",
    dueDate: "2023-04-20",
    daysOverdue: 5,
    fine: 2.50,
    remindersSent: 0,
    lastReminder: null
  },
  {
    id: 5,
    title: "The Catcher in the Rye",
    student: "Lisa Wang",
    email: "lwang@example.edu",
    dueDate: "2023-04-21",
    daysOverdue: 4,
    fine: 2.00,
    remindersSent: 0,
    lastReminder: null
  }
];

type OverdueItem = (typeof mockOverdueItems)[number];

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
  borrower: (a, b) => a.student.localeCompare(b.student),
  title: (a, b) => a.title.localeCompare(b.title),
};

export default function OverduePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("daysOverdue");
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const { toast } = useToast();

  // Stats for the dashboard
  const totalOverdue = overdueItems.length;
  const totalFines = overdueItems.reduce((sum, item) => sum + item.fine, 0);
  const avgDaysOverdue = totalOverdue
    ? Math.round(overdueItems.reduce((sum, item) => sum + item.daysOverdue, 0) / totalOverdue)
    : 0;
  const noReminderCount = overdueItems.filter(item => item.remindersSent === 0).length;

  // Simulate loading data from API
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setOverdueItems(mockOverdueItems);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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

  const toggleSelection = (id: number) => {
    setSelectedItems(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const allSelected = selectedItems.length === filteredItems.length && filteredItems.length > 0;
  const toggleSelectAll = () => {
    setSelectedItems(allSelected ? [] : filteredItems.map(item => item.id));
  };

  // Send reminders to selected items (simulated)
  const sendReminders = () => {
    setIsSendingReminders(true);

    setTimeout(() => {
      setOverdueItems(overdueItems.map(item =>
        selectedItems.includes(item.id)
          ? { ...item, remindersSent: item.remindersSent + 1, lastReminder: new Date().toISOString().split('T')[0] }
          : item
      ));
      setSelectedItems([]);
      setIsSendingReminders(false);
      setReminderDialogOpen(false);

      toast({
        title: "Reminders recorded (sample)",
        description: `${selectedItems.length} reminder(s) were marked as sent in this sample view. No email was sent.`
      });
    }, 1500);
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
      header: 'Student',
      cell: (item) => (
        <>
          <div>{item.student}</div>
          <div className="text-xs text-bb-muted">{item.email}</div>
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
    { key: 'last', header: 'Last reminder', cell: (item) => formatDate(item.lastReminder), className: 'whitespace-nowrap text-bb-muted' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Admin"
        title="Overdue management"
        description="Track and manage overdue items and send reminders."
        actions={<Chip icon="info">Sample data</Chip>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard variant="featured" title="Total overdue items" value={totalOverdue} description="Across all borrowers" icon="overdue" loading={isLoading} />
        <StatCard title="Total fines accrued" value={formatCurrency(totalFines)} description="Outstanding fines" icon="subscription" loading={isLoading} />
        <StatCard title="Average days overdue" value={avgDaysOverdue} description="Days past due date" icon="calendar" loading={isLoading} />
        <StatCard title="No reminders sent" value={noReminderCount} description="Items needing attention" icon="mail" loading={isLoading} />
      </div>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
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
        loading={isLoading}
        emptyIcon="check-circle"
        emptyTitle="No overdue items found"
        emptyDescription="Nothing matches this filter."
      />

      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send overdue reminders</DialogTitle>
            <DialogDescription>
              This sample view will mark reminders as sent for {selectedItems.length} student(s). No email is delivered.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5 text-sm">
            {overdueItems
              .filter(item => selectedItems.includes(item.id))
              .map(item => (
                <li key={item.id} className="flex items-center gap-2">
                  <Icon name="read" size={16} />
                  {item.title} <span className="text-bb-muted">({item.student})</span>
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
