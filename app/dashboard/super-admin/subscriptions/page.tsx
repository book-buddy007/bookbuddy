'use client';

import { useState, useEffect } from 'react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle, EnhancedCardFooter } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/button";
import { StatPill } from '@/components/ui/stat-pill';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import {
  CreditCard,
  DollarSign,
  Users,
  BookOpen,
  Check,
  X,
  Plus,
  CircleCheck,
  MoreHorizontal,
  ChevronRight,
  Crown,
  Inbox
} from '@/components/ui/icons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// No mock data — everything is fetched from the backend API

// Helper functions for formatting
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateString));
};

// Component for displaying a subscription plan card
function PlanCard({ plan, onToggle, onEdit }: {
  plan: any,
  onToggle: (id: string) => void,
  onEdit: (id: string) => void
}) {
  const Icon = Crown; // Default icon
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
        "relative rounded-2xl flex flex-col h-full overflow-hidden transition-all duration-300",
        "bg-white/70 dark:bg-white/[0.03] backdrop-blur-md shadow-md",
        isActive ? "border border-[var(--peacock-teal)]/40 hover:shadow-lg" : "border border-slate-200/60 dark:border-white/[0.07] opacity-90 grayscale-[20%]"
    )}>
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--deep-saffron)] to-[var(--peacock-teal)]" />
      )}
      
      <div className="p-6 pb-4 border-b border-slate-100 dark:border-white/[0.05]">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h3 className="font-display text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Icon className="w-5 h-5 text-[var(--peacock-teal)]" />
                    {plan.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
            </div>
            {isActive ? (
                <Badge className="bg-[var(--peacock-teal)]/10 text-[var(--peacock-teal)] hover:bg-[var(--peacock-teal)]/20 border-0">Active</Badge>
            ) : (
                <Badge variant="outline" className="text-slate-500 border-slate-200 dark:border-slate-700">Inactive</Badge>
            )}
        </div>
      </div>
      
      <div className="p-6 flex-grow">
        <div className="mb-6">
          <div className="text-4xl font-extrabold tabular-nums tracking-tight text-[var(--peacock-teal)]">
            ₹{plan.monthlyPrice != null ? Number(plan.monthlyPrice).toLocaleString('en-IN') : '0'}
            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 ml-1 uppercase">/mo</span>
          </div>
        </div>
        <div className="space-y-3">
          {Object.entries(features).map(([key, value]) => (
            <div key={key} className="flex items-start">
              {typeof value === 'boolean' ? (
                value ? <Check className="mr-3 h-5 w-5 text-[var(--peacock-teal)] shrink-0" /> : <X className="mr-3 h-5 w-5 text-slate-300 dark:text-slate-600 shrink-0" />
              ) : (
                <CircleCheck className="mr-3 h-5 w-5 text-[var(--peacock-teal)] shrink-0" />
              )}
              <span className="text-sm text-slate-700 dark:text-slate-300 capitalize font-medium pt-0.5">
                {key.replace(/([A-Z])/g, ' $1').trim()}: {typeof value === 'boolean' ? '' : String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 bg-slate-50/50 dark:bg-black/20 flex gap-3 border-t border-slate-100 dark:border-white/[0.05]">
        <Button variant="ghost" size="sm" className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" onClick={() => onEdit(plan.id)}>
          Configure
        </Button>
        <EnhancedButton
          variant={isActive ? "outline" : "default"}
          size="sm"
          className={cn("flex-1", isActive ? "text-slate-600 border-slate-200 hover:bg-slate-100" : "bg-[var(--peacock-teal)] text-white hover:bg-[var(--peacock-teal)]/90")}
          onClick={() => onToggle(plan.id)}
        >
          {isActive ? "Disable Plan" : "Enable Plan"}
        </EnhancedButton>
      </div>
    </div>
  );
}

// Component for displaying subscription table
function SubscriptionsTable({
  subscriptions,
  isLoading,
  onEdit,
  onDelete
}: {
  subscriptions: any[],
  isLoading: boolean,
  onEdit: (sub: any) => void,
  onDelete: (id: string) => void
}) {
  if (isLoading) {
    return (
        <div className="py-12 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--peacock-teal)] mb-4"></div>
            <p className="text-slate-400 font-medium">Loading subscriptions...</p>
        </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-white/[0.07] overflow-hidden shadow-sm bg-white/70 dark:bg-[var(--night-ink)]/60 backdrop-blur-md">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow className="bg-slate-50/80 dark:bg-white/[0.03] border-b-slate-200/60 dark:border-white/[0.07]">
            <TableHead className="text-slate-500 uppercase tracking-wider text-xs font-bold py-4">Tenant Name</TableHead>
            <TableHead className="text-slate-500 uppercase tracking-wider text-xs font-bold py-4">Plan Tier</TableHead>
            <TableHead className="text-slate-500 uppercase tracking-wider text-xs font-bold py-4">Status</TableHead>
            <TableHead className="text-slate-500 uppercase tracking-wider text-xs font-bold py-4">Start Date</TableHead>
            <TableHead className="text-slate-500 uppercase tracking-wider text-xs font-bold py-4">End Date</TableHead>
            <TableHead className="text-slate-500 uppercase tracking-wider text-xs font-bold py-4">Max Books</TableHead>
            <TableHead className="text-slate-500 uppercase tracking-wider text-xs font-bold py-4">Billing</TableHead>
            <TableHead className="text-slate-500 uppercase tracking-wider text-xs font-bold py-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8}>
                 <div className="py-16 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--peacock-teal)]/10 flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-[var(--peacock-teal)]" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">No Active Tenants</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">There are currently no active subscriptions. Assign a license to get started.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            subscriptions.map((sub) => (
              <TableRow key={sub.id} className="border-b-slate-100 dark:border-white/[0.05] hover:bg-[var(--peacock-teal)]/[0.04] transition-colors">
                <TableCell className="font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{sub.tenant?.name || sub.tenantId.substring(0, 8)}</TableCell>
                <TableCell className="font-bold text-[var(--peacock-teal)] uppercase tracking-wider text-xs whitespace-nowrap">{sub.plan?.tier || sub.plan?.name || '—'}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant={
                    sub.status === "ACTIVE" ? "default" :
                      sub.status === "EXPIRED" ? "destructive" : "secondary"
                  } className={cn(
                      "shadow-sm border-0",
                      sub.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      sub.status === "EXPIRED" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" : 
                      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {sub.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(sub.startDate)}</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(sub.endDate)}</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400 whitespace-nowrap tabular-nums font-medium">{sub.plan?.maxBooks ?? sub.maxBooksOverride ?? 'Unlimited'}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant="outline" className={cn(
                    sub.billingCycle === 'ANNUAL' || sub.billingCycle === 'LIFETIME'
                      ? "text-[var(--peacock-teal)] border-[var(--peacock-teal)]/30 bg-[var(--peacock-teal)]/5"
                      : "text-slate-500 border-slate-200 bg-slate-50 dark:bg-slate-900/20 dark:border-slate-800"
                  )}>
                    {sub.billingCycle || 'MONTHLY'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-500 transition-colors">
                        <MoreHorizontal className="h-5 w-5" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 shadow-xl rounded-xl border-slate-200/60 dark:border-white/[0.07] dark:bg-[var(--night-ink)]">
                      <DropdownMenuItem 
                          className="font-medium focus:bg-[var(--peacock-teal)]/10 focus:text-[var(--peacock-teal)] cursor-pointer"
                          onSelect={(e) => {
                              e.preventDefault();
                              setTimeout(() => onEdit(sub), 100);
                          }}
                      >
                          Edit Subscription
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="font-medium text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-900/20 dark:focus:text-red-400 cursor-pointer"
                        onSelect={(e) => {
                            e.preventDefault();
                            if (window.confirm("Are you sure you want to delete this subscription?")) {
                                setTimeout(() => onDelete(sub.id), 100);
                            }
                        }}
                      >
                        Delete Subscription
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
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
  const { toast } = useToast();

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

  return (
    <div className="space-y-8 animate-vg-fade-in relative z-10 max-w-[1600px] mx-auto pb-12">
      
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
        <span>Administration</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[var(--peacock-teal)]">Subscription Services</span>
      </div>

      <div className="relative overflow-hidden rounded-3xl p-6 md:p-10 shadow-2xl mb-8 border border-white/10" style={{background: 'linear-gradient(135deg, var(--night-ink) 0%, var(--indigo-deep) 30%, var(--peacock-teal) 60%, var(--deep-saffron) 100%)'}}>
        <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")'}} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--deep-saffron)]/[0.15] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-[var(--deep-saffron)] mr-2 animate-pulse"></span>
              Tenant Billing
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm font-display">
               Subscription Management
            </h1>
            <p className="text-indigo-100/90 text-lg max-w-xl font-medium">
               Manage tenant licenses, service quotas, global plans, and payment integrations.
            </p>
          </div>
          
          <EnhancedButton
            size="lg"
            className="shrink-0 bg-gradient-to-r from-[var(--deep-saffron)] to-bb-accent hover:from-bb-accent hover:to-bb-accent text-black shadow-lg shadow-[var(--deep-saffron)]/20 border-transparent font-bold"
            onClick={handleOpenAddForm}
          >
            <Plus className="h-5 w-5 mr-2" />
            Allocate License
          </EnhancedButton>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatPill
          label="Total Plans"
          value={stats.totalPlans ?? plans.filter(p => p.isActive).length}
          subLabel="Configured plans available"
          icon={<CreditCard className="h-6 w-6" />}
          accent="teal"
          delayMs={0}
        />
        <StatPill
          label="Active Tenants"
          value={stats.activeCount ?? 0}
          subLabel="Allocated active licenses"
          icon={<Users className="h-6 w-6" />}
          accent="saffron"
          delayMs={80}
        />
        <StatPill
          label="Total Revenue"
          value={`₹${(stats.monthlyRevenue ?? 0).toLocaleString('en-IN')}`}
          subLabel="Projected this month"
          icon={<DollarSign className="h-6 w-6" />}
          accent="gold"
          delayMs={160}
        />
        <StatPill
          label="Expiring Soon"
          value={stats.expiringSoon ?? 0}
          subLabel="Renewals required this month"
          icon={<BookOpen className="h-6 w-6" />}
          accent="kumkum"
          delayMs={240}
        />
      </div>

      <Tabs
        defaultValue="active-subscriptions"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-8 mt-10"
      >
        <TabsList className="inline-flex h-12 items-center justify-center rounded-full bg-white/70 dark:bg-[var(--night-ink)]/50 backdrop-blur-md shadow-sm border border-slate-200/50 dark:border-white/[0.05] p-1 text-slate-500 dark:text-slate-400 mx-auto sm:mx-0 w-full sm:w-auto">
          <TabsTrigger
            value="active-subscriptions"
            className="rounded-full px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--deep-saffron)] data-[state=active]:to-bb-accent data-[state=active]:text-black text-slate-600 dark:text-slate-400 font-semibold transition-all data-[state=active]:shadow-md"
          >
            <Users className="h-4 w-4 mr-2" />
            Active Subscriptions
          </TabsTrigger>
          <TabsTrigger
            value="plans"
            className="rounded-full px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--deep-saffron)] data-[state=active]:to-bb-accent data-[state=active]:text-black text-slate-600 dark:text-slate-400 font-semibold transition-all data-[state=active]:shadow-md"
          >
            <Crown className="h-4 w-4 mr-2" />
            Pricing Plans
          </TabsTrigger>
          <TabsTrigger
            value="payment-gateways"
            className="rounded-full px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--deep-saffron)] data-[state=active]:to-bb-accent data-[state=active]:text-black text-slate-600 dark:text-slate-400 font-semibold transition-all data-[state=active]:shadow-md"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Global Gateways
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active-subscriptions" className="focus:outline-none animate-vg-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[var(--deep-saffron)] to-[var(--peacock-teal)]" />
                        Tenant Billing List
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Review active subscriptions and entitlement limits.</p>
                </div>
            </div>
            
            <SubscriptionsTable
                subscriptions={subscriptions}
                isLoading={isLoading}
                onEdit={handleOpenEditForm}
                onDelete={handleDeleteSubscription}
            />
        </TabsContent>

        <TabsContent value="plans" className="focus:outline-none animate-vg-fade-in-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[var(--deep-saffron)] to-[var(--peacock-teal)]" />
                    Available Configurations
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Global subscription tiers that can be offered to tenants.</p>
            </div>
            <EnhancedButton className="bg-[var(--peacock-teal)] text-white hover:bg-[var(--peacock-teal)]/90 relative overflow-hidden group">
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <Plus className="mr-2 h-4 w-4" /> Create Tier
            </EnhancedButton>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3 items-stretch max-w-5xl">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onToggle={(id) => {}}
                onEdit={(id) => {}}
              />
            ))}
            
            {plans.length === 0 && (
                <div className="col-span-full py-16 text-center flex flex-col items-center bg-white/70 dark:bg-[var(--night-ink)]/60 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-white/[0.07] border-dashed">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <Inbox className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">No Configured Plans</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mb-6">There are currently no plan tiers configured globally.</p>
                    <EnhancedButton className="bg-[var(--peacock-teal)] text-white hover:bg-[var(--peacock-teal)]/90">
                        <Plus className="mr-2 h-4 w-4" /> Create First Tier
                    </EnhancedButton>
                </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="payment-gateways" className="focus:outline-none animate-vg-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[var(--deep-saffron)] to-[var(--peacock-teal)]" />
                        Routing Configuration
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Configure financial processors and payment gateways.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {gateways.length === 0 ? (
                    <div className="col-span-full py-16 text-center flex flex-col items-center bg-white/70 dark:bg-[var(--night-ink)]/60 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-white/[0.07] border-dashed">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <CreditCard className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">No Payment Gateways</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-6">No payment gateways have been configured yet. Start accepting payments by adding a gateway.</p>
                        <EnhancedButton className="bg-[var(--peacock-teal)] text-white hover:bg-[var(--peacock-teal)]/90" onClick={() => {
                            toast({ title: "Coming soon", description: "Gateway addition modal will be ready in the next update." });
                        }}>
                            <Plus className="mr-2 h-4 w-4" /> Add Gateway
                        </EnhancedButton>
                    </div>
                ) : (
                    gateways.map((gateway: any) => (
                        <div 
                            key={gateway.id} 
                            className={cn(
                                "flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-2xl border transition-all duration-300",
                                "bg-white/70 dark:bg-[var(--night-ink)]/60 backdrop-blur-md",
                                gateway.isConfigured ? "border-[var(--peacock-teal)]/30 hover:border-[var(--peacock-teal)] shadow-sm" : "border-slate-200/60 dark:border-white/[0.07] grayscale-[10%]"
                            )}
                        >
                            <div className="flex items-center gap-4 mb-4 sm:mb-0">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200/50 dark:border-white/[0.05]">
                                    <CreditCard className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 tracking-tight">{gateway.name}</h3>
                                        {gateway.isActive ? (
                                            <Badge className="bg-[var(--peacock-teal)]/10 text-[var(--peacock-teal)] border-0 text-[10px] uppercase font-bold tracking-wider hover:bg-[var(--peacock-teal)]/20 shadow-none">Active</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-500 border-slate-200 dark:border-slate-700 text-[10px] uppercase font-bold tracking-wider bg-transparent shadow-none">Disconnected</Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{gateway.description || `Payment processor: ${gateway.slug}`}</p>
                                </div>
                            </div>
                            <Button 
                                variant="secondary" 
                                className={cn(
                                    "shrink-0 shadow-none border", 
                                    gateway.isConfigured ? "bg-[var(--peacock-teal)]/5 text-[var(--peacock-teal)] border-[var(--peacock-teal)]/20 hover:bg-[var(--peacock-teal)] hover:text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/[0.07] hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                {gateway.isConfigured ? "Configure Routing" : "Setup Connection"}
                            </Button>
                        </div>
                    ))
                )}
            </div>
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
    </div>
  );
}