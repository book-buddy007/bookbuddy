'use client';

import { QuickStats } from "@/components/admin/dashboard/QuickStats";
import { LoanActivity } from "@/components/admin/dashboard/LoanActivity";
import { NavigationCards } from "@/components/admin/dashboard/NavigationCards";
import { PageHeader } from "@/components/ui/page-header";

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Admin"
        title="Dashboard"
        description="Overview of your library management system."
      />

      <QuickStats />

      <section className="space-y-4">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Quick actions</h2>
        <NavigationCards />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Loan activity</h2>
        <LoanActivity />
      </section>
    </div>
  );
}
