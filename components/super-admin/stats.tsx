"use client"

import { useState, useEffect } from 'react';
import { StatPill } from '@/components/ui/stat-pill';
import { useOverviewStats } from '@/app/dashboard/super-admin/hooks/useSuperAdmin';
import { Building, Users, BookOpen, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';

export function SuperAdminStats() {
  const { data: statsData, isLoading, error } = useOverviewStats();
  
  const stats = {
    institutions: statsData?.institutions?.total || 0,
    users: statsData?.users?.total || 0,
    activeSubscriptions: statsData?.subscriptions?.active || 0,
    booksTotal: statsData?.books?.total || 0,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  };

  // Use generic placeholders if loading or error
  if (stats.loading || stats.error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatPill label="Total Books" value={0} icon={<BookOpen className="h-5 w-5" />} accent="saffron" isLoading={true} />
        <StatPill label="Active Members" value={0} icon={<Users className="h-5 w-5" />} accent="teal" isLoading={true} delayMs={100} />
        <StatPill label="Daily Checkouts" value={0} icon={<RefreshCw className="h-5 w-5" />} accent="indigo" isLoading={true} delayMs={200} />
        <StatPill label="Overdue Items" value={0} icon={<AlertCircle className="h-5 w-5" />} accent={stats.error ? "kumkum" : "gold"} isLoading={true} delayMs={300} />
      </div>
    );
  }

  // Use real stats from the backend
  const borrowedBooks = statsData?.books?.borrowed ?? 0;
  const overdueBooks = statsData?.books?.overdue ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatPill 
        label="Total Books" 
        value={stats.booksTotal.toLocaleString()} 
        subLabel={`Across ${stats.institutions} institution${stats.institutions !== 1 ? 's' : ''}`}
        icon={<BookOpen className="h-5 w-5" />} 
        accent="saffron" 
      />
      <StatPill 
        label="Active Members" 
        value={stats.users.toLocaleString()} 
        subLabel={`${stats.institutions} institution${stats.institutions !== 1 ? 's' : ''} registered`}
        icon={<Users className="h-5 w-5" />} 
        accent="teal" 
        delayMs={100}
      />
      <StatPill 
        label="Borrowed Books" 
        value={borrowedBooks.toLocaleString()} 
        subLabel={borrowedBooks > 0 ? `${Math.round(borrowedBooks / Math.max(stats.booksTotal, 1) * 100)}% circulation rate` : 'No active borrowings'}
        icon={<RefreshCw className="h-5 w-5" />} 
        accent="indigo" 
        delayMs={200}
      />
      <StatPill 
        label="Overdue Items" 
        value={overdueBooks.toLocaleString()} 
        subLabel={overdueBooks > 0 ? "Requires attention" : "All clear"}
        icon={<AlertCircle className="h-5 w-5" />} 
        accent={overdueBooks > 0 ? "kumkum" : "gold"} 
        delayMs={300}
      />
    </div>
  );
}

