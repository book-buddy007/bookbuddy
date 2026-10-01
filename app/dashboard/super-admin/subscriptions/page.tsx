'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Chip } from '@/components/ui/chip';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from "@/hooks/use-toast";
import { SubscriptionForm, SubscriptionFormValues } from './components/SubscriptionForm';
import { cn } from '@/lib/utils';
import {
  getTenantSubscriptions,
  getSubscriptionPlans,
  updateTenantSubscription,
  getInstitutions,
  getPaymentGateways,
  getTenantSubscriptionsStats
} from '@/lib/api/adminApi';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// No mock data: everything is fetched from the backend API

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateString));
};

const sectionTitle = "font-display text-xl font-extrabold tracking-[-0.02em]";

// Component for displaying a subscription plan card
function PlanCard({ plan, onToggle, onEdit }: {
  plan: any,
  onToggle: (id: string) => void,
  onEdit: (id: string) => void
}) {
  const isActive = plan.isActive ?? true;
  // Build feature checklist from real schema fields
  const features: Record<string, any> = {
    'Tier': plan.tier || '—',
    'Max Books': plan.maxBooks ?? 'Unlimited',
    'Max Devices': plan.maxDevices ?? 1,
    'AI Chat': plan.aiChatEnabled ?? false,
    'Audio': plan.audioEnabled ?? false,
    'Annotations': plan.annotationsEnabled ?? false,
    'Flashcards': plan.flashcardsEnabled ?? false,
    'Download': plan.downloadEnabled ?? false,
  };

  return (
    <div className={cn(
      "flex h-full flex-col overflow-hidden rounded-[22px] bg-bb-surface shadow-e1",
      isActive ? "ring-[1.5px] ring-bb-accent" : "opacity-90"
    )}>
      <div className="border-b border-bb-border p-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-[-0.02em]">
              <Icon name="crown" size={20} />
              {plan.name}
            </h3>
            <p className="mt-1 text-sm text-bb-muted">{plan.description}</p>
          </div>
          {isActive ? <StatusBadge status="returned" label="Active" /> : <Chip>Inactive</Chip>}
        </div>
      </div>

      <div className="flex-grow p-6">
        <div className="mb-6 font-display text-4xl font-extrabold tabular-nums tracking-[-0.03em]">
          ₹{plan.monthlyPrice != null ? Number(plan.monthlyPrice).toLocaleString('en-IN') : '0'}
          <span className="ml-1 text-sm font-semibold uppercase text-bb-muted">/mo</span>
        </div>
        <ul className="space-y-3">
          {Object.entries(features).map(([key, value]) => (
            <li key={key} className="flex items-start gap-3">
              {typeof value === 'boolean' ? (
                value ? <Icon name="check-circle" size={20} className="shrink-0" /> : <Icon name="x-circle" size={20} className="shrink-0 opacity-30" />
              ) : (
                <Icon name="check-circle" size={20} className="shrink-0" />
              )}
              <span className="pt-0.5 text-sm font-medium capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}{typeof value === 'boolean' ? '' : `: ${String(value)}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3 border-t border-bb-border bg-bb-surface-2 p-4">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(plan.id)}>
          Configure
        </Button>
        <Button
          variant={isActive ? "outline" : "default"}
          size="sm"
          className="flex-1"
          onClick={() => onToggle(plan.id)}
        >
          {isActive ? "Disable plan" : "Enable plan"}
        </Button>
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState("active-subscriptions");
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<any | null>(null);
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<any | null>(null);
  const { toast } = useToast();

  const comingSoon = (what: string) =>
    toast({ title: "Coming soon", description: `${what} isn't available yet.` });

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true);

      const [subsRes, plansRes, tenantsRes, gwRes, statsRes] = await Promise.all([
        getTenantSubscriptions(),
        getSubscriptionPlans(),
        getInstitutions(),
        getPaymentGateways(),
        getTenantSubscriptionsStats()
      ]);

      if (subsRes.success) setSubscriptions(subsRes.data);
      if (plansRes.success) setPlans(plansRes.data);
      if (tenantsRes.success) setTenants(tenantsRes.data || []);
      if (gwRes.success) setGateways(gwRes.data || []);
      if (statsRes.success) setStats(statsRes.data || {});

    } catch (error) {
      console.error("Failed to fetch data", error);
      toast({
        title: "Fetch Error",
        description: "Failed to load subscriptions data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOpenAddForm = () => {
    setEditingSubscription(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (subscription: any) => {
    setEditingSubscription(subscription);
    setIsFormOpen(true);
  };

  const handleDeleteSubscription = async (id: string) => {
    try {
      const res = await updateTenantSubscription(id, { status: 'CANCELLED', cancelReason: 'User requested deletion' });

      if (res.success) {
        toast({
          title: "Cancelled",
          description: "Subscription cancelled successfully.",
        });
        fetchSubscriptions();
      } else {
        throw new Error(res.error || 'Failed to cancel');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not cancel the subscription.",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (values: SubscriptionFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        planId: values.planId,
        status: values.status || 'ACTIVE',
        startDate: values.startDate,
        endDate: values.endDate,
      };
      const res = await updateTenantSubscription(values.tenantId || editingSubscription?.tenantId, payload);

      if (res.success) {
        toast({
          title: "Success",
          description: editingSubscription ? "Subscription updated." : "Subscription created.",
        });
        setIsFormOpen(false);
        fetchSubscriptions();
      } else {
        throw new Error(res.error || 'Failed to save');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "There was a problem saving the subscription.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: DataColumn<any>[] = [
    { key: 'tenant', header: 'Tenant', cell: (s) => <span className="font-semibold">{s.tenant?.name || s.tenantId.substring(0, 8)}</span>, className: 'whitespace-nowrap' },
    { key: 'tier', header: 'Plan tier', cell: (s) => <Chip className="uppercase">{s.plan?.tier || s.plan?.name || '—'}</Chip> },
    {
      key: 'status',
      header: 'Status',
      cell: (s) =>
        s.status === 'ACTIVE' ? <StatusBadge status="returned" label="Active" /> :
        s.status === 'EXPIRED' ? <StatusBadge status="overdue" label="Expired" /> :
        <StatusBadge status="due-soon" label={String(s.status ?? '').charAt(0) + String(s.status ?? '').slice(1).toLowerCase()} />,
    },
    { key: 'start', header: 'Start date', cell: (s) => formatDate(s.startDate), className: 'whitespace-nowrap text-bb-muted' },
    { key: 'end', header: 'End date', cell: (s) => formatDate(s.endDate), className: 'whitespace-nowrap text-bb-muted' },
    { key: 'books', header: 'Max books', cell: (s) => <span className="tabular-nums">{s.plan?.maxBooks ?? s.maxBooksOverride ?? 'Unlimited'}</span>, className: 'whitespace-nowrap' },
    {
      key: 'billing',
      header: 'Billing',
      cell: (s) => (
        <Chip selected={s.billingCycle === 'ANNUAL' || s.billingCycle === 'LIFETIME'}>{s.billingCycle || 'MONTHLY'}</Chip>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'w-12 text-right',
      cell: (s) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Subscription actions">
              <Icon name="more-h" size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => handleOpenEditForm(s), 100); }}>
              <Icon name="edit" size={16} className="mr-2" /> Edit subscription
            </DropdownMenuItem>
            <DropdownMenuItem className="text-bb-danger-ink" onSelect={(e) => { e.preventDefault(); setTimeout(() => setSubscriptionToCancel(s), 100); }}>
              <Icon name="trash" size={16} className="mr-2" /> Cancel subscription
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        className="mb-0"
        eyebrow="Tenant billing"
        title="Subscription management"
        description="Manage tenant licenses, service quotas, global plans, and payment integrations."
        actions={
          <Button size="lg" onClick={handleOpenAddForm}>
            <Icon name="plus" size={18} /> Allocate license
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard variant="featured" title="Total plans" value={stats.totalPlans ?? plans.filter(p => p.isActive).length} description="Configured plans available" icon="subscription" loading={isLoading} />
        <StatCard title="Active tenants" value={stats.activeCount ?? 0} description="Allocated active licenses" icon="institution" loading={isLoading} />
        <StatCard title="Total revenue" value={`₹${(stats.monthlyRevenue ?? 0).toLocaleString('en-IN')}`} description="Projected this month" icon="trending-up" loading={isLoading} />
        <StatCard title="Expiring soon" value={stats.expiringSoon ?? 0} description="Renewals required this month" icon="calendar" loading={isLoading} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="active-subscriptions">Active subscriptions</TabsTrigger>
          <TabsTrigger value="plans">Pricing plans</TabsTrigger>
          <TabsTrigger value="payment-gateways">Global gateways</TabsTrigger>
        </TabsList>

        <TabsContent value="active-subscriptions" className="mt-0 space-y-4">
          <div>
            <h2 className={sectionTitle}>Tenant billing list</h2>
            <p className="text-[13px] text-bb-muted">Review active subscriptions and entitlement limits.</p>
          </div>
          <DataTable
            columns={columns}
            rows={subscriptions}
            rowKey={(s) => s.id}
            loading={isLoading}
            emptyIcon="institution"
            emptyTitle="No active tenants"
            emptyDescription="There are currently no active subscriptions. Assign a license to get started."
            emptyAction={
              <Button onClick={handleOpenAddForm}>
                <Icon name="plus" size={18} /> Allocate license
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="plans" className="mt-0 space-y-4">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className={sectionTitle}>Available configurations</h2>
              <p className="text-[13px] text-bb-muted">Global subscription tiers that can be offered to tenants.</p>
            </div>
            <Button onClick={() => comingSoon('Creating plan tiers')}>
              <Icon name="plus" size={18} /> Create tier
            </Button>
          </div>

          {plans.length === 0 ? (
            <EmptyState
              icon="layers"
              title="No configured plans"
              description="There are currently no plan tiers configured globally."
              action={
                <Button onClick={() => comingSoon('Creating plan tiers')}>
                  <Icon name="plus" size={18} /> Create first tier
                </Button>
              }
            />
          ) : (
            <div className="grid max-w-5xl items-stretch gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onToggle={() => comingSoon('Enabling and disabling plans')}
                  onEdit={() => comingSoon('Configuring plans')}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payment-gateways" className="mt-0 space-y-4">
          <div>
            <h2 className={sectionTitle}>Routing configuration</h2>
            <p className="text-[13px] text-bb-muted">Configure financial processors and payment gateways.</p>
          </div>

          {gateways.length === 0 ? (
            <EmptyState
              icon="subscription"
              title="No payment gateways"
              description="No payment gateways have been configured yet. Start accepting payments by adding a gateway."
              action={
                <Button onClick={() => comingSoon('Adding a gateway')}>
                  <Icon name="plus" size={18} /> Add gateway
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {gateways.map((gateway: any) => (
                <div
                  key={gateway.id}
                  className="flex flex-col justify-between gap-4 rounded-[18px] bg-bb-surface p-5 shadow-e1 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-bb-surface-2">
                      <Icon name="subscription" size={24} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{gateway.name}</h3>
                        {gateway.isActive ? <StatusBadge status="returned" label="Active" /> : <Chip>Disconnected</Chip>}
                      </div>
                      <p className="text-sm text-bb-muted">{gateway.description || `Payment processor: ${gateway.slug}`}</p>
                    </div>
                  </div>
                  <Button
                    variant={gateway.isConfigured ? "outline" : "default"}
                    size="sm"
                    className="shrink-0"
                    onClick={() => comingSoon('Gateway configuration')}
                  >
                    {gateway.isConfigured ? "Configure routing" : "Set up connection"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SubscriptionForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
        initialData={editingSubscription}
        tenants={tenants}
        plans={plans}
      />

      <AlertDialog open={!!subscriptionToCancel} onOpenChange={(open) => !open && setSubscriptionToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              The subscription for{" "}
              <span className="font-semibold text-bb-text">{subscriptionToCancel?.tenant?.name ?? "this tenant"}</span> will be marked as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-bb-danger text-white hover:brightness-95"
              onClick={() => {
                if (subscriptionToCancel) handleDeleteSubscription(subscriptionToCancel.id);
                setSubscriptionToCancel(null);
              }}
            >
              Cancel subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
