'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge, type BBStatus } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DAY = 24 * 60 * 60 * 1000;

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);

interface Loan {
  id: string;
  title: string;
  borrower: string;
  borrowerType: string;
  borrowDate: Date;
  dueDate: Date;
  status: "borrowed" | "overdue" | "returned";
}

interface ReturnRow {
  id: string;
  title: string;
  borrower: string;
  borrowerType: string;
  returnDate: Date;
  status: "good" | "damaged";
}

interface BorrowRequest {
  id: string;
  title: string;
  requester: string;
  requesterType: string;
  requestDate: Date;
  status: "PENDING" | "APPROVED" | "REJECTED";
  priority: "normal" | "high";
}

// Sample circulation data. There is no circulation endpoint behind this page yet.
const initialLoans: Loan[] = [
  { id: "1", title: "To Kill a Mockingbird", borrower: "Alex Johnson", borrowerType: "Student", borrowDate: new Date(2023, 8, 15), dueDate: new Date(2023, 9, 15), status: "overdue" },
  { id: "2", title: "1984", borrower: "Jamie Smith", borrowerType: "Teacher", borrowDate: new Date(2023, 8, 20), dueDate: new Date(2023, 9, 20), status: "borrowed" },
  { id: "3", title: "The Great Gatsby", borrower: "Chris Wong", borrowerType: "Student", borrowDate: new Date(2023, 8, 25), dueDate: new Date(2023, 9, 25), status: "borrowed" },
  { id: "4", title: "Pride and Prejudice", borrower: "Taylor Reed", borrowerType: "Student", borrowDate: new Date(2023, 8, 10), dueDate: new Date(2023, 9, 10), status: "overdue" },
];

const initialReturns: ReturnRow[] = [
  { id: "5", title: "The Hobbit", borrower: "Jordan Lee", borrowerType: "Teacher", returnDate: new Date(2023, 9, 2), status: "good" },
  { id: "6", title: "Lord of the Flies", borrower: "Riley Taylor", borrowerType: "Student", returnDate: new Date(2023, 9, 1), status: "damaged" },
  { id: "7", title: "Brave New World", borrower: "Casey Martin", borrowerType: "Teacher", returnDate: new Date(2023, 8, 30), status: "good" },
];

const initialRequests: BorrowRequest[] = [
  { id: "BR1", title: "The Catcher in the Rye", requester: "David Miller", requesterType: "Student", requestDate: new Date(2023, 9, 1), status: "PENDING", priority: "normal" },
  { id: "BR2", title: "The Alchemist", requester: "Sarah Chen", requesterType: "Teacher", requestDate: new Date(2023, 9, 2), status: "PENDING", priority: "high" },
  { id: "BR3", title: "The Silent Patient", requester: "Michael Brown", requesterType: "Student", requestDate: new Date(2023, 9, 2), status: "APPROVED", priority: "normal" },
  { id: "BR4", title: "Educated", requester: "Emma Wilson", requesterType: "Student", requestDate: new Date(2023, 9, 3), status: "REJECTED", priority: "normal" },
];

const LOAN_BADGE: Record<Loan["status"], { status: BBStatus; label: string }> = {
  borrowed: { status: "pending", label: "Borrowed" },
  overdue: { status: "overdue", label: "Overdue" },
  returned: { status: "returned", label: "Returned" },
};

const REQUEST_BADGE: Record<BorrowRequest["status"], { status: BBStatus; label: string }> = {
  PENDING: { status: "pending", label: "Pending" },
  APPROVED: { status: "returned", label: "Approved" },
  REJECTED: { status: "overdue", label: "Rejected" },
};

const Person = ({ name, type }: { name: string; type: string }) => (
  <>
    <div>{name}</div>
    <div className="text-xs text-bb-muted">{type}</div>
  </>
);

const CirculationPage = () => {
  const { toast } = useToast();
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [returns, setReturns] = useState<ReturnRow[]>(initialReturns);
  const [requests, setRequests] = useState<BorrowRequest[]>(initialRequests);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const comingSoon = (what: string) =>
    toast({ title: "Coming soon", description: `${what} isn't available yet.` });

  const renew = (id: string) => {
    setLoans((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const dueDate = new Date(Math.max(l.dueDate.getTime(), Date.now()) + 14 * DAY);
        return { ...l, dueDate, status: "borrowed" };
      })
    );
    toast({ title: "Loan renewed (sample)", description: "Due date extended by 14 days." });
  };

  const returnLoan = (loan: Loan) => {
    setLoans((prev) => prev.filter((l) => l.id !== loan.id));
    setReturns((prev) => [
      { id: loan.id, title: loan.title, borrower: loan.borrower, borrowerType: loan.borrowerType, returnDate: new Date(), status: "good" },
      ...prev,
    ]);
    toast({ title: "Marked as returned (sample)", description: loan.title });
  };

  const decide = (id: string, status: "APPROVED" | "REJECTED") => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredLoans = loans.filter(
    (l) =>
      (statusFilter === "all" || l.status === statusFilter) &&
      (!q || l.title.toLowerCase().includes(q) || l.borrower.toLowerCase().includes(q) || l.id.toLowerCase().includes(q))
  );
  const filteredRequests = requests.filter(
    (r) =>
      (requestStatusFilter === "all" || r.status === requestStatusFilter) &&
      (priorityFilter === "all" || r.priority === priorityFilter)
  );

  const loanColumns: DataColumn<Loan>[] = [
    { key: "title", header: "Title", cell: (l) => <span className="font-semibold">{l.title}</span> },
    { key: "borrower", header: "Borrower", cell: (l) => <Person name={l.borrower} type={l.borrowerType} /> },
    { key: "borrowed", header: "Borrow date", cell: (l) => formatDate(l.borrowDate), className: "hidden whitespace-nowrap text-bb-muted md:table-cell" },
    { key: "due", header: "Due date", cell: (l) => formatDate(l.dueDate), className: "whitespace-nowrap text-bb-muted" },
    { key: "status", header: "Status", cell: (l) => <StatusBadge status={LOAN_BADGE[l.status].status} label={LOAN_BADGE[l.status].label} /> },
  ];

  const returnColumns: DataColumn<ReturnRow>[] = [
    { key: "title", header: "Title", cell: (r) => <span className="font-semibold">{r.title}</span> },
    { key: "borrower", header: "Borrower", cell: (r) => <Person name={r.borrower} type={r.borrowerType} /> },
    { key: "date", header: "Return date", cell: (r) => formatDate(r.returnDate), className: "whitespace-nowrap text-bb-muted" },
    {
      key: "condition",
      header: "Condition",
      cell: (r) => <StatusBadge status={r.status === "good" ? "returned" : "due-soon"} label={r.status === "good" ? "Good" : "Damaged"} />,
    },
  ];

  const requestColumns: DataColumn<BorrowRequest>[] = [
    { key: "title", header: "Title", cell: (r) => <span className="font-semibold">{r.title}</span> },
    { key: "requester", header: "Requester", cell: (r) => <Person name={r.requester} type={r.requesterType} /> },
    { key: "date", header: "Request date", cell: (r) => formatDate(r.requestDate), className: "hidden whitespace-nowrap text-bb-muted md:table-cell" },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={REQUEST_BADGE[r.status].status} label={REQUEST_BADGE[r.status].label} /> },
    { key: "priority", header: "Priority", cell: (r) => <Chip selected={r.priority === "high"} className="capitalize">{r.priority}</Chip> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Librarian"
        title="Circulation"
        description="Manage book check-out, returns, and reservations."
        actions={
          <>
            <Chip icon="info">Sample data</Chip>
            <Button onClick={() => comingSoon("Check-out")}>
              <Icon name="scan" size={18} /> Check out
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard variant="featured" title="Currently borrowed" value={loans.filter((l) => l.status === "borrowed").length} description="Active checkouts" icon="read" />
        <StatCard title="Overdue items" value={loans.filter((l) => l.status === "overdue").length} description="Require attention" icon="overdue" />
        <StatCard title="Recent returns" value={returns.length} description="Last 7 days" icon="rotate-ccw" />
        <StatCard title="Pending requests" value={requests.filter((r) => r.status === "PENDING").length} description="Awaiting approval" icon="calendar" />
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide">
          <TabsTrigger value="current">Current loans</TabsTrigger>
          <TabsTrigger value="returns">Recent returns</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="borrow-requests">Borrow requests</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              wrapperClassName="sm:max-w-sm sm:flex-1"
              placeholder="Search by title, borrower, or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All items</SelectItem>
                <SelectItem value="borrowed">Borrowed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable
            columns={loanColumns}
            rows={filteredLoans}
            rowKey={(l) => l.id}
            emptyIcon="check-circle"
            emptyTitle="No loans found"
            emptyDescription="Nothing matches this search or filter."
            actionsHeader="Actions"
            renderActions={(l) => (
              <span className="inline-flex items-center gap-4">
                <button onClick={() => renew(l.id)}>Renew</button>
                <button onClick={() => returnLoan(l)}>Return</button>
              </span>
            )}
          />
        </TabsContent>

        <TabsContent value="returns" className="mt-4">
          <DataTable
            columns={returnColumns}
            rows={returns}
            rowKey={(r) => r.id}
            emptyIcon="rotate-ccw"
            emptyTitle="No recent returns"
            actionsHeader="Actions"
            renderActions={() => <button onClick={() => comingSoon("Checking an item out again")}>Check out again</button>}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <FormField label="From" htmlFor="history-from"><Input id="history-from" type="date" /></FormField>
            <FormField label="To" htmlFor="history-to"><Input id="history-to" type="date" /></FormField>
            <Button variant="outline" onClick={() => comingSoon("Circulation history")}>Filter</Button>
          </div>
          <EmptyState icon="calendar" title="Select a date range" description="Circulation history for the range you choose will appear here." />
        </TabsContent>

        <TabsContent value="reservations" className="mt-4">
          <EmptyState icon="bookmark" title="No current reservations" description="Books reserved by patrons will appear here." />
        </TabsContent>

        <TabsContent value="borrow-requests" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={requestStatusFilter} onValueChange={setRequestStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All requests</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by priority">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="high">High priority</SelectItem>
                <SelectItem value="normal">Normal priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable
            columns={requestColumns}
            rows={filteredRequests}
            rowKey={(r) => r.id}
            emptyIcon="search"
            emptyTitle="No matching requests"
            emptyDescription="Try a different status or priority filter."
            actionsHeader="Actions"
            renderActions={(r) =>
              r.status === "PENDING" ? (
                <span className="inline-flex items-center gap-4">
                  <button onClick={() => decide(r.id, "APPROVED")}>Approve</button>
                  <button className="text-bb-danger-ink" onClick={() => decide(r.id, "REJECTED")}>Reject</button>
                </span>
              ) : null
            }
          />
        </TabsContent>
      </Tabs>

      <section className="rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6">
        <h2 className="font-display text-lg font-extrabold tracking-[-0.02em]">Quick check-out</h2>
        <p className="mb-4 text-[13px] text-bb-muted">Quickly check out an item to a borrower</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          <FormField label="Item barcode / ID" htmlFor="qc-item">
            <Input id="qc-item" placeholder="Scan or enter item barcode" />
          </FormField>
          <FormField label="Borrower ID" htmlFor="qc-borrower">
            <Input id="qc-borrower" placeholder="Scan or enter borrower ID" />
          </FormField>
          <Button onClick={() => comingSoon("Check-out")}>Check out item</Button>
        </div>
      </section>
    </div>
  );
};

export default CirculationPage;
