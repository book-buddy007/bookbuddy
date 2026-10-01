'use client';

import { QuickStats } from "@/components/admin/dashboard/QuickStats";
import { NavigationCards } from "@/components/admin/dashboard/NavigationCards";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Admin"
        title="Dashboard"
        description="Overview of your library management system."
        actions={<Chip icon="info">Sample data</Chip>}
      />

      <QuickStats />

      <section className="space-y-4">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Quick actions</h2>
        <NavigationCards />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Activity overview</h2>
        <EmptyState icon="analytics" title="No recent activity" description="Borrowing and approval activity will appear here." />
      </section>
    </div>
  );
}
