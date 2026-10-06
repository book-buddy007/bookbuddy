'use client';

import { useState,useEffect,useCallback,useRef } from 'react';
import { useQuery,useMutation,useQueryClient } from '@tanstack/react-query';
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
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Segmented } from '@/components/ui/segmented';
import { StatCard } from '@/components/ui/stat-card';
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
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import {
BookOpen,
CheckCircle,MoreHorizontal,
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
Languages,Pencil,
BookMarked,
Inbox,
RotateCcw,Trash
} from '@/components/ui/icons';

import { AddBookWizard } from './AddBookWizard';
import { BookDetailDrawer } from './BookDetailDrawer';
import { DeleteBookDialog } from './DeleteBookDialog';
import { PurgeBookDialog } from './PurgeBookDialog';
import { AddFormatDialog } from './AddFormatDialog';
import { EditBookDialog } from './EditBookDialog';
import { EmbeddingProgressDialog } from './EmbeddingProgressDialog';
import { LinkSharedWorkDialog } from './LinkSharedWorkDialog';

// Format badge helper: availability is shown by icon + label; colour only marks "uploaded".
const FORMAT_BADGE_CONFIG: Record<string, { icon: any; label: string; active: string; inactive: string }> = {
  PDF: { icon: FileText, label: 'PDF', active: 'bg-bb-accent-soft text-bb-accent-ink', inactive: 'bg-bb-surface-2 text-bb-faint' },
  EPUB: { icon: BookOpenCheck, label: 'EPUB', active: 'bg-bb-accent-soft text-bb-accent-ink', inactive: 'bg-bb-surface-2 text-bb-faint' },
  AUDIOBOOK: { icon: Headphones, label: 'Audio', active: 'bg-bb-accent-soft text-bb-accent-ink', inactive: 'bg-bb-surface-2 text-bb-faint' },
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
                <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${isActive ? cfg.active : cfg.inactive}`}>
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {cfg.label}: {isActive ? 'Uploaded' : 'Not uploaded'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};

// UI helper for access tiers
const TIER_STYLE: Record<string, { cls: string; icon?: any }> = {
  DIAMOND: { cls: 'bg-bb-info-soft text-bb-info-ink', icon: Sparkles },
  GOLD: { cls: 'bg-bb-warning-soft text-bb-warning-ink', icon: Crown },
  SILVER: { cls: 'bg-bb-surface-2 text-bb-text', icon: ShieldCheck },
  BRONZE: { cls: 'bg-bb-accent-soft text-bb-accent-ink', icon: Zap },
};

const TierBadge = ({ tier }: { tier: string }) => {
  const s = TIER_STYLE[tier];
  if (!s) {
    return <span className="inline-flex h-7 items-center rounded-lg bg-bb-surface-2 px-3 text-[13px] font-semibold text-bb-muted">FREE</span>;
  }
  const TierIcon = s.icon;
  return (
    <span className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold ${s.cls}`}>
      <TierIcon className="h-3.5 w-3.5" /> {tier}
    </span>
  );
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
  // "Link to shared library": the book being linked, and whether its dialog is open.
  const [linkBook, setLinkBook] = useState<{ id: string; title: string; isbn?: string | null; spineContentItemId?: string | null } | null>(null);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  // "Add from shared library": make a new book from a work already embedded in DigiClassroom.
  const [isCreateFromSharedOpen, setIsCreateFromSharedOpen] = useState(false);
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
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        eyebrow="Content library"
        title="Global library management"
        description="Manage the platform-wide book library. Add books, set access tiers, review institutional submissions, and control publisher permissions."
        actions={
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending}
              title="Generate concept maps for ingested books that don't have one yet"
            >
              {backfillMutation.isPending ? (
                <><Icon name="loader" size={18} className="animate-spin" /> Generating…</>
              ) : (
                <><Icon name="layers" size={18} /> Backfill maps</>
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={() => setIsCreateFromSharedOpen(true)}>
              <Icon name="globe" size={18} /> Add from shared library
            </Button>
            <Button size="lg" onClick={() => setIsAddBookOpen(true)}>
              <Icon name="plus" size={18} /> Add book to library
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Chip icon="pdf">PDF</Chip>
        <Chip icon="read">EPUB</Chip>
        <Chip icon="audiobook">Audiobook</Chip>
        <Chip icon="bot">AI-embedded</Chip>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard variant="featured" title="Global books" value={statsData?.globalBooks?.toString() || "0"} description="Platform-wide library" icon="globe" />
        <StatCard title="Pending approvals" value={statsData?.pendingApprovals?.toString() || "0"} description="Awaiting review" icon="calendar" />
        <StatCard title="Premium gated" value={premiumBooksCount.toString()} description="Bronze + Silver + Gold + Diamond" icon="crown" />
        <StatCard title="Supported formats" value="4" description="PDF · EPUB · Audio · AI" icon="library" />
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
      <LinkSharedWorkDialog
        mode="create"
        open={isCreateFromSharedOpen}
        onOpenChange={setIsCreateFromSharedOpen}
        book={null}
        onLinked={(b) => {
          // The new book's link is queued: follow it, as for linking an existing book.
          setEmbedBook(b);
          setIsEmbedProgressOpen(true);
        }}
      />
      <LinkSharedWorkDialog
        open={isLinkOpen}
        onOpenChange={setIsLinkOpen}
        book={linkBook}
        onLinked={(b) => {
          // Follow the link through, as for embedding: it can fail a few seconds later and the reason
          // (ISBN mismatch, not public, library unreachable) is what the admin needs to read.
          setEmbedBook(b);
          setIsEmbedProgressOpen(true);
        }}
      />

      {/* Tabs */}
      <div className="overflow-x-auto scrollbar-hide">
        <Segmented
          aria-label="Library section"
          value={activeTab}
          onValueChange={setActiveTab}
          options={[
            { value: 'GLOBAL', label: <><Icon name="globe" size={16} /> <span className="md:hidden">Global</span><span className="hidden md:inline">All global books</span></> },
            {
              value: 'PENDING',
              label: (
                <>
                  <Icon name="calendar" size={16} /> <span className="md:hidden">Pending</span><span className="hidden md:inline">Approval requests</span>
                  {(statsData?.pendingApprovalsCount || 0) > 0 && (
                    <span className="ml-1 rounded-full bg-bb-accent px-2 py-0.5 text-[10px] font-bold text-white">{statsData?.pendingApprovalsCount}</span>
                  )}
                </>
              ),
            },
            { value: 'PUBLISHERS', label: <><Icon name="institution" size={16} /> <span className="md:hidden">Publishers</span><span className="hidden md:inline">Institutional publishers</span></> },
            { value: 'BIN', label: <><Icon name="trash" size={16} /> <span className="md:hidden">Bin</span><span className="hidden md:inline">Recycle bin</span></> },
          ]}
        />
      </div>

      {/* Tab Content: GLOBAL */}
      {activeTab === 'GLOBAL' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 bg-bb-surface/70 backdrop-blur-xl p-4 rounded-2xl border border-bb-border/60 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-bb-faint transition-colors peer-focus:text-bb-info-ink" />
              <Input
                placeholder="Search by title, author, ISBN..."
                className="pl-9 bg-bb-surface-2/80 border-bb-border/60 focus:ring-2 focus:ring-bb-info/30 focus:border-bb-info/30 transition-all peer rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <EnhancedButton variant="outline" size="icon" onClick={() => refetchGlobal()} disabled={isFetchingGlobal} className="rounded-xl border-bb-border/60">
              <RefreshCw className={`h-4 w-4 ${isFetchingGlobal ? 'animate-spin text-bb-info-ink' : ''}`} />
            </EnhancedButton>
          </div>

          {/* ── Loading State ── */}
          {isLoadingGlobal ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-bb-info-ink animate-spin" />
              <p className="text-sm text-muted-foreground mt-3">Loading library...</p>
            </div>
          ) : globalBooks.length === 0 ? (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-bb-info/10 rounded-full blur-2xl scale-150" />
                <div className="relative flex items-center justify-center h-20 w-20 bg-bb-progress rounded-2xl border border-bb-info/30">
                  <BookMarked className="h-10 w-10 text-bb-info-ink" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-bb-text dark:text-white">No books found</h3>
              <p className="text-sm text-bb-muted mt-1 mb-5 text-center max-w-xs">
                {search ? `No results for "${search}". Try a different search term.` : 'Your global library is empty. Add your first book to get started.'}
              </p>
              {!search && (
                <EnhancedButton onClick={() => setIsAddBookOpen(true)}>
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
                    className={`flex items-start gap-3.5 p-4 rounded-2xl bg-bb-surface dark:bg-white/[0.04] border shadow-sm hover:shadow-md transition-all ${
                      newBookIds.has(book.id)
                        ? 'border-bb-success/30 bg-bb-success-soft/30'
                        : 'border-bb-border/60 dark:border-white/[0.07]'
                    }`}
                  >
                    {/* Cover Thumbnail */}
                    <div
                      className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-bb-surface-2 border border-bb-border/80 shadow-sm cursor-pointer"
                      onClick={() => { setViewBookId(book.id); setIsViewerOpen(true); }}
                    >
                      {book.coverUrl && !imageErrors[book.id] ? (
                        <img src={book.coverUrl} onError={() => setImageErrors(prev => ({ ...prev, [book.id]: true }))} className="w-full h-full object-cover" alt={book.title} />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full text-bb-faint">
                          <BookOpen className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className="font-bold text-sm text-bb-text dark:text-white line-clamp-1 cursor-pointer"
                          onClick={() => { setViewBookId(book.id); setIsViewerOpen(true); }}
                        >
                          {book.title}
                        </p>
                        {newBookIds.has(book.id) && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-bb-success text-white rounded-full animate-pulse">NEW</span>
                        )}
                      </div>
                      <p className="text-xs text-bb-muted dark:text-white/40 line-clamp-1">{book.author}</p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <TierBadge tier={book.accessTier} />
                        <FormatBadges bookFormats={book.bookFormats} />
                        {book.embeddingStatus && book.embeddingStatus !== 'NONE' && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-bb-info-soft text-bb-info-ink border-bb-info/30">
                            <BrainCircuit className="h-2.5 w-2.5 mr-0.5" /> AI
                          </Badge>
                        )}
                        {book.spineContentItemId && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-bb-info-soft text-bb-info-ink border-bb-info/30">
                            <Globe className="h-2.5 w-2.5 mr-0.5" /> Shared
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Three-dot menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-lg text-bb-faint hover:text-bb-muted hover:bg-bb-surface-2 dark:hover:bg-white/[0.06] -mt-1 -mr-1 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onSelect={() => setTimeout(() => { setViewBookId(book.id); setIsViewerOpen(true); }, 100)}>
                          <Eye className="h-4 w-4 mr-2 text-bb-info-ink" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setTimeout(() => { setFormatBook({ id: book.id, title: book.title, bookFormats: book.bookFormats }); setIsFormatOpen(true); }, 100)}>
                          <FilePlus className="h-4 w-4 mr-2 text-bb-success-ink" /> Add Format
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {book.spineContentItemId ? (
                          // A shared-library book is DigiClassroom's to remove; Book Buddy has no way to.
                          <DropdownMenuItem disabled title="This book belongs to the shared library, which DigiClassroom owns. Its files and embeddings are used by the other apps too, so it can only be removed in DigiClassroom.">
                            <Globe className="h-4 w-4 mr-2" /> Remove in DigiClassroom
                          </DropdownMenuItem>
                        ) : (
                        <DropdownMenuItem
                          onSelect={() => setTimeout(() => { setDeleteBook({ id: book.id, title: book.title, author: book.author }); setIsDeleteOpen(true); }, 100)}
                          className="text-bb-danger-ink focus:text-bb-danger-ink focus:bg-bb-danger-soft"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Move to Bin
                        </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>

              {/* ═══ Desktop Table (≥ md) ═══ */}
              <div className="hidden md:block rounded-2xl border border-bb-border/60 bg-bb-surface/80 backdrop-blur-sm shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-[640px]">
                    <TableHeader className="bg-bb-surface-2/80">
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
                              ? 'bg-bb-success-soft/50 ring-1 ring-bb-success/30'
                              : idx % 2 === 1
                                ? 'bg-bb-surface-2/30'
                                : ''
                          } hover:bg-bb-info-soft/40`}
                          id={`book-${book.id}`}
                        >
                          {/* Cover Thumbnail */}
                          <TableCell className="pr-0">
                            <div
                              className="h-14 w-10 rounded-lg bg-bb-surface-2 overflow-hidden ring-1 ring-bb-border/80 shadow-sm flex-shrink-0 cursor-pointer hover:shadow-lg hover:ring-bb-info/30 transition-all"
                              onClick={() => { setViewBookId(book.id); setIsViewerOpen(true); }}
                            >
                              {book.coverUrl && !imageErrors[book.id] ? (
                                <img src={book.coverUrl} onError={() => setImageErrors(prev => ({ ...prev, [book.id]: true }))} className="h-full w-full object-cover" alt={book.title} />
                              ) : (
                                <div className="flex items-center justify-center h-full w-full text-bb-faint">
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
                                  className="font-semibold text-sm truncate cursor-pointer hover:text-bb-info-ink transition-colors"
                                  onClick={() => { setViewBookId(book.id); setIsViewerOpen(true); }}
                                >
                                  {book.title}
                                </span>
                                {newBookIds.has(book.id) && (
                                  <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase bg-bb-success text-white rounded-full animate-pulse shadow-sm">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground truncate">{book.author}</span>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                {book.publisher && <span className="truncate max-w-[120px]">{book.publisher}</span>}
                                {book.publisher && book.isbn && <span className="text-bb-faint">•</span>}
                                {book.isbn && <span className="font-mono">{book.isbn}</span>}
                                {(book.publisher || book.isbn) && book.language && <span className="text-bb-faint">•</span>}
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
                                    <Badge key={c.category?.id || c.id} variant="outline" className="text-[10px] px-1.5 py-0 bg-bb-info-soft text-bb-info-ink border-bb-info/30">
                                      {c.category?.name || c.name}
                                    </Badge>
                                  ))}
                                  {book.categories.length > 2 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-bb-muted">
                                      +{book.categories.length - 2}
                                    </Badge>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-bb-faint italic">—</span>
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
                                  ? 'bg-bb-info-soft text-bb-info-ink border-bb-info/30'
                                  : 'bg-bb-surface-2 text-bb-muted border-bb-border'
                              }`}>
                                {book.catalogScope === 'GLOBAL' ? <Globe className="h-3 w-3 mr-0.5" /> : <Building2 className="h-3 w-3 mr-0.5" />}
                                {book.catalogScope}
                              </Badge>
                              {book.embeddingStatus && book.embeddingStatus !== 'NONE' && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 w-fit bg-bb-info-soft text-bb-info-ink border-bb-info/30">
                                  <BrainCircuit className="h-3 w-3 mr-0.5" />
                                  AI: {book.embeddingStatus}
                                </Badge>
                              )}
                              {book.spineContentItemId && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 w-fit bg-bb-info-soft text-bb-info-ink border-bb-info/30">
                                  <Globe className="h-3 w-3 mr-0.5" />
                                  Shared library
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
                                  <Eye className="h-4 w-4 mr-2 text-bb-info-ink" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setTimeout(() => { setFormatBook({ id: book.id, title: book.title, bookFormats: book.bookFormats }); setIsFormatOpen(true); }, 100)}>
                                  <FilePlus className="h-4 w-4 mr-2 text-bb-success-ink" /> Add Format
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setTimeout(() => { setEditBook(book); setIsEditOpen(true); }, 100)}>
                                  <Pencil className="h-4 w-4 mr-2 text-bb-warning-ink" /> Edit Metadata
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
                                          ? 'bg-bb-info-soft text-bb-info-ink border-bb-info/30 ring-1 ring-bb-info/30'
                                          : 'bg-bb-surface-2 text-bb-muted border-bb-border hover:bg-bb-surface-2 hover:border-bb-border'
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
                                  <BrainCircuit className="h-4 w-4 mr-2 text-bb-info-ink" /> Trigger AI Embed
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => setTimeout(() => { setLinkBook({ id: book.id, title: book.title, isbn: book.isbn, spineContentItemId: book.spineContentItemId }); setIsLinkOpen(true); }, 100)}
                                >
                                  <Globe className="h-4 w-4 mr-2 text-bb-info-ink" /> Link to shared library
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {book.spineContentItemId ? (
                                  // A shared-library book is DigiClassroom's to remove; Book Buddy has no way to.
                                  <DropdownMenuItem disabled title="This book belongs to the shared library, which DigiClassroom owns. Its files and embeddings are used by the other apps too, so it can only be removed in DigiClassroom.">
                                    <Globe className="h-4 w-4 mr-2" /> Remove in DigiClassroom
                                  </DropdownMenuItem>
                                ) : (
                                <DropdownMenuItem
                                  onSelect={() => setTimeout(() => { setDeleteBook({ id: book.id, title: book.title, author: book.author }); setIsDeleteOpen(true); }, 100)}
                                  className="text-bb-danger-ink focus:text-bb-danger-ink focus:bg-bb-danger-soft"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Move to Bin
                                </DropdownMenuItem>
                                )}
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
                <span className="text-sm text-bb-muted">
                  Showing <span className="font-semibold text-bb-text">{globalBooks.length}</span> of <span className="font-semibold text-bb-text">{globalMeta.total}</span> books
                  {globalMeta.totalPages > 1 && <span className="ml-1.5 text-bb-faint">• Page {globalMeta.page} of {globalMeta.totalPages}</span>}
                </span>
                <div className="flex gap-2">
                  <EnhancedButton variant="outline" size="sm" onClick={() => setGlobalPage(p => Math.max(1, p - 1))} disabled={globalMeta.page <= 1} className="rounded-xl border-bb-border/60 disabled:opacity-40">
                    ← Prev
                  </EnhancedButton>
                  <EnhancedButton variant="outline" size="sm" onClick={() => setGlobalPage(p => p + 1)} disabled={globalMeta.page >= globalMeta.totalPages} className="rounded-xl border-bb-border/60 disabled:opacity-40">
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
          <div className="rounded-2xl border border-bb-border/60 bg-bb-surface/80 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader className="bg-bb-surface-2/80">
                <TableRow>
                  <TableHead>Book Details</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPending ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="h-6 w-6 text-bb-info-ink animate-spin mx-auto" /><p className="text-sm text-muted-foreground mt-2">Loading requests...</p></TableCell></TableRow>
                ) : pendingBooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16">
                      <div className="relative inline-block mb-4">
                        <div className="absolute inset-0 bg-bb-success/10 rounded-full blur-2xl scale-150" />
                        <div className="relative flex items-center justify-center h-16 w-16 mx-auto bg-bb-success-soft rounded-2xl border border-bb-success/30">
                          <Inbox className="h-8 w-8 text-bb-success-ink" />
                        </div>
                      </div>
                      <p className="text-lg font-bold text-bb-text dark:text-white">All caught up!</p>
                      <p className="text-sm text-bb-muted mt-1">No pending submissions to review.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingBooks.map((book: any, idx: number) => (
                    <TableRow key={book.id} className={`transition-colors ${idx % 2 === 1 ? 'bg-bb-surface-2/30' : ''} hover:bg-bb-info-soft/40`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-bb-text dark:text-white">{book.title}</span>
                          <span className="text-xs text-muted-foreground">{book.author}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-bb-faint" />
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
                            className="text-bb-success-ink border-bb-success/30 hover:bg-bb-success-soft hover:text-bb-success-ink hover:border-bb-success/30 rounded-lg"
                            onClick={() => approveMutation.mutate(book.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Approve
                          </EnhancedButton>
                          <EnhancedButton
                            size="sm"
                            variant="outline"
                            className="text-bb-danger-ink border-bb-danger/30 hover:bg-bb-danger-soft hover:text-bb-danger-ink hover:border-bb-danger/30 rounded-lg"
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
            <div className="flex justify-between items-center p-4 border-t border-bb-border/60">
               <span className="text-sm text-bb-muted">Total: <span className="font-semibold text-bb-text">{pendingMeta.total}</span></span>
               <div className="flex gap-2">
                 <EnhancedButton variant="outline" size="sm" onClick={() => setPendingPage(p => Math.max(1, p - 1))} disabled={pendingMeta.page <= 1} className="rounded-xl border-bb-border/60 disabled:opacity-40">Prev</EnhancedButton>
                 <EnhancedButton variant="outline" size="sm" onClick={() => setPendingPage(p => p + 1)} disabled={pendingMeta.page >= pendingMeta.totalPages} className="rounded-xl border-bb-border/60 disabled:opacity-40">Next</EnhancedButton>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: PUBLISHERS */}
      {activeTab === 'PUBLISHERS' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-bb-border/60 bg-bb-surface/80 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader className="bg-bb-surface-2/80">
                <TableRow>
                  <TableHead>Institution Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Global Publisher</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPublishers ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="h-6 w-6 text-bb-info-ink animate-spin mx-auto" /><p className="text-sm text-muted-foreground mt-2">Loading publishers...</p></TableCell></TableRow>
                ) : publishers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16">
                      <div className="relative inline-block mb-4">
                        <div className="absolute inset-0 bg-bb-info/10 rounded-full blur-2xl scale-150" />
                        <div className="relative flex items-center justify-center h-16 w-16 mx-auto bg-bb-progress rounded-2xl border border-bb-info/30">
                          <Building2 className="h-8 w-8 text-bb-info-ink" />
                        </div>
                      </div>
                      <p className="text-lg font-bold text-bb-text dark:text-white">No institutions found</p>
                      <p className="text-sm text-bb-muted mt-1">Institutions will appear here once they register.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  publishers.map((pub: any, idx: number) => (
                    <TableRow key={pub.id} className={`transition-colors ${idx % 2 === 1 ? 'bg-bb-surface-2/30' : ''} hover:bg-bb-info-soft/40`}>
                      <TableCell className="font-semibold text-bb-text dark:text-white">{pub.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{pub.domain}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={pub.isGlobalPublisher
                            ? 'bg-bb-success-soft text-bb-success-ink border-bb-success/30'
                            : 'bg-bb-surface-2 text-bb-muted border-bb-border'
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
                            ? 'bg-bb-success hover:brightness-95 text-white shadow-sm rounded-lg'
                            : 'text-bb-muted border-bb-border hover:bg-bb-surface-2 rounded-lg'
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
          <div className="flex items-start gap-3 rounded-2xl border border-bb-danger/60 bg-bb-danger-soft/40 p-4">
            <Trash className="h-5 w-5 text-bb-danger-ink shrink-0 mt-0.5" />
            <p className="text-sm text-bb-muted">
              Books here are hidden from the library but not yet deleted. <strong>Restore</strong> puts a book back; <strong>Delete Forever</strong> permanently removes it and flushes its files, embeddings and concept map — this cannot be undone.
            </p>
          </div>

          <div className="rounded-2xl border border-bb-border/60 bg-bb-surface/80 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader className="bg-bb-surface-2/80">
                  <TableRow>
                    <TableHead>Book Details</TableHead>
                    <TableHead className="hidden lg:table-cell">Formats</TableHead>
                    <TableHead>Deleted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingBin ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="h-6 w-6 text-bb-info-ink animate-spin mx-auto" /><p className="text-sm text-muted-foreground mt-2">Loading Bin…</p></TableCell></TableRow>
                  ) : binBooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-16">
                        <div className="relative inline-block mb-4">
                          <div className="absolute inset-0 bg-bb-muted/10 rounded-full blur-2xl scale-150" />
                          <div className="relative flex items-center justify-center h-16 w-16 mx-auto bg-bb-surface-2 rounded-2xl border border-bb-border">
                            <Trash className="h-8 w-8 text-bb-faint" />
                          </div>
                        </div>
                        <p className="text-lg font-bold text-bb-text dark:text-white">The Bin is empty</p>
                        <p className="text-sm text-bb-muted mt-1">Deleted books will appear here.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    binBooks.map((book: any, idx: number) => (
                      <TableRow key={book.id} className={`transition-colors ${idx % 2 === 1 ? 'bg-bb-surface-2/30' : ''} hover:bg-bb-danger-soft/30`}>
                        <TableCell>
                          <div className="flex flex-col min-w-0 max-w-[280px]">
                            <span className="font-semibold text-sm text-bb-text dark:text-white truncate">{book.title}</span>
                            <span className="text-xs text-muted-foreground truncate">{book.author}</span>
                            {book.isbn && <span className="text-[11px] font-mono text-bb-faint">{book.isbn}</span>}
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
                              className="text-bb-success-ink border-bb-success/30 hover:bg-bb-success-soft hover:text-bb-success-ink hover:border-bb-success/30 rounded-lg"
                              onClick={() => restoreMutation.mutate(book.id)}
                              disabled={restoreMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" /> Restore
                            </EnhancedButton>
                            <EnhancedButton
                              size="sm"
                              variant="outline"
                              className="text-bb-danger-ink border-bb-danger/30 hover:bg-bb-danger-soft hover:text-bb-danger-ink hover:border-bb-danger/30 rounded-lg"
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
            <div className="flex justify-between items-center p-4 border-t border-bb-border/60">
              <span className="text-sm text-bb-muted">In Bin: <span className="font-semibold text-bb-text">{binMeta.total}</span></span>
              <div className="flex gap-2">
                <EnhancedButton variant="outline" size="sm" onClick={() => setBinPage(p => Math.max(1, p - 1))} disabled={binMeta.page <= 1} className="rounded-xl border-bb-border/60 disabled:opacity-40">Prev</EnhancedButton>
                <EnhancedButton variant="outline" size="sm" onClick={() => setBinPage(p => p + 1)} disabled={binMeta.page >= binMeta.totalPages} className="rounded-xl border-bb-border/60 disabled:opacity-40">Next</EnhancedButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
