"use client"

import { StatCard } from '@/components/ui/stat-card';
import { useOverviewStats } from '@/app/dashboard/super-admin/hooks/useSuperAdmin';

export function SuperAdminStats() {
  const { data: statsData, isLoading, error } = useOverviewStats();

  const institutions = statsData?.institutions?.total || 0;
  const users = statsData?.users?.total || 0;
  const booksTotal = statsData?.books?.total || 0;
  const borrowedBooks = statsData?.books?.borrowed ?? 0;
  const overdueBooks = statsData?.books?.overdue ?? 0;
  const failed = !isLoading && !!error;

  const plural = (n: number) => `${n} institution${n !== 1 ? 's' : ''}`;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-[18px]">
      <StatCard
        className="bb-enter" style={{ ["--i" as string]: 0 }}
        variant="featured"
        title="Total books"
        value={booksTotal.toLocaleString()}
        description={`Across ${plural(institutions)}`}
        icon="library"
        loading={isLoading}
        error={failed ? error : undefined}
      />
      <StatCard
        className="bb-enter" style={{ ["--i" as string]: 1 }}
        title="Active members"
        value={users.toLocaleString()}
        description={`${plural(institutions)} registered`}
        icon="class"
        loading={isLoading}
        error={failed ? error : undefined}
      />
      <StatCard
        className="bb-enter" style={{ ["--i" as string]: 2 }}
        title="Borrowed books"
        value={borrowedBooks.toLocaleString()}
        description={borrowedBooks > 0 ? `${Math.round((borrowedBooks / Math.max(booksTotal, 1)) * 100)}% circulation rate` : 'No active borrowings'}
        icon="read"
        loading={isLoading}
        error={failed ? error : undefined}
      />
      <StatCard
        className="bb-enter" style={{ ["--i" as string]: 3 }}
        title="Overdue items"
        value={overdueBooks.toLocaleString()}
        description={overdueBooks > 0 ? 'Requires attention' : 'All clear'}
        icon="overdue"
        loading={isLoading}
        error={failed ? error : undefined}
      />
    </div>
  );
}
