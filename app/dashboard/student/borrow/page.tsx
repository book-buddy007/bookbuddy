'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BorrowRequest {
  id: string;
  title: string;
  requestDate: string;
  status: "Pending" | "Approved";
  priority: "Normal" | "High";
  notes: string;
}

export default function BorrowPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [priority, setPriority] = useState("all");

  // Mock data - will be replaced with API calls
  const borrowRequests: BorrowRequest[] = [
    {
      id: "BR1",
      title: "The Catcher in the Rye",
      requestDate: "June 1, 2023",
      status: "Pending",
      priority: "Normal",
      notes: "Required for Literature assignment",
    },
    {
      id: "BR2",
      title: "The Alchemist",
      requestDate: "June 2, 2023",
      status: "Approved",
      priority: "High",
      notes: "For classroom reading",
    },
  ];

  const q = searchQuery.trim().toLowerCase();
  const visible = borrowRequests.filter(
    (r) =>
      (priority === "all" || r.priority.toLowerCase() === priority) &&
      (!q || r.title.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q))
  );

  const columns: DataColumn<BorrowRequest>[] = [
    { key: "title", header: "Title", cell: (r) => <span className="font-semibold">{r.title}</span>, className: "whitespace-nowrap" },
    { key: "date", header: "Request date", cell: (r) => r.requestDate, className: "whitespace-nowrap text-bb-muted" },
    {
      key: "priority",
      header: "Priority",
      cell: (r) => <Chip selected={r.priority === "High"}>{r.priority}</Chip>,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) =>
        r.status === "Approved" ? (
          <StatusBadge status="returned" label="Approved" />
        ) : (
          <StatusBadge status="pending" />
        ),
    },
    { key: "notes", header: "Notes", cell: (r) => r.notes, className: "max-w-[220px] truncate text-bb-muted" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Student"
        title="Borrow requests"
        description="Request new books and track your requests."
        actions={
          <Button size="lg">
            <Icon name="plus" size={18} /> New request
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          variant="featured"
          title="Total requests"
          value={borrowRequests.length}
          description="All time requests"
          icon="library"
        />
        <StatCard
          title="Pending requests"
          value={borrowRequests.filter((r) => r.status === "Pending").length}
          description="Awaiting librarian approval"
          icon="calendar"
        />
        <StatCard
          title="Approved requests"
          value={borrowRequests.filter((r) => r.status === "Approved").length}
          description="Ready for pickup"
          icon="check-circle"
        />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Request history</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              wrapperClassName="sm:w-72"
              placeholder="Search requests"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="sm:w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="high">High priority</SelectItem>
                <SelectItem value="normal">Normal priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.id}
          emptyIcon="search"
          emptyTitle="No matching requests"
          emptyDescription="Try a different search or priority filter."
          actionsHeader="Actions"
          renderActions={() => <button>View details</button>}
        />
      </section>
    </div>
  );
}
