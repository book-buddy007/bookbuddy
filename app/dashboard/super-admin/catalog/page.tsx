'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '@/lib/query-keys';
import {
  getSuperAdminCatalogStats,
  getGlobalCatalogBooks,
  getPendingCatalogApprovals,
  getGlobalPublishers,
  updateGlobalPublishStatus,
  updateBookAccessTier,
  toggleGlobalPublisherStatus,
  triggerBookEmbedding,
  getCatalogBin,
  restoreCatalogBook,
  backfillCatalogGraphs
} from '@/lib/api/adminApi';
import { StatPill } from '@/components/ui/stat-pill';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { 
  BookOpen, 
  CheckCircle, 
  Hourglass, 
  Library, 
  MoreHorizontal,
  MoreVertical,
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Crown,
  Sparkles,
  Zap,
  Globe,
  Building2,
  XCircle,
  Plus,
  FileText,
  Headphones,
  BookOpenCheck,
  BrainCircuit,
  Loader2,
  Eye,
  Trash2,
  FilePlus,
  Languages,
  Hash,
  Pencil,
  BookMarked,
  Inbox,
  RotateCcw,
  Network,
  Trash,
} from '@/components/ui/icons';

import { AddBookWizard } from './AddBookWizard';
import { BookDetailDrawer } from './BookDetailDrawer';
import { DeleteBookDialog } from './DeleteBookDialog';
import { PurgeBookDialog } from './PurgeBookDialog';
import { AddFormatDialog } from './AddFormatDialog';
import { EditBookDialog } from './EditBookDialog';
import { EmbeddingProgressDialog } from './EmbeddingProgressDialog';

// Format badge helper
const FORMAT_BADGE_CONFIG: Record<string, { icon: any; label: string; active: string; inactive: string }> = {
  PDF: { icon: FileText, label: 'PDF', active: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800', inactive: 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700' },
  EPUB: { icon: BookOpenCheck, label: 'EPUB', active: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800', inactive: 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700' },
  AUDIOBOOK: { icon: Headphones, label: 'Audio', active: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800', inactive: 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700' },
};

