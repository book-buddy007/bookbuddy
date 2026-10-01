'use client';

import { useState } from 'react';
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { QuickStats } from "@/components/admin/dashboard/QuickStats";
import { SystemHealthWidgets } from "@/components/admin/dashboard/SystemHealthWidgets";
import { NavigationCards } from "@/components/admin/dashboard/NavigationCards";
import { DashboardOverview } from "@/components/admin/dashboard/DashboardOverview";
import { Bell, LayoutDashboard } from "@/components/ui/icons";
import { EnhancedButton } from "@/components/ui/enhanced-button";

export default function AdminDashboard() {
  return (
    <div className="p-6 md:ml-64 space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
            <LayoutDashboard className="h-10 w-10 text-blue-700 dark:text-blue-500" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Comprehensive overview of your library management system
          </p>
        </div>
        <EnhancedButton variant="outline" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </EnhancedButton>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Quick Statistics Section */}
        <EnhancedCard variant="elevated">
          <EnhancedCardHeader>
            <EnhancedCardTitle className="text-2xl bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
              Quick Statistics
            </EnhancedCardTitle>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <QuickStats />
          </EnhancedCardContent>
        </EnhancedCard>

        {/* System Health Section */}
        <EnhancedCard variant="elevated">
          <EnhancedCardHeader>
            <EnhancedCardTitle className="text-2xl bg-gradient-to-r from-vg-success-600 to-blue-700 bg-clip-text text-transparent">
              System Health
            </EnhancedCardTitle>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <SystemHealthWidgets />
          </EnhancedCardContent>
        </EnhancedCard>

        {/* Navigation Cards */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
            Quick Actions
          </h2>
          <NavigationCards />
        </div>

        {/* Activity Overview */}
        <EnhancedCard variant="elevated">
          <EnhancedCardHeader>
            <EnhancedCardTitle className="text-2xl bg-gradient-to-r from-teal-600 to-blue-700 bg-clip-text text-transparent">
              Activity Overview
            </EnhancedCardTitle>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <DashboardOverview>
              <p className="text-muted-foreground">Recent activity will be displayed here.</p>
            </DashboardOverview>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>
    </div>
  );
}
