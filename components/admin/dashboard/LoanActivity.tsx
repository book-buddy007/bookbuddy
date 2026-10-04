"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type BBIconName } from "@/components/ui/icon";
import { useAdminOverview } from "@/hooks/use-admin-data";

const nf = new Intl.NumberFormat();

const Row = ({ icon, label, value, href }: { icon: BBIconName; label: string; value: number; href?: string }) => {
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bb-accent-soft">
        <Icon name={icon} size={20} />
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="font-display text-xl font-extrabold tabular-nums tracking-[-0.02em]">{nf.format(value)}</span>
    </>
  );
  const cls = "flex items-center gap-3 rounded-2xl bg-bb-surface px-4 py-3 shadow-e1";
  return href ? (
    <Link href={href} className={`${cls} bb-lift focus-visible:outline-none focus-visible:shadow-focus`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
};

/** Loans at a glance, from the same overview request as the headline cards. */
export function LoanActivity() {
  const { data, isError } = useAdminOverview();

  if (isError) {
    return <EmptyState icon="alert-circle" title="Couldn't load loan activity" description="Refresh the page to try again." />;
  }
  if (!data) return null;

  const { loans } = data;
  if (loans.active === 0 && loans.returnedLast30Days === 0) {
    return <EmptyState icon="analytics" title="No loan activity yet" description="Borrowing activity will appear here once members start borrowing." />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Row icon="clock" label="Due in the next 3 days" value={loans.dueSoon} />
      <Row icon="overdue" label="Overdue now" value={loans.overdue} href="/dashboard/admin/overdue" />
      <Row icon="check-circle" label="Returned in the last 30 days" value={loans.returnedLast30Days} />
    </div>
  );
}
