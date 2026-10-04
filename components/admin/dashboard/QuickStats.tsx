"use client";

import { StatCard } from "@/components/ui/stat-card";
import { useAdminOverview } from "@/hooks/use-admin-data";

const nf = new Intl.NumberFormat();

/** The four headline numbers of the admin dashboard, all from the institution's real records. */
export function QuickStats() {
  const { data, isLoading, isError } = useAdminOverview();
  const dash = (n: number | undefined) => (isError ? "-" : n === undefined ? "..." : nf.format(n));

  const m = data?.members;
  const memberNote = isError
    ? "Couldn't load"
    : m
      ? `${nf.format(m.active)} active${m.suspended ? `, ${m.suspended} suspended` : ""}${m.pending ? `, ${m.pending} pending` : ""}`
      : "Loading";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard variant="featured" title="Total users" value={dash(m?.total)} description={memberNote} icon="class" loading={isLoading} />
      <StatCard
        title="Total books"
        value={dash(data?.books.titles)}
        description={data ? `${nf.format(data.books.copies)} copies, ${nf.format(data.books.availableCopies)} available` : isError ? "Couldn't load" : "Loading"}
        icon="library"
        loading={isLoading}
      />
      <StatCard
        title="Active loans"
        value={dash(data?.loans.active)}
        description={data ? `${nf.format(data.loans.dueSoon)} due in the next 3 days` : isError ? "Couldn't load" : "Loading"}
        icon="read"
        loading={isLoading}
      />
      <StatCard
        title="Overdue items"
        value={dash(data?.loans.overdue)}
        description={data ? (data.loans.overdue ? "Needs follow-up" : "Nothing overdue") : isError ? "Couldn't load" : "Loading"}
        icon="overdue"
        loading={isLoading}
      />
    </div>
  );
}