const FormatBadges = ({ bookFormats }: { bookFormats?: { type: string }[] }) => {
  const available = new Set((bookFormats || []).map(f => f.type));
  return (
    <div className="flex items-center gap-1">
      {Object.entries(FORMAT_BADGE_CONFIG).map(([key, cfg]) => {
        const Icon = cfg.icon;
        const isActive = available.has(key);
        return (
          <TooltipProvider key={key} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${isActive ? cfg.active : cfg.inactive}`}>
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {cfg.label}: {isActive ? '✅ Uploaded' : '❌ Not uploaded'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};

// UI Helpers for tiers
const TierBadge = ({ tier }: { tier: string }) => {
  switch (tier) {
    case 'DIAMOND':
      return (
        <Badge variant="outline" className="bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]">
          <Sparkles className="h-3 w-3 mr-1" /> DIAMOND
        </Badge>
      );
    case 'GOLD':
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]">
          <Crown className="h-3 w-3 mr-1" /> GOLD
        </Badge>
      );
    case 'SILVER':
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 shadow-[0_0_10px_rgba(148,163,184,0.3)]">
          <ShieldCheck className="h-3 w-3 mr-1" /> SILVER
        </Badge>
      );
    case 'BRONZE':
      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 shadow-[0_0_10px_rgba(234,88,12,0.3)]">
          <Zap className="h-3 w-3 mr-1" /> BRONZE
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-transparent">
          FREE
        </Badge>
      );
  }
};

export default function SuperAdminCatalogPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'GLOBAL' | 'PENDING' | 'PUBLISHERS' | 'BIN'>('GLOBAL');

  // Add Book Modal state
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);

  // Track image load errors
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // View Detail Drawer
  const [viewBookId, setViewBookId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Delete (→ Bin) Dialog
  const [deleteBook, setDeleteBook] = useState<{ id: string; title: string; author: string } | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Purge (permanent, from Bin) Dialog
  const [purgeBook, setPurgeBook] = useState<{ id: string; title: string; author: string } | null>(null);
  const [isPurgeOpen, setIsPurgeOpen] = useState(false);

  // Bin tab
  const [binPage, setBinPage] = useState(1);

  // Indexing progress — opens on trigger and watches the run through.
  const [embedBook, setEmbedBook] = useState<{ id: string; title: string } | null>(null);
  const [isEmbedProgressOpen, setIsEmbedProgressOpen] = useState(false);

  // Edit Dialog
  const [editBook, setEditBook] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Add Format Dialog
  const [formatBook, setFormatBook] = useState<{ id: string; title: string; bookFormats?: { type: string; partIndex?: number }[] } | null>(null);
  const [isFormatOpen, setIsFormatOpen] = useState(false);

  // Track recently created books for "NEW" badge
  const [newBookIds, setNewBookIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const markBookAsNew = useCallback((bookId: string) => {
    setNewBookIds(prev => new Set(prev).add(bookId));
    // Auto-fade the badge after 8 seconds
    const timer = setTimeout(() => {
      setNewBookIds(prev => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
      timersRef.current.delete(bookId);
    }, 8000);
    timersRef.current.set(bookId, timer);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Tab: GLOBAL
  const [globalPage, setGlobalPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Tab: PENDING
  const [pendingPage, setPendingPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setGlobalPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // --- React Query Data Fetching ---

  const { data: statsData } = useQuery({
    queryKey: catalogKeys.stats(),
    queryFn: async () => {
      const res = await getSuperAdminCatalogStats();
      return res.success ? (res.data || { globalBooks: 0, pendingApprovals: 0, byTier: {} }) : null;
    },
    refetchInterval: 30000,
  });

  const { data: globalData, isLoading: isLoadingGlobal, isFetching: isFetchingGlobal, refetch: refetchGlobal } = useQuery({
    queryKey: catalogKeys.list({ page: globalPage, limit: 10, search: debouncedSearch }),
    queryFn: async () => {
      const res = await getGlobalCatalogBooks({ page: globalPage, limit: 10, search: debouncedSearch || undefined });
      return res.success ? res.data : null;
    },
    enabled: activeTab === 'GLOBAL',
  });

  const { data: pendingData, isLoading: isLoadingPending } = useQuery({
    queryKey: catalogKeys.pending({ page: pendingPage, limit: 10 }),
    queryFn: async () => {
      const res = await getPendingCatalogApprovals({ page: pendingPage, limit: 10 });
      return res.success ? res.data : null;
    },
    enabled: activeTab === 'PENDING',
  });

  const { data: publishersData, isLoading: isLoadingPublishers } = useQuery({
    queryKey: catalogKeys.publishers(),
    queryFn: async () => {
      const res = await getGlobalPublishers();
      return res.success ? (res.data || []) : [];
    },
    enabled: activeTab === 'PUBLISHERS',
  });

  const { data: binData, isLoading: isLoadingBin } = useQuery({
    queryKey: catalogKeys.bin({ page: binPage, limit: 10 }),
    queryFn: async () => {
      const res = await getCatalogBin({ page: binPage, limit: 10 });
      return res.success ? res.data : null;
    },
    enabled: activeTab === 'BIN',
  });

  // --- Mutations ---

  const approveMutation = useMutation({
    mutationFn: (id: string) => updateGlobalPublishStatus(id, 'APPROVED'),
    onSuccess: () => {
      toast({ title: 'Book Approved to Global Library' });
      queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason?: string }) => updateGlobalPublishStatus(id, 'REJECTED', reason),
    onSuccess: () => {
      toast({ title: 'Submission Rejected' });
      queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const tierMutation = useMutation({
    mutationFn: ({ id, tier }: { id: string, tier: string }) => updateBookAccessTier(id, tier as any),
    onSuccess: () => {
      toast({ title: 'Access Tier Updated' });
      queryClient.invalidateQueries({ queryKey: catalogKeys.lists() });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const publisherStatusMutation = useMutation({
    mutationFn: ({ id, val }: { id: string, val: boolean }) => toggleGlobalPublisherStatus(id, val),
    onSuccess: (_, { val }) => {
      toast({ title: `Publisher status updated to ${val ? 'Enabled' : 'Disabled'}` });
      queryClient.invalidateQueries({ queryKey: catalogKeys.publishers() });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreCatalogBook(id),
    onSuccess: (res) => {
      if (res.success) {
        toast({ title: '♻️ Restored', description: 'The book is back in the library.' });
        queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      } else {
        toast({ title: 'Restore Failed', description: res.error, variant: 'destructive' });
      }
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  const backfillMutation = useMutation({
    mutationFn: () => backfillCatalogGraphs(false),
    onSuccess: (res) => {
      if (res.success) {
        const n = res.data?.queued ?? 0;
        toast({
          title: n > 0 ? `🧠 Generating maps for ${n} book${n === 1 ? '' : 's'}` : 'All maps already generated',
          description: n > 0 ? 'Concept maps are building in the background; they appear in the reader as each finishes.' : 'Every ingested book already has a map.',
        });
      } else {
        toast({ title: 'Backfill Failed', description: res.error, variant: 'destructive' });
      }
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });


  const globalBooks = globalData?.data || [];
  const globalMeta = globalData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };
  const pendingBooks = pendingData?.data || [];
  const pendingMeta = pendingData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };
  const publishers = publishersData || [];
  const binBooks = binData?.data || [];
  const binMeta = binData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const premiumBooksCount = statsData ? (
    (statsData.byTier?.BRONZE || 0) +
    (statsData.byTier?.SILVER || 0) +
    (statsData.byTier?.GOLD || 0) +
    (statsData.byTier?.DIAMOND || 0)
  ) : 0;

  return (
    <div className="p-3 md:p-6 space-y-6">
      {/* ── Page Header — Indic Premium Gradient ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-10 shadow-2xl mb-8 border border-white/10" style={{background: 'linear-gradient(135deg, var(--night-ink) 0%, var(--indigo-deep) 30%, var(--peacock-teal) 60%, var(--deep-saffron) 100%)'}}>
        <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")'}} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--deep-saffron)]/[0.15] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-[var(--deep-saffron)] mr-2 animate-pulse"></span>
              Content Library
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm font-display">
               Global Library Management
            </h1>
            <p className="text-indigo-100/90 text-lg max-w-xl font-medium">
               Manage the platform-wide book library. Add books, set access tiers, review institutional submissions, and control publisher permissions.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <EnhancedButton
              size="lg"
              variant="outline"
              className="shrink-0 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md font-semibold"
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending}
              title="Generate concept maps for ingested books that don't have one yet"
            >
              {backfillMutation.isPending ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Generating…</>
              ) : (
                <><Network className="h-5 w-5 mr-2" /> Backfill Maps</>
              )}
            </EnhancedButton>
            <EnhancedButton
              size="lg"
              className="shrink-0 bg-gradient-to-r from-[var(--deep-saffron)] to-bb-accent hover:from-bb-accent hover:to-bb-accent text-black shadow-lg shadow-[var(--deep-saffron)]/20 border-transparent font-bold"
              onClick={() => setIsAddBookOpen(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Book to Library
            </EnhancedButton>
          </div>
        </div>

        {/* Format indicators — warm-toned pills */}
        <div className="relative z-10 mt-6 flex flex-wrap gap-3">
          {[
            { icon: FileText, label: 'PDF', color: 'bg-red-400/15 text-red-100 border-red-400/20' },
            { icon: BookOpenCheck, label: 'EPUB', color: 'bg-emerald-400/15 text-emerald-100 border-emerald-400/20' },
            { icon: Headphones, label: 'Audiobook', color: 'bg-amber-400/15 text-amber-100 border-amber-400/20' },
            { icon: BrainCircuit, label: 'AI-Embedded', color: 'bg-cyan-400/15 text-cyan-100 border-cyan-400/20' },
          ].map(f => (
            <span key={f.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 backdrop-blur-sm ${f.color}`}>
              <f.icon className="h-3.5 w-3.5" />
              {f.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Stat Pills (Indic Theme) ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatPill
          label="Global Books"
          value={statsData?.globalBooks?.toString() || "0"}
          icon={<Globe className="h-5 w-5" />}
          accent="indigo"
          delayMs={0}
          subLabel="Platform-wide library"
        />
        <StatPill
          label="Pending Approvals"
          value={statsData?.pendingApprovals?.toString() || "0"}
          icon={<Hourglass className="h-5 w-5" />}
          accent="saffron"
          delayMs={80}
          subLabel="Awaiting review"
        />
        <StatPill
          label="Premium Gated"
          value={premiumBooksCount.toString()}
          icon={<Crown className="h-5 w-5" />}
          accent="gold"
          delayMs={160}
          subLabel="Bronze + Silver + Gold + Diamond"
        />
        <StatPill
          label="Supported Formats"
          value="4"
          icon={<BookOpen className="h-5 w-5" />}
          accent="teal"
          delayMs={240}
          subLabel="PDF · EPUB · Audio · AI"
        />
      </div>

      {/* ── Wizard + Dialogs + Drawers ── */}
      <AddBookWizard 
        open={isAddBookOpen} 
        onOpenChange={setIsAddBookOpen}
        onBookCreated={markBookAsNew}
      />
      <BookDetailDrawer open={isViewerOpen} onOpenChange={setIsViewerOpen} bookId={viewBookId} />
      <DeleteBookDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} book={deleteBook} />
      <PurgeBookDialog open={isPurgeOpen} onOpenChange={setIsPurgeOpen} book={purgeBook} />
      <AddFormatDialog open={isFormatOpen} onOpenChange={setIsFormatOpen} book={formatBook} />
      <EditBookDialog open={isEditOpen} onOpenChange={setIsEditOpen} book={editBook} />
      <EmbeddingProgressDialog
        open={isEmbedProgressOpen}
        onOpenChange={setIsEmbedProgressOpen}
        bookId={embedBook?.id ?? null}
        bookTitle={embedBook?.title}
      />

      {/* Tabs — Premium Indic Navigation */}
      <div className="relative bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] backdrop-blur-xl overflow-hidden">
        {/* Decorative top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-bb-cobalt via-bb-cobalt to-bb-accent" />
        
        <div className="flex p-1.5 md:p-2 gap-1 md:gap-1.5 overflow-x-auto scrollbar-hide">
          {[
            { key: 'GLOBAL' as const, label: 'All Global Books', shortLabel: 'Global', icon: Globe, accent: 'from-bb-cobalt to-bb-cobalt' },
            { key: 'PENDING' as const, label: 'Approval Requests', shortLabel: 'Pending', icon: Hourglass, count: statsData?.pendingApprovalsCount, accent: 'from-bb-accent to-bb-accent' },
            { key: 'PUBLISHERS' as const, label: 'Institutional Publishers', shortLabel: 'Publishers', icon: Building2, accent: 'from-bb-cobalt to-bb-cobalt' },
            { key: 'BIN' as const, label: 'Recycle Bin', shortLabel: 'Bin', icon: Trash, accent: 'from-bb-danger to-bb-danger' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 min-w-0 flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2.5 px-3 md:px-5 py-3 md:py-3 rounded-xl text-xs md:text-sm font-semibold transition-all duration-300 whitespace-nowrap group ${
                activeTab === tab.key
                  ? 'bg-slate-50 dark:bg-white/[0.06] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50/60 dark:hover:bg-white/[0.03]'
              }`}
            >
              {/* Active underline bar */}
              {activeTab === tab.key && (
                <div className={`absolute bottom-0 left-3 right-3 md:left-4 md:right-4 h-[2.5px] rounded-full bg-gradient-to-r ${tab.accent}`} />
              )}
              <tab.icon className={`h-4 w-4 md:h-[18px] md:w-[18px] shrink-0 transition-colors duration-300 ${
                activeTab === tab.key ? 'text-bb-text dark:text-bb-accent' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'
              }`} />
              {/* Show short label on mobile, full label on md+ */}
              <span className="md:hidden truncate">{tab.shortLabel}</span>
              <span className="hidden md:inline">{tab.label}</span>
              {(tab.count || 0) > 0 && (
                <span className="relative ml-0 md:ml-1">
                  <span className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 animate-ping opacity-30" />
                  <span className="relative bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {tab.count}
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content: GLOBAL */}
      {activeTab === 'GLOBAL' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 transition-colors peer-focus:text-indigo-500" />
              <Input
                placeholder="Search by title, author, ISBN..."
                className="pl-9 bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/40 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all peer rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <EnhancedButton variant="outline" size="icon" onClick={() => refetchGlobal()} disabled={isFetchingGlobal} className="rounded-xl border-slate-200/60 dark:border-slate-700/40">
              <RefreshCw className={`h-4 w-4 ${isFetchingGlobal ? 'animate-spin text-indigo-600' : ''}`} />
            </EnhancedButton>
          </div>

          {/* ── Loading State ── */}
          {isLoadingGlobal ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-muted-foreground mt-3">Loading library...</p>
            </div>
          ) : globalBooks.length === 0 ? (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl scale-150" />
                <div className="relative flex items-center justify-center h-20 w-20 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                  <BookMarked className="h-10 w-10 text-indigo-400 dark:text-indigo-500" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">No books found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5 text-center max-w-xs">
                {search ? `No results for "${search}". Try a different search term.` : 'Your global library is empty. Add your first book to get started.'}
              </p>
              {!search && (
                <EnhancedButton onClick={() => setIsAddBookOpen(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20 rounded-xl">
                  <Plus className="h-4 w-4 mr-2" /> Add First Book
                </EnhancedButton>
              )}
            </div>
          ) : (
            <>
              {/* ═══ Mobile Card Layout (< md) ═══ */}
              <div className="md:hidden space-y-3">
                {globalBooks.map((book: any) => (
                  <div
                    key={book.id}
                    id={`book-mobile-${book.id}`}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-white/[0.04] border shadow-sm hover:shadow-md transition-all ${
                      newBookIds.has(book.id)
                        ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10'
                        : 'border-slate-200/60 dark:border-white/[0.07]'
                    }`}
                  >
                    {/* Cover Thumbnail */}
                    <div
                      className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm cursor-pointer"
                      onClick={() => { setViewBookId(book.id); setIsViewerOpen(true); }}
                    >
                      {book.coverUrl && !imageErrors[book.id] ? (
                        <img src={book.coverUrl} onError={() => setImageErrors(prev => ({ ...prev, [book.id]: true }))} className="w-full h-full object-cover" alt={book.title} />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full text-slate-400 dark:text-slate-600">
                          <BookOpen className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 cursor-pointer"
                          onClick={() => { setViewBookId(book.id); setIsViewerOpen(true); }}
                        >
                          {book.title}
                        </p>
                        {newBookIds.has(book.id) && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-500 text-white rounded-full animate-pulse">NEW</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-white/40 line-clamp-1">{book.author}</p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <TierBadge tier={book.accessTier} />
                        <FormatBadges bookFormats={book.bookFormats} />
                        {book.embeddingStatus && book.embeddingStatus !== 'NONE' && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800">
                            <BrainCircuit className="h-2.5 w-2.5 mr-0.5" /> AI
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Three-dot menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/[0.06] -mt-1 -mr-1 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onSelect={() => setTimeout(() => { setViewBookId(book.id); setIsViewerOpen(true); }, 100)}>
                          <Eye className="h-4 w-4 mr-2 text-indigo-500" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setTimeout(() => { setFormatBook({ id: book.id, title: book.title, bookFormats: book.bookFormats }); setIsFormatOpen(true); }, 100)}>
                          <FilePlus className="h-4 w-4 mr-2 text-emerald-500" /> Add Format
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setTimeout(() => { setDeleteBook({ id: book.id, title: book.title, author: book.author }); setIsDeleteOpen(true); }, 100)}
                          className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Move to Bin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>

              {/* ═══ Desktop Table (≥ md) ═══ */}
              <div className="hidden md:block rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-[640px]">
                    <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Book Details</TableHead>
                        <TableHead className="hidden lg:table-cell">Genres</TableHead>
                        <TableHead>Formats</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead className="hidden lg:table-cell">Status</TableHead>
                        <TableHead className="text-right w-[60px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalBooks.map((book: any, idx: number) => (
                        <TableRow
                          key={book.id}
                          className={`group transition-colors ${
                            newBookIds.has(book.id)
                              ? 'bg-emerald-50/50 dark:bg-emerald-900/10 ring-1 ring-emerald-200 dark:ring-emerald-800'
                              : idx % 2 === 1
                                ? 'bg-slate-50/30 dark:bg-slate-800/20'
                                : ''
                          } hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20`}
                          id={`book-${book.id}`}
                        >
                          {/* Cover Thumbnail */}
                          <TableCell className="pr-0">
                            <div
                              className="h-14 w-10 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 overflow-hidden ring-1 ring-slate-200/80 dark:ring-slate-700/80 shadow-sm flex-shrink-0 cursor-pointer hover:shadow-lg hover:ring-indigo-300 dark:hover:ring-indigo-700 transition-all"
                              onClick={() => { setViewBookId(book.id); setIsViewerOpen(true); }}
                            >
                              {book.coverUrl && !imageErrors[book.id] ? (
                                <img src={book.coverUrl} onError={() => setImageErrors(prev => ({ ...prev, [book.id]: true }))} className="h-full w-full object-cover" alt={book.title} />
                              ) : (
                                <div className="flex items-center justify-center h-full w-full text-slate-400 dark:text-slate-600">
                                  <BookOpen className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Book Details */}
                          <TableCell>
                            <div className="flex flex-col min-w-0 max-w-[240px] xl:max-w-sm">
                              <div className="flex items-center gap-2">
                                <span
                                  className="font-semibold text-sm truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                  onClick={() => { setViewBookId(book.id); setIsViewerOpen(true); }}
                                >
                                  {book.title}
                                </span>
                                {newBookIds.has(book.id) && (
                                  <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase bg-emerald-500 text-white rounded-full animate-pulse shadow-sm shadow-emerald-500/30">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground truncate">{book.author}</span>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                {book.publisher && <span className="truncate max-w-[120px]">{book.publisher}</span>}
                                {book.publisher && book.isbn && <span className="text-slate-300 dark:text-slate-700">•</span>}
                                {book.isbn && <span className="font-mono">{book.isbn}</span>}
                                {(book.publisher || book.isbn) && book.language && <span className="text-slate-300 dark:text-slate-700">•</span>}
                                {book.language && (
                                  <span className="inline-flex items-center gap-0.5"><Languages className="h-3 w-3" />{book.language}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Genres */}
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {book.categories && book.categories.length > 0 ? (
                                <>
                                  {book.categories.slice(0, 2).map((c: any) => (
                                    <Badge key={c.category?.id || c.id} variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800">
                                      {c.category?.name || c.name}
                                    </Badge>
                                  ))}
                                  {book.categories.length > 2 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">
                                      +{book.categories.length - 2}
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 italic">—</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Format Badges */}
                          <TableCell>
                            <FormatBadges bookFormats={book.bookFormats} />
                          </TableCell>

                          {/* Tier */}
                          <TableCell>
                            <TierBadge tier={book.accessTier} />
                          </TableCell>

                          {/* Status */}
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 w-fit ${
                                book.catalogScope === 'GLOBAL'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                              }`}>
                                {book.catalogScope === 'GLOBAL' ? <Globe className="h-3 w-3 mr-0.5" /> : <Building2 className="h-3 w-3 mr-0.5" />}
                                {book.catalogScope}
                              </Badge>
                              {book.embeddingStatus && book.embeddingStatus !== 'NONE' && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 w-fit bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800">
                                  <BrainCircuit className="h-3 w-3 mr-0.5" />
                                  AI: {book.embeddingStatus}
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <EnhancedButton variant="ghost" size="icon" className="opacity-60 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </EnhancedButton>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onSelect={() => setTimeout(() => { setViewBookId(book.id); setIsViewerOpen(true); }, 100)}>
                                  <Eye className="h-4 w-4 mr-2 text-indigo-500" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setTimeout(() => { setFormatBook({ id: book.id, title: book.title, bookFormats: book.bookFormats }); setIsFormatOpen(true); }, 100)}>
                                  <FilePlus className="h-4 w-4 mr-2 text-emerald-500" /> Add Format
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setTimeout(() => { setEditBook(book); setIsEditOpen(true); }, 100)}>
                                  <Pencil className="h-4 w-4 mr-2 text-amber-500" /> Edit Metadata
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">Access Tier</DropdownMenuLabel>
                                <div className="flex flex-wrap gap-1 px-2 py-1">
                                  {['FREE', 'BRONZE', 'SILVER', 'GOLD', 'DIAMOND'].map(t => (
                                    <button
                                      key={t}
                                      onClick={() => tierMutation.mutate({ id: book.id, tier: t })}
                                      disabled={tierMutation.isPending}
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                                        book.accessTier === t
                                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-300 ring-1 ring-indigo-400/30'
                                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:border-slate-300'
                                      }`}
                                    >
                                      {t}
                                    </button>
                                  ))}
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={async () => {
                                    // Was a hand-rolled POST to /api/admin/books/:id/embed. That
                                    // path falls through the /api/admin/[...path] catch-all, which
                                    // rewrites everything to ${BACKEND}/api/super-admin/* — but
                                    // EmbeddingController is mounted at api/books, so the request
                                    // resolved to a route that does not exist and the item could
                                    // only ever 404. `triggerBookEmbedding` uses the dedicated
                                    // /api/books/:id/embed proxy that was built for exactly this.
                                    const res = await triggerBookEmbedding(book.id);
                                    if (res.success) {
                                      toast({ title: '✅ Indexing Queued', description: `"${book.title}" is being indexed.` });
                                      // Watch it through rather than leaving a toast as the only
                                      // signal — a run can fail a few seconds later, and the reason
                                      // is the thing worth reading.
                                      setEmbedBook({ id: book.id, title: book.title });
                                      setIsEmbedProgressOpen(true);
                                    } else {
                                      toast({ title: '❌ Indexing Failed', description: res.error || 'Could not queue indexing.', variant: 'destructive' });
                                    }
                                  }}
                                >
                                  <BrainCircuit className="h-4 w-4 mr-2 text-cyan-500" /> Trigger AI Embed
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onSelect={() => setTimeout(() => { setDeleteBook({ id: book.id, title: book.title, author: book.author }); setIsDeleteOpen(true); }, 100)}
                                  className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/30"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Move to Bin
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* ── Pagination ── */}
              <div className="flex justify-between items-center px-1 pt-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{globalBooks.length}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{globalMeta.total}</span> books
                  {globalMeta.totalPages > 1 && <span className="ml-1.5 text-slate-400 dark:text-slate-500">• Page {globalMeta.page} of {globalMeta.totalPages}</span>}
                </span>
                <div className="flex gap-2">
                  <EnhancedButton variant="outline" size="sm" onClick={() => setGlobalPage(p => Math.max(1, p - 1))} disabled={globalMeta.page <= 1} className="rounded-xl border-slate-200/60 dark:border-slate-700/40 disabled:opacity-40">
                    ← Prev
                  </EnhancedButton>
                  <EnhancedButton variant="outline" size="sm" onClick={() => setGlobalPage(p => p + 1)} disabled={globalMeta.page >= globalMeta.totalPages} className="rounded-xl border-slate-200/60 dark:border-slate-700/40 disabled:opacity-40">
                    Next →
                  </EnhancedButton>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab Content: PENDING */}
      {activeTab === 'PENDING' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
                <TableRow>
                  <TableHead>Book Details</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPending ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto" /><p className="text-sm text-muted-foreground mt-2">Loading requests...</p></TableCell></TableRow>
                ) : pendingBooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16">
                      <div className="relative inline-block mb-4">
                        <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl scale-150" />
                        <div className="relative flex items-center justify-center h-16 w-16 mx-auto bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                          <Inbox className="h-8 w-8 text-emerald-400 dark:text-emerald-500" />
                        </div>
                      </div>
                      <p className="text-lg font-bold text-slate-800 dark:text-white">All caught up!</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">No pending submissions to review.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingBooks.map((book: any, idx: number) => (
                    <TableRow key={book.id} className={`transition-colors ${idx % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''} hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">{book.title}</span>
                          <span className="text-xs text-muted-foreground">{book.author}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span>{book.tenant?.name || 'Unknown Institution'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(book.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <EnhancedButton
                            size="sm"
                            variant="outline"
                            className="text-teal-600 border-teal-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 dark:text-teal-400 dark:border-teal-800 dark:hover:bg-teal-950/30 rounded-lg"
                            onClick={() => approveMutation.mutate(book.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Approve
                          </EnhancedButton>
                          <EnhancedButton
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30 rounded-lg"
                            onClick={() => {
                              const reason = prompt("Enter rejection reason (optional):");
                              if (reason !== null) rejectMutation.mutate({ id: book.id, reason: reason || undefined });
                            }}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </EnhancedButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
            <div className="flex justify-between items-center p-4 border-t border-slate-200/60 dark:border-slate-700/40">
               <span className="text-sm text-slate-500 dark:text-slate-400">Total: <span className="font-semibold text-slate-700 dark:text-slate-300">{pendingMeta.total}</span></span>
               <div className="flex gap-2">
                 <EnhancedButton variant="outline" size="sm" onClick={() => setPendingPage(p => Math.max(1, p - 1))} disabled={pendingMeta.page <= 1} className="rounded-xl border-slate-200/60 dark:border-slate-700/40 disabled:opacity-40">Prev</EnhancedButton>
                 <EnhancedButton variant="outline" size="sm" onClick={() => setPendingPage(p => p + 1)} disabled={pendingMeta.page >= pendingMeta.totalPages} className="rounded-xl border-slate-200/60 dark:border-slate-700/40 disabled:opacity-40">Next</EnhancedButton>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: PUBLISHERS */}
      {activeTab === 'PUBLISHERS' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
                <TableRow>
                  <TableHead>Institution Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Global Publisher</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPublishers ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto" /><p className="text-sm text-muted-foreground mt-2">Loading publishers...</p></TableCell></TableRow>
                ) : publishers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16">
                      <div className="relative inline-block mb-4">
                        <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-2xl scale-150" />
                        <div className="relative flex items-center justify-center h-16 w-16 mx-auto bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30 rounded-2xl border border-purple-100 dark:border-purple-900/40">
                          <Building2 className="h-8 w-8 text-purple-400 dark:text-purple-500" />
                        </div>
                      </div>
                      <p className="text-lg font-bold text-slate-800 dark:text-white">No institutions found</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Institutions will appear here once they register.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  publishers.map((pub: any, idx: number) => (
                    <TableRow key={pub.id} className={`transition-colors ${idx % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''} hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20`}>
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{pub.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{pub.domain}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={pub.isGlobalPublisher
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }
                        >
                          {pub.isGlobalPublisher ? '✓ Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <EnhancedButton 
                          size="sm" 
                          variant={pub.isGlobalPublisher ? 'outline' : 'default'} 
                          className={!pub.isGlobalPublisher
                            ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm rounded-lg'
                            : 'text-slate-600 border-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800 rounded-lg'
                          }
                          onClick={() => publisherStatusMutation.mutate({ id: pub.id, val: !pub.isGlobalPublisher })}
                          disabled={publisherStatusMutation.isPending}
                        >
                          {pub.isGlobalPublisher ? 'Disable Access' : 'Grant Access'}
                        </EnhancedButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: BIN */}
      {activeTab === 'BIN' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-red-200/60 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 p-4">
            <Trash className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Books here are hidden from the library but not yet deleted. <strong>Restore</strong> puts a book back; <strong>Delete Forever</strong> permanently removes it and flushes its files, embeddings and concept map — this cannot be undone.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
                  <TableRow>
                    <TableHead>Book Details</TableHead>
                    <TableHead className="hidden lg:table-cell">Formats</TableHead>
                    <TableHead>Deleted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingBin ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto" /><p className="text-sm text-muted-foreground mt-2">Loading Bin…</p></TableCell></TableRow>
                  ) : binBooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-16">
                        <div className="relative inline-block mb-4">
                          <div className="absolute inset-0 bg-slate-500/10 rounded-full blur-2xl scale-150" />
                          <div className="relative flex items-center justify-center h-16 w-16 mx-auto bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/40 dark:to-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700/40">
                            <Trash className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                          </div>
                        </div>
                        <p className="text-lg font-bold text-slate-800 dark:text-white">The Bin is empty</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Deleted books will appear here.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    binBooks.map((book: any, idx: number) => (
                      <TableRow key={book.id} className={`transition-colors ${idx % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''} hover:bg-red-50/30 dark:hover:bg-red-950/10`}>
                        <TableCell>
                          <div className="flex flex-col min-w-0 max-w-[280px]">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">{book.title}</span>
                            <span className="text-xs text-muted-foreground truncate">{book.author}</span>
                            {book.isbn && <span className="text-[11px] font-mono text-slate-400">{book.isbn}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <FormatBadges bookFormats={book.bookFormats} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {book.deletedAt ? new Date(book.deletedAt).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <EnhancedButton
                              size="sm"
                              variant="outline"
                              className="text-teal-600 border-teal-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 dark:text-teal-400 dark:border-teal-800 dark:hover:bg-teal-950/30 rounded-lg"
                              onClick={() => restoreMutation.mutate(book.id)}
                              disabled={restoreMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" /> Restore
                            </EnhancedButton>
                            <EnhancedButton
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30 rounded-lg"
                              onClick={() => { setPurgeBook({ id: book.id, title: book.title, author: book.author }); setIsPurgeOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Delete Forever
                            </EnhancedButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center p-4 border-t border-slate-200/60 dark:border-slate-700/40">
              <span className="text-sm text-slate-500 dark:text-slate-400">In Bin: <span className="font-semibold text-slate-700 dark:text-slate-300">{binMeta.total}</span></span>
              <div className="flex gap-2">
                <EnhancedButton variant="outline" size="sm" onClick={() => setBinPage(p => Math.max(1, p - 1))} disabled={binMeta.page <= 1} className="rounded-xl border-slate-200/60 dark:border-slate-700/40 disabled:opacity-40">Prev</EnhancedButton>
                <EnhancedButton variant="outline" size="sm" onClick={() => setBinPage(p => p + 1)} disabled={binMeta.page >= binMeta.totalPages} className="rounded-xl border-slate-200/60 dark:border-slate-700/40 disabled:opacity-40">Next</EnhancedButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
