'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge, type BBStatus } from "@/components/ui/status-badge";

const DAY = 24 * 60 * 60 * 1000;

function dueState(dueDate: string): { overdue: boolean; soon: boolean; status: BBStatus; label: string } {
  const left = new Date(dueDate).getTime() - Date.now();
  const overdue = left < 0;
  const soon = left < 3 * DAY;
  return overdue
    ? { overdue, soon, status: "overdue", label: "Overdue" }
    : soon
      ? { overdue, soon, status: "due-soon", label: "Due soon" }
      : { overdue, soon, status: "returned", label: "On time" };
}

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isAuthenticated } = useAuthStore();

  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      try {
        const res = await apiClient.get('/library/borrowed');
        setBorrowedBooks(res.data || []);
      } catch (err) {
        console.error("Failed to fetch borrowed books", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooks();
  }, [isAuthenticated]);

  const q = searchQuery.trim().toLowerCase();
  const visible = q
    ? borrowedBooks.filter((b) => (b.book?.title ?? "").toLowerCase().includes(q))
    : borrowedBooks;

  const isPhysical = (b: any) => b.book?.format === "Physical";

  const columns: DataColumn<any>[] = [
    {
      key: "title",
      header: "Title",
      cell: (b) => <span className="font-semibold">{b.book?.title}</span>,
      className: "whitespace-nowrap",
    },
    {
      key: "format",
      header: "Format",
      cell: (b) => <Chip icon={isPhysical(b) ? "library" : "read"}>{b.book?.format || "Digital"}</Chip>,
    },
    {
      key: "borrowed",
      header: "Borrowed on",
      cell: (b) => new Date(b.borrowedAt).toLocaleDateString(),
      className: "whitespace-nowrap text-bb-muted",
    },
    {
      key: "due",
      header: "Due date",
      cell: (b) => new Date(b.dueDate).toLocaleDateString(),
      className: "whitespace-nowrap text-bb-muted",
    },
    {
      key: "status",
      header: "Status",
      cell: (b) => {
        const d = dueState(b.dueDate);
        return <StatusBadge status={d.status} label={d.label} />;
      },
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Student"
        title="Personal library"
        description="Manage your borrowed books and track due dates."
        actions={
          <Button asChild>
            <Link href="/catalog">
              Browse library <Icon name="arrow-right" size={18} />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          variant="featured"
          title="Books borrowed"
          value={borrowedBooks.length}
          description={`${borrowedBooks.filter(isPhysical).length} physical, ${borrowedBooks.filter((b) => !isPhysical(b)).length} digital`}
          icon="library"
          loading={isLoading}
        />
        <StatCard
          title="Due soon"
          value={borrowedBooks.filter((b) => dueState(b.dueDate).soon).length}
          description="Within 3 days"
          icon="calendar"
          loading={isLoading}
        />
        <StatCard
          title="Overdue"
          value={borrowedBooks.filter((b) => dueState(b.dueDate).overdue).length}
          description="Requires attention"
          icon="overdue"
          loading={isLoading}
        />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Borrowed books</h2>
          <SearchInput
            wrapperClassName="sm:w-72"
            placeholder="Search your books"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(b) => b.id}
          loading={isLoading}
          emptyIcon="library"
          emptyTitle={q ? "No matching books" : "You haven't borrowed any books yet"}
          emptyDescription={q ? "Try a different title." : "Borrow a book from the catalog and it will appear here."}
          emptyAction={
            q ? undefined : (
              <Button asChild>
                <Link href="/catalog">Browse library</Link>
              </Button>
            )
          }
          actionsHeader="Actions"
          renderActions={(b) => (
            <span className="inline-flex items-center gap-4">
              <button
                onClick={() => {
                  if (isPhysical(b)) {
                    alert("Taking you to return modal");
                  } else {
                    window.location.href = "/reader";
                  }
                }}
              >
                {isPhysical(b) ? "Return" : "Read"}
              </button>
              <button className="text-bb-muted">Renew</button>
            </span>
          )}
        />
      </section>
    </div>
  );
}
