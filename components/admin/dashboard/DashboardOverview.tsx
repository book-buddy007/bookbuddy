import React from 'react';

interface DashboardOverviewProps {
  children: React.ReactNode;
}

export function DashboardOverview({ children }: DashboardOverviewProps) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
} 