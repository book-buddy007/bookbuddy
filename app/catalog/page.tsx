'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookCard } from '@/components/BookCard';
import { FilterBottomSheet } from '@/components/FilterBottomSheet';
import { cn } from '@/lib/utils';
import type { CatalogBook, AccessTier, BookFormatType } from '@/types/catalog';
import { getReaderRoute, getPrimaryReadFormat } from '@/types/catalog';
import {
  ALL_GENRES,
  CATALOG_FORMATS,
  CATALOG_SORTS,
  DEFAULT_SORT,
  EMPTY_FILTERS,
  formatLabel,
  normalizeFormat,
  type CatalogFilters,
} from '@/lib/catalog-filters';
import { AudioPlayerDashboard } from './AudioPlayerDashboard';

interface PageResponse {
  books: CatalogBook[];
  nextPage: number;
  hasMore: boolean;
}

interface SearchHistoryItem {
  query: string;
  timestamp: number;
  /** Current shape is CatalogFilters; entries saved by older builds carry categories[] / formats[]. */
  filters: Partial<CatalogFilters> & { categories?: string[]; formats?: string[] };
}

const HISTORY_KEY = 'searchHistory';

const fetchBooks = async (
  page: number,
  searchQuery: string,
  sortBy: string,
  filters: CatalogFilters,
): Promise<PageResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', '24'); // enough to fill a large screen in one page
  params.append('status', 'PUBLISHED');

  if (searchQuery) params.append('search', searchQuery);
  if (filters.category) params.append('category', filters.category);
  if (filters.format) params.append('format', filters.format);

  const [field, order] = sortBy.split('-');
  if (field && order) {
    params.append('sortBy', field);
    params.append('sortOrder', order);
  }

  const res = await fetch(`/api/v1/books?${params.toString()}`);
  if (!res.ok) {
    const errText = await res.text();
    let cause = res.statusText;
    let message = `API fetch failed with status ${res.status}`;
    try {
      const errJson = JSON.parse(errText);
      cause = errJson.code || cause;
      message = errJson.message || errJson.details || message;
    } catch {}

    console.warn(`[Catalog] Fetch error (${res.status}):`, message);
    const error = new Error(message || 'Failed to fetch from API');
    (error as any).status = res.status;
    (error as any).cause = cause;
    throw error;
  }

  const data = await res.json();
  if (!data.data || !Array.isArray(data.data)) {
    return { books: [], nextPage: page, hasMore: false };
  }

  const mappedBooks: CatalogBook[] = data.data.map((b: any): CatalogBook => ({
    id: String(b.id),
    title: b.title ?? 'Untitled',
    author: b.author ?? 'Unknown Author',
    isbn: b.isbn ?? 'N/A',
    coverUrl: b.coverUrl ?? null,
    backCoverUrl: b.backCoverUrl ?? null,
    description: b.description ?? null,
    publisher: b.publisher ?? null,
    publishYear: b.publishYear ?? null,
    pages: b.pages ?? null,
    language: b.language ?? null,
    genre: Array.isArray(b.categories)
      ? b.categories
          .map((c: any) => c.category?.name)
          .filter((name: any): name is string => typeof name === 'string')
      : [],
    accessTier: (b.accessTier as AccessTier) ?? 'FREE',
    // Distinct types only: a book has one AI_EMBED row per embedded chapter.
    formats: Array.isArray(b.bookFormats)
      ? [...new Set<BookFormatType>(b.bookFormats.map((f: any) => f.type as BookFormatType).filter(Boolean))]
      : [],
    bookFormats: [], // the list endpoint doesn't return full format objects
    available: (b.availableCopies ?? 1) > 0,
    rating: null,
  }));

  return {
    books: mappedBooks,
    nextPage: page + 1,
    hasMore: data.meta ? data.meta.page < data.meta.totalPages : false,
  };
};

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4" aria-busy="true" aria-label="Loading books">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="animate-pulse rounded-bb-lg bg-bb-surface p-3 shadow-e1">
          <div className="aspect-[84/124] rounded-[4px_12px_12px_4px] bg-bb-surface-2" />
          <div className="mt-3 h-4 w-3/4 rounded-full bg-bb-surface-2" />
          <div className="mt-2 h-3 w-1/2 rounded-full bg-bb-surface-2" />
        </div>
      ))}
    </div>
  );
}

export default function CatalogPage() {
  const router = useRouter();
  // A nav link that *arrives* with ?format=AUDIOBOOK gets the dedicated audio
  // dashboard; filtering to audio from inside the catalogue keeps the catalogue.
  // Read post-mount, not in the initializer: reading window.location during the
  // first render caused a full-tree hydration mismatch (React #418).
  const [isAudioDashboard, setIsAudioDashboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>(DEFAULT_SORT);
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrowSuccess, setBorrowSuccess] = useState<string | null>(null);
  const [borrowError, setBorrowError] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [genres, setGenres] = useState<string[]>([ALL_GENRES]);
  const observerTarget = useRef<HTMLDivElement>(null);

  const resetList = () => {
    setPage(1);
    setBooks([]);
    setHasMore(true);
  };

  useEffect(() => {
    const format = new URLSearchParams(window.location.search).get('format');
    if (!format) return;
    if (format.toUpperCase() === 'AUDIOBOOK') setIsAudioDashboard(true);
    setFilters((prev) => ({ ...prev, format: normalizeFormat(format) }));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/books/categories?type=GENRE');
        if (res.ok) {
          const data = await res.json();
          const names = Array.isArray(data) ? data.map((c: any) => c.name).filter(Boolean).sort() : [];
          setGenres([ALL_GENRES, ...names]);
        }
      } catch (e) {
        console.warn('[Catalog] Failed to fetch genres:', e);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setSearchHistory(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory));
    } catch {}
  }, [searchHistory]);

  // Debounce typing; a settled, non-empty query is also what goes into history
  // (recording every keystroke filled it with fragments).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== debouncedSearchQuery) {
        resetList();
        setDebouncedSearchQuery(searchQuery);
        const q = searchQuery.trim();
        if (q) {
          setSearchHistory((prev) =>
            [{ query: q, timestamp: Date.now(), filters: { ...filters } }, ...prev.filter((i) => i.query !== q)].slice(0, 10),
          );
        }
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, debouncedSearchQuery]);

  useEffect(() => {
    const loadBooks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchBooks(page, debouncedSearchQuery, sortBy, filters);
        setBooks((prev) => (page === 1 ? response.books : [...prev, ...response.books]));
        setHasMore(response.hasMore);
      } catch (err: any) {
        console.error('Error loading books:', err);
        setError(err.message || 'Failed to load books. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    loadBooks();
  }, [page, debouncedSearchQuery, sortBy, filters]);

  useEffect(() => {
    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        // Only page on from a loaded first page; on mount the empty sentinel is already in view.
        if (entries[0].isIntersecting && hasMore && !isLoading && !error && books.length > 0) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 1.0 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, isLoading, error, books.length]);

  const updateFilters = (next: Partial<CatalogFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    resetList();
  };

  const updateSort = (value: string) => {
    setSortBy(value);
    resetList();
  };

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setSortBy(DEFAULT_SORT);
    resetList();
  };

  const handleHistoryItemClick = (item: SearchHistoryItem) => {
    setSearchQuery(item.query);
    setDebouncedSearchQuery(item.query);
    setFilters({
      category: item.filters.category ?? item.filters.categories?.[0] ?? null,
      format: normalizeFormat(item.filters.format ?? item.filters.formats?.[0]),
    });
    resetList();
    setShowHistory(false);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {}
  };

  const handleBorrow = async (book: CatalogBook) => {
    try {
      const isDigitalFormat =
        book.formats.some((f) => f === 'PDF' || f === 'EPUB' || f === 'AUDIOBOOK') || book.formats.length === 0;
      const borrowedAt = new Date().toISOString();
      const expiresAt = isDigitalFormat ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() : undefined;

      const response = await fetch(`/api/v1/books/${book.id}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowedAt, expiresAt }),
      });

      if (!response.ok) throw new Error('Failed to borrow book');

      setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, available: false, borrowedAt, expiresAt } : b)));
      setBorrowSuccess(
        `You borrowed "${book.title}".${isDigitalFormat ? ` It's yours until ${new Date(expiresAt!).toLocaleDateString()}.` : ''}`,
      );
      setTimeout(() => setBorrowSuccess(null), 5000);
    } catch (error) {
      console.error('Error borrowing book:', error);
      setBorrowError('Failed to borrow book. Please try again.');
      setTimeout(() => setBorrowError(null), 3000);
    }
  };

  const handleRead = (book: CatalogBook, format?: 'EPUB' | 'PDF') => {
    const fmt = format ?? getPrimaryReadFormat(book.formats) ?? 'PDF';
    router.push(getReaderRoute(book.id, fmt));
  };
  const handleListen = (book: CatalogBook) => router.push(getReaderRoute(book.id, 'AUDIOBOOK'));
  const handleView = (book: CatalogBook) => router.push(`/catalog/${book.id}`);

  if (isAudioDashboard) {
    return <AudioPlayerDashboard />;
  }

  const activeCount = (filters.category ? 1 : 0) + (filters.format ? 1 : 0);
  const filtersActive = activeCount > 0 || !!debouncedSearchQuery;
  const formatChip = (f: (typeof CATALOG_FORMATS)[number]) => {
    const active = filters.format === f.value;
    return (
      <button
        key={f.label}
        type="button"
        aria-pressed={active}
        onClick={() => updateFilters({ format: f.value })}
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-[13px] font-semibold transition-colors duration-bb-micro focus-visible:outline-none focus-visible:shadow-focus [@media(pointer:coarse)]:h-11',
          active ? 'border-bb-accent bg-bb-accent-soft text-bb-accent-ink' : 'border-bb-border bg-bb-surface text-bb-text hover:border-bb-accent/40',
        )}
      >
        <Icon name={f.icon} size={15} />
        {f.label}
      </button>
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-10 2xl:max-w-[1600px]">
      <PageHeader
        eyebrow="Catalogue"
        title="Library"
        description="Books, notes and audiobooks from the shared library and your institution."
      />

      {/* Controls */}
      <div className="space-y-4 rounded-bb-lg bg-bb-surface p-4 shadow-e1">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <SearchInput
              aria-label="Search the library"
              placeholder="Search by title, author or ISBN…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            />
            {showHistory && searchHistory.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-bb-md bg-bb-surface shadow-e2">
                <div className="flex items-center justify-between border-b border-bb-border px-4 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-bb-faint">Recent searches</span>
                  <Button variant="ghost" size="sm" onClick={clearHistory}>Clear</Button>
                </div>
                <ul className="max-h-60 overflow-y-auto py-1">
                  {searchHistory.map((item) => (
                    <li key={`${item.query}-${item.timestamp}`}>
                      <button
                        type="button"
                        onClick={() => handleHistoryItemClick(item)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-bb-hover focus-visible:bg-bb-hover focus-visible:outline-none"
                      >
                        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-bb-text">
                          <Icon name="search" size={14} fillLayer={false} className="shrink-0 text-bb-faint" />
                          <span className="truncate">{item.query}</span>
                        </span>
                        <span className="shrink-0 text-xs text-bb-faint">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="hidden gap-3 lg:flex">
            <Select
              value={filters.category ?? ALL_GENRES}
              onValueChange={(v) => updateFilters({ category: v === ALL_GENRES ? null : v })}
            >
              <SelectTrigger aria-label="Genre" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {genres.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={updateSort}>
              <SelectTrigger aria-label="Sort" className="w-52">
                <Icon name="arrow-updown" size={16} fillLayer={false} className="mr-1 text-bb-faint" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATALOG_SORTS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Format chips (desktop) */}
        <div className="hidden flex-wrap items-center gap-2 lg:flex" role="group" aria-label="Format">
          {CATALOG_FORMATS.map(formatChip)}
        </div>

        {/* Phone: scrolling format chips + filter sheet */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 scrollbar-hide" role="group" aria-label="Format">
            {CATALOG_FORMATS.map(formatChip)}
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setShowMobileFilters(true)}>
            <Icon name="filter" fillLayer={false} />
            Filters
            {activeCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-bb-accent px-1 text-[11px] font-bold text-white">{activeCount}</span>
            )}
          </Button>
        </div>

        {activeCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-bb-border pt-3" aria-label="Active filters">
            {filters.category && (
              <button
                type="button"
                onClick={() => updateFilters({ category: null })}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-bb-info-soft px-2.5 text-xs font-semibold text-bb-info-ink hover:brightness-95"
                aria-label={`Remove genre ${filters.category}`}
              >
                {filters.category}
                <Icon name="close" size={12} fillLayer={false} />
              </button>
            )}
            {filters.format && (
              <button
                type="button"
                onClick={() => updateFilters({ format: null })}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-bb-accent-soft px-2.5 text-xs font-semibold text-bb-accent-ink hover:brightness-95"
                aria-label={`Remove format ${formatLabel(filters.format)}`}
              >
                {formatLabel(filters.format)}
                <Icon name="close" size={12} fillLayer={false} />
              </button>
            )}
            <Button variant="ghost" size="sm" onClick={clearAll}>Clear all</Button>
          </div>
        )}
      </div>

      <FilterBottomSheet
        open={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        initialFilters={filters}
        initialSort={sortBy}
        genres={genres}
        onApply={(next, sort) => {
          setFilters(next);
          setSortBy(sort);
          resetList();
        }}
        onClear={clearAll}
      />

      <div className="space-y-3" aria-live="polite">
        {borrowSuccess && (
          <Alert variant="success">
            <Icon name="check-circle" fillLayer={false} />
            <AlertTitle>Borrowed</AlertTitle>
            <AlertDescription>{borrowSuccess}</AlertDescription>
          </Alert>
        )}
        {borrowError && (
          <Alert variant="destructive">
            <Icon name="alert-circle" fillLayer={false} />
            <AlertTitle>Couldn&apos;t borrow</AlertTitle>
            <AlertDescription>{borrowError}</AlertDescription>
          </Alert>
        )}
      </div>

      {error && page === 1 ? (
        <EmptyState
          icon="alert-circle"
          title="Couldn't load the library"
          description={error}
          action={
            <Button variant="outline" onClick={resetList}>
              <Icon name="rotate-cw" fillLayer={false} />
              Try again
            </Button>
          }
        />
      ) : isLoading && books.length === 0 ? (
        <GridSkeleton />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {books.map((book, index) => (
            <li key={book.id} className="h-full animate-in fade-in-0 duration-bb-ui" style={{ animationDelay: `${Math.min(index % 24, 12) * 40}ms` }}>
              <BookCard
                book={book}
                onRead={handleRead}
                onListen={handleListen}
                onBorrow={handleBorrow}
                onView={handleView}
                priority={index < 8}
              />
            </li>
          ))}
        </ul>
      )}

      {error && page > 1 && (
        <div className="flex justify-center py-4">
          <Button variant="outline" onClick={() => setError(null)}>
            <Icon name="rotate-cw" fillLayer={false} />
            Retry loading more
          </Button>
        </div>
      )}

      {/* Infinite-scroll sentinel */}
      <div ref={observerTarget} className="h-10">
        {isLoading && books.length > 0 && (
          <p role="status" className="flex items-center justify-center gap-2 py-6 text-sm font-medium text-bb-muted">
            <Icon name="loader" size={18} fillLayer={false} className="animate-spin text-bb-accent" />
            Loading more books…
          </p>
        )}
      </div>

      {!isLoading && !error && books.length === 0 && (
        <EmptyState
          icon="library"
          title="No books found"
          description={filtersActive ? 'Try a different search or clear the filters.' : 'The library has no published books yet.'}
          action={
            filtersActive ? (
              <Button onClick={() => { setSearchQuery(''); setDebouncedSearchQuery(''); clearAll(); }}>Clear search and filters</Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
