'use client';

import { useState, useRef, useEffect } from 'react';
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { EnhancedCard, EnhancedCardContent } from "@/components/ui/enhanced-card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, ChevronLeft, ChevronDown, Filter, Headphones, Search, SlidersHorizontal, Sparkles, ArrowUpDown, Library, AlertCircle, X, FileText, RefreshCcw } from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from 'next/navigation';
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookCard } from "@/components/BookCard";
import type { CatalogBook, AccessTier, BookFormatType } from '@/types/catalog';
import { getReaderRoute, getPrimaryReadFormat } from '@/types/catalog';
import Link from 'next/link';
import { FilterBottomSheet } from '@/components/FilterBottomSheet';
import { AudioPlayerDashboard } from './AudioPlayerDashboard';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  content: string;
  date: string;
  likes: number;
}

interface PageResponse {
  books: CatalogBook[];
  nextPage: number;
  hasMore: boolean;
}

interface SortOption {
  value: string;
  label: string;
}

interface FilterOptions {
  categories: string[];
  languages: string[];
  formats: string[];
  availability: string[];
  minRating: number;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  yearRange: [number, number];
  minPages: number;
  maxPages: number;
  sort?: string;
}

interface SearchHistoryItem {
  query: string;
  timestamp: number;
  filters: FilterOptions;
}

interface SearchFilters extends FilterOptions { }

const SORT_OPTIONS: SortOption[] = [
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
  { value: 'author-asc', label: 'Author (A-Z)' },
  { value: 'author-desc', label: 'Author (Z-A)' },
  { value: 'rating-desc', label: 'Rating (High to Low)' },
  { value: 'rating-asc', label: 'Rating (Low to High)' },
];

const FORMAT_OPTIONS = [
  { value: 'all', label: 'All Formats', icon: Library },
  { value: 'ebook', label: 'E-Book', icon: BookOpen },
  { value: 'audiobook', label: 'Audiobook', icon: Headphones },
  { value: 'physical', label: 'Physical', icon: Library },
  { value: 'PDF', label: 'PDF', icon: FileText },
];

const fetchBooks = async (
  page: number,
  searchQuery: string = '',
  sortBy: string = 'title-asc',
  filters: FilterOptions = {
    categories: [], languages: [], formats: [], availability: [],
    minRating: 0, title: '', author: '', isbn: '', publisher: '',
    yearRange: [1900, new Date().getFullYear()], minPages: 0, maxPages: 1000
  }
): Promise<PageResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '24'); // Increased limit to ensure the screen is filled on large monitors
    params.append('status', 'PUBLISHED');

    if (searchQuery) params.append('search', searchQuery);
    
    if (filters.categories.length > 0) {
      params.append('category', filters.categories[0]); 
    }
    if (filters.formats.length > 0) {
      const formatStr = filters.formats[0].toUpperCase();
      const formatMap: Record<string, string> = {
        'EBOOK': 'E_BOOK',
        'AUDIOBOOK': 'AUDIO_BOOK',
        'PHYSICAL': 'PHYSICAL',
        'PDF': 'PDF'
      };
      params.append('format', formatMap[formatStr] || formatStr);
    }

    if (sortBy) {
      const parts = sortBy.split('-');
      if (parts.length === 2) {
         let field = parts[0];
         if (field === 'rating') field = 'createdAt'; 
         params.append('sortBy', field);
         params.append('sortOrder', parts[1]);
      }
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
      } catch (e) {}
      
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
      // Distinct types only: a book has many bookFormats rows (one per embedded
      // chapter for AI_EMBED), so without the Set the badge list renders "AI Chat"
      // once per chapter instead of a single "Varta Enabled".
      formats: Array.isArray(b.bookFormats)
        ? [...new Set<BookFormatType>(b.bookFormats.map((f: any) => f.type as BookFormatType).filter(Boolean))]
        : [],
      bookFormats: [],  // List page doesn't get full format objects
      available: (b.availableCopies ?? 1) > 0,
      rating: null,
    }));

    return {
      books: mappedBooks,
      nextPage: page + 1,
      hasMore: data.meta ? data.meta.page < data.meta.totalPages : false
    };
  } catch (error) {
    console.error("Failed to fetch from API", error);
    throw error;
  }
};

export default function CatalogPage() {
  const router = useRouter();
  // Captured once on mount, not tied to searchFilters — a nav link that
  // *arrives* with ?format=AUDIOBOOK gets the dedicated audio dashboard;
  // a user who filters to Audiobook from inside the normal catalog UI
  // stays in the normal catalog (toggling a filter shouldn't swap the
  // whole page chrome out from under them).
  // SSR-consistent initial value. Reading window.location in the useState
  // initializer made SSR render the normal catalog (false) while the client's
  // first render swapped in the whole AudioPlayerDashboard (true) when the URL
  // carried ?format=AUDIOBOOK — a full-tree hydration mismatch (React #418).
  // The real value is applied post-mount in the effect below.
  const [isAudioDashboard, setIsAudioDashboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('featured');
  const [sortBy, setSortBy] = useState('title-asc');
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrowSuccess, setBorrowSuccess] = useState<string | null>(null);
  const [borrowError, setBorrowError] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  // Seeded empty so SSR and the first client render match; the ?format= query
  // param is applied post-mount in the effect below (see React #418 note above).
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    categories: [], languages: [], formats: [], availability: [],
    minRating: 0, title: '', author: '', isbn: '', publisher: '',
    yearRange: [1900, new Date().getFullYear()], minPages: 0, maxPages: 1000
  });

  // Apply URL-derived initial state AFTER hydration. Nav links (e.g. the student
  // sidebar's "Audio" item) land here with ?format=AUDIOBOOK: one that *arrives*
  // with it gets the dedicated audio dashboard and a pre-seeded format filter,
  // without the SSR/client mismatch that reading the URL during render caused.
  useEffect(() => {
    const format = new URLSearchParams(window.location.search).get('format');
    if (!format) return;
    if (format.toUpperCase() === 'AUDIOBOOK') setIsAudioDashboard(true);
    setSearchFilters((prev) => ({ ...prev, formats: [format] }));
  }, []);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>('All Genres');
  const [genres, setGenres] = useState<string[]>(['All Genres']);

  // Fetch genres dynamically from backend
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/books/categories?type=GENRE');
        if (res.ok) {
          const data = await res.json();
          const names = Array.isArray(data)
            ? data.map((c: any) => c.name).filter(Boolean).sort()
            : [];
          setGenres(['All Genres', ...names]);
        }
      } catch (e) {
        console.warn('[Catalog] Failed to fetch genres:', e);
      }
    })();
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== debouncedSearchQuery) {
        setPage(1);
        setBooks([]);
        setHasMore(true);
        setDebouncedSearchQuery(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery]);

  useEffect(() => {
    const loadBooks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchBooks(page, debouncedSearchQuery, sortBy, searchFilters);
        setBooks(prev => page === 1 ? response.books : [...prev, ...response.books]);
        setHasMore(response.hasMore);
      } catch (err: any) {
        console.error('Error loading books:', err);
        const msg = err.message || 'Failed to load books. Please try again later.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    loadBooks();
  }, [page, debouncedSearchQuery, sortBy, searchFilters]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !error) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoading, error]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setDebouncedSearchQuery(query);
    if (query.trim()) {
      const newHistoryItem: SearchHistoryItem = {
        query, timestamp: Date.now(), filters: { ...searchFilters }
      };
      setSearchHistory(prev => {
        const uniqueHistory = prev.filter(item => item.query !== query);
        return [newHistoryItem, ...uniqueHistory].slice(0, 10);
      });
    }
  };

  const handleHistoryItemClick = (item: SearchHistoryItem) => {
    setSearchQuery(item.query);
    setDebouncedSearchQuery(item.query);
    setSearchFilters({
      categories: item.filters.categories ?? [],
      languages: item.filters.languages ?? [],
      formats: item.filters.formats ?? [],
      availability: item.filters.availability ?? [],
      minRating: item.filters.minRating ?? 0,
      title: item.filters.title ?? '',
      author: item.filters.author ?? '',
      isbn: item.filters.isbn ?? '',
      publisher: item.filters.publisher ?? '',
      yearRange: item.filters.yearRange ?? [1900, new Date().getFullYear()],
      minPages: item.filters.minPages ?? 0,
      maxPages: item.filters.maxPages ?? 1000
    });
    setShowHistory(false);
  };

  const handleSearchFilterChange = (key: keyof SearchFilters, value: any) => {
    setSearchFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  const applyAdvancedSearch = () => {
    setPage(1);
    setBooks([]);
    setHasMore(true);
    setShowAdvancedSearch(false);
  };

  const resetFilters = () => {
    setSearchFilters({
      categories: [], languages: [], formats: [], availability: [],
      minRating: 0, title: '', author: '', isbn: '', publisher: '',
      yearRange: [1900, new Date().getFullYear()], minPages: 0, maxPages: 1000
    });
    setPage(1);
    setBooks([]);
    setHasMore(true);
  };

  const handleBorrow = async (book: CatalogBook) => {
    try {
      const isDigitalFormat = book.formats.some(
        f => f === 'PDF' || f === 'EPUB' || f === 'AUDIOBOOK'
      ) || book.formats.length === 0; // Default to digital if no format info
      const borrowedAt = new Date().toISOString();
      const expiresAt = isDigitalFormat
        ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const response = await fetch(`/api/v1/books/${book.id}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowedAt, expiresAt }),
      });

      if (!response.ok) throw new Error('Failed to borrow book');

      setBooks(prevBooks =>
        prevBooks.map(b =>
          b.id === book.id ? { ...b, available: false, borrowedAt, expiresAt } : b
        )
      );

      setBorrowSuccess(`Successfully borrowed "${book.title}". ${isDigitalFormat ? `Available for 15 days until ${new Date(expiresAt!).toLocaleDateString()}.` : ''
        }`);
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

  return (
    <div className="min-h-screen relative overflow-hidden bg-bb-bg dark:bg-bb-bg text-slate-900 dark:text-[var(--ivory-cream)] selection:bg-[var(--deep-saffron)]/30">
      {/* ── Ambient Background Glows (Matching Landing/Dashboard) ── */}
      <div className="absolute top-0 right-0 -mr-40 w-[800px] h-[800px] bg-gradient-to-bl from-[var(--saffron)]/10 via-[var(--gold)]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-40 w-[600px] h-[600px] bg-gradient-to-tr from-[var(--peacock-teal)]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-4 lg:space-y-8 animate-in fade-in-0 duration-bb-ui">
        {/* Header */}
        <div className="pt-0 pb-0">
          <Link 
            href="/dashboard/student" 
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <Library className="w-5 h-5 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-[var(--deep-saffron)] shrink-0" />
            <h1 
              className="text-xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Library
            </h1>
          </div>
          <p className="hidden sm:block text-slate-600 dark:text-slate-400 text-sm max-w-2xl mt-1 mb-4">
            Discover and explore our extensive collection of books, notes, and institutional resources.
          </p>
        </div>

        {/* ── Controls Bar ── */}
        <div className="pb-2 space-y-2 relative z-10 w-full max-w-full">
          <div className="relative z-10 sm:p-0">
            {/* ── Search Row ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Search by title, author, or ISBN…"
                  className="pl-11 h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm focus:border-[var(--peacock-teal)] dark:focus:border-[var(--peacock-teal)] focus:ring-[var(--peacock-teal)]/20 transition-all text-[15px]"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setShowHistory(true)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                />
                {showHistory && searchHistory.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recent Searches</span>
                      <EnhancedButton size="sm" className="bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 border-none h-7 text-xs" onClick={clearHistory}>
                        Clear
                      </EnhancedButton>
                    </div>
                    <ScrollArea className="max-h-[240px]">
                      {searchHistory.map((item, index) => (
                        <div
                          key={index}
                          className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                          onClick={() => handleHistoryItemClick(item)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.query}</span>
                            <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                          </div>
                          {item.filters.categories.length > 0 && (
                            <div className="flex gap-1.5 mt-2">
                              {item.filters.categories.map((category) => (
                                <Badge key={category} className="text-[10px] bg-[var(--peacock-teal)]/10 text-[var(--peacock-teal)] dark:bg-[var(--peacock-teal)]/20 hover:bg-[var(--peacock-teal)]/20 border-none">
                                  {category}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* Action buttons — compact row (Desktop Only) */}
              <div className="hidden lg:flex items-center gap-2 shrink-0">
                {/* Genre Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <EnhancedButton className="h-11 px-3.5 bg-white/60 hover:bg-white/90 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 gap-1.5 font-medium text-sm rounded-xl">
                      <span className="truncate max-w-[100px]">{selectedGenre}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </EnhancedButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 cursor-pointer shadow-xl">
                    {genres.map((genre) => (
                      <DropdownMenuItem
                        key={genre}
                        onClick={() => {
                          setSelectedGenre(genre);
                          if (genre === 'All Genres') {
                            handleSearchFilterChange('categories', []);
                          } else {
                            handleSearchFilterChange('categories', [genre]);
                          }
                          setPage(1);
                          setBooks([]);
                        }}
                        className={`rounded-lg py-2 cursor-pointer ${selectedGenre === genre ? 'bg-[var(--peacock-teal)]/10 text-[var(--peacock-teal)] font-semibold' : ''}`}
                      >
                        {genre}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <EnhancedButton size="icon" className="h-11 w-11 shrink-0 bg-white/60 hover:bg-white/90 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 rounded-xl">
                      <ArrowUpDown className="h-4 w-4" />
                    </EnhancedButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 cursor-pointer shadow-xl">
                    <DropdownMenuLabel className="text-xs uppercase tracking-wider text-slate-500">Sort By</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {SORT_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setPage(1);
                          setBooks([]);
                          setHasMore(true);
                        }}
                        className={`rounded-lg py-2 cursor-pointer ${sortBy === option.value ? 'bg-[var(--peacock-teal)]/10 text-[var(--peacock-teal)] font-semibold' : ''}`}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Advanced Filters */}
                <EnhancedButton
                  className={`h-11 px-3.5 gap-1.5 font-medium text-sm rounded-xl shrink-0 border-slate-200 dark:border-slate-700 transition-all ${
                    showAdvancedSearch
                      ? 'bg-[var(--deep-saffron)] text-white border-transparent hover:bg-[var(--deep-saffron)]/90'
                      : 'bg-white/60 hover:bg-white/90 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 text-[var(--deep-saffron)]'
                  }`}
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Filters</span>
                </EnhancedButton>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="my-4 border-t border-slate-100 dark:border-slate-800/60" />

            {/* ── Filter Rows: Category Tabs + Format Chips (Desktop Only) ── */}
            <div className="hidden lg:flex flex-col gap-3">
              {/* Category + Format in a single row */}
              <div className="flex flex-row items-center gap-4">
                {/* Category Tabs */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 shrink-0">Browse</span>
                  <div className="scroll-x-hidden scrollbar-hide">
                    <Tabs defaultValue="featured" onValueChange={setActiveTab} className="w-auto">
                      <TabsList className="flex w-max gap-0.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md rounded-lg p-1 h-auto">
                        {[
                          { value: 'featured', label: 'Featured', icon: Sparkles },
                          { value: 'new', label: 'New Releases', icon: BookOpen },
                          { value: 'trending', label: 'Trending', icon: ArrowUpDown },
                          { value: 'resources', label: 'Resources', icon: Library },
                        ].map((tab) => (
                          <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-semibold transition-all duration-200 gap-1.5 data-[state=active]:bg-[var(--deep-saffron)] data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-white/60 dark:hover:bg-slate-700/60"
                          >
                            <tab.icon className="h-3.5 w-3.5" />
                            <span>{tab.label}</span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                {/* Vertical separator — desktop only */}
                <div className="hidden lg:block w-px h-6 bg-slate-200 dark:bg-slate-700 shrink-0" />

                {/* Format Chips */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 shrink-0 hidden sm:block">Format</span>
                  <div className="scroll-x-hidden scrollbar-hide">
                    <div className="flex items-center gap-1.5 w-max">
                      {FORMAT_OPTIONS.map((fmt) => {
                        const isActive = fmt.value === 'all'
                          ? searchFilters.formats.length === 0
                          : searchFilters.formats.includes(fmt.value);
                        return (
                          <button
                            key={fmt.value}
                            onClick={() => {
                              if (fmt.value === 'all') {
                                handleSearchFilterChange('formats', []);
                              } else {
                                const newFormats = isActive
                                  ? searchFilters.formats.filter(f => f !== fmt.value)
                                  : [...searchFilters.formats, fmt.value];
                                handleSearchFilterChange('formats', newFormats);
                              }
                              setPage(1);
                              setBooks([]);
                            }}
                            className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${isActive
                              ? 'bg-[var(--peacock-teal)] text-white shadow-sm'
                              : 'bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <fmt.icon className={`h-3.5 w-3.5 ${isActive ? 'opacity-90' : 'opacity-60'}`} />
                            {fmt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active filter badges — only when something is actively filtered */}
              {(searchFilters.categories.length > 0 || searchFilters.formats.length > 0) && (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/60" aria-label="Active filters">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 font-semibold uppercase tracking-widest">Active:</span>
                  {searchFilters.categories.map((cat) => (
                    <Badge key={cat} className="h-7 px-2.5 rounded-md bg-[var(--peacock-teal)]/10 text-[var(--peacock-teal)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 border-none gap-1 cursor-pointer font-semibold text-xs transition-colors group" onClick={() => {
                      handleSearchFilterChange('categories', searchFilters.categories.filter(c => c !== cat));
                      setSelectedGenre('All Genres');
                      setPage(1);
                      setBooks([]);
                    }}>
                      {cat} <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                    </Badge>
                  ))}
                  {searchFilters.formats.map((fmt) => (
                    <Badge key={fmt} className="h-7 px-2.5 rounded-md bg-[var(--deep-saffron)]/10 text-[var(--deep-saffron)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 border-none gap-1 cursor-pointer font-semibold text-xs transition-colors group" onClick={() => {
                      handleSearchFilterChange('formats', searchFilters.formats.filter(f => f !== fmt));
                      setPage(1);
                      setBooks([]);
                    }}>
                      {fmt} <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                    </Badge>
                  ))}
                  <button
                    onClick={() => {
                      setSearchFilters({
                        categories: [], languages: [], formats: [], availability: [],
                        minRating: 0, title: '', author: '', isbn: '', publisher: '',
                        yearRange: [1900, new Date().getFullYear()], minPages: 0, maxPages: 1000
                      });
                      setSelectedGenre('All Genres');
                      setPage(1);
                      setBooks([]);
                    }}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 uppercase tracking-widest ml-1"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* ── Mobile Filter Bar (Mobile Only) ── */}
            <div className="flex lg:hidden items-center gap-2 mt-2 w-full min-w-0 max-w-full">
              <div className="flex-1 min-w-0 overflow-x-auto scroll-x-hidden scrollbar-hide">
                 <div className="flex gap-1.5 w-max pr-4">
                  {[
                    { value: 'featured', label: 'Featured' },
                    { value: 'new', label: 'New Releases' },
                    { value: 'trending', label: 'Trending' },
                    { value: 'resources', label: 'Resources' },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        activeTab === tab.value
                          ? 'bg-[var(--deep-saffron)] text-white border-transparent'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                 </div>
              </div>
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0 mx-1" />
              <button
                onClick={() => setShowMobileFilters(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                aria-label="Filter options"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {(searchFilters.categories.length > 0 || searchFilters.formats.length > 0) && (
                  <span className="w-4 h-4 rounded-full bg-[var(--deep-saffron)] text-white text-[10px] font-bold flex items-center justify-center">
                    {searchFilters.categories.length + searchFilters.formats.length}
                  </span>
                )}
              </button>
            </div>
            
            {/* Filter Bottom Sheet */}
            <FilterBottomSheet
              open={showMobileFilters}
              onClose={() => setShowMobileFilters(false)}
              initialFilters={{ ...searchFilters, sort: sortBy, categories: selectedGenre !== 'All Genres' ? [selectedGenre] : searchFilters.categories }}
              genres={genres}
              onApply={(newFilters) => {
                setSearchFilters(newFilters);
                if (newFilters.sort) setSortBy(newFilters.sort);
                setSelectedGenre(newFilters.categories[0] || 'All Genres');
                setPage(1);
                setBooks([]);
              }}
              onClear={() => {
                setSearchFilters({
                  categories: [], languages: [], formats: [], availability: [],
                  minRating: 0, title: '', author: '', isbn: '', publisher: '',
                  yearRange: [1900, new Date().getFullYear()], minPages: 0, maxPages: 1000
                });
                setSortBy('title-asc');
                setSelectedGenre('All Genres');
                setPage(1);
                setBooks([]);
              }}
            />
          </div>
        </div>

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <EnhancedCard variant="glass" className="animate-in fade-in-0 slide-in-from-top-2 duration-bb-ui ring-1 ring-slate-200/50 dark:ring-slate-700/50 pt-4">
            <EnhancedCardContent className="space-y-6">
              <h3 
                className="text-xl font-semibold text-slate-900 dark:text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Advanced Search Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Title</label>
                  <Input value={searchFilters.title} onChange={(e) => handleSearchFilterChange('title', e.target.value)} placeholder="Exact title match" className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus:border-[var(--peacock-teal)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Author</label>
                  <Input value={searchFilters.author} onChange={(e) => handleSearchFilterChange('author', e.target.value)} placeholder="Author name" className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus:border-[var(--peacock-teal)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">ISBN</label>
                  <Input value={searchFilters.isbn} onChange={(e) => handleSearchFilterChange('isbn', e.target.value)} placeholder="ISBN number" className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus:border-[var(--peacock-teal)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Publisher</label>
                  <Input value={searchFilters.publisher} onChange={(e) => handleSearchFilterChange('publisher', e.target.value)} placeholder="Publisher name" className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus:border-[var(--peacock-teal)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Publication Year</label>
                  <div className="flex items-center gap-3">
                    <Input type="number" value={searchFilters.yearRange[0]} onChange={(e) => handleSearchFilterChange('yearRange', [parseInt(e.target.value), searchFilters.yearRange[1]])} className="w-full sm:w-28 h-11 rounded-lg border-slate-200 dark:border-slate-700 focus:border-[var(--peacock-teal)]" />
                    <span className="text-sm text-slate-500 font-medium">to</span>
                    <Input type="number" value={searchFilters.yearRange[1]} onChange={(e) => handleSearchFilterChange('yearRange', [searchFilters.yearRange[0], parseInt(e.target.value)])} className="w-full sm:w-28 h-11 rounded-lg border-slate-200 dark:border-slate-700 focus:border-[var(--peacock-teal)]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Page Count</label>
                  <div className="flex items-center gap-3">
                    <Input type="number" value={searchFilters.minPages} onChange={(e) => handleSearchFilterChange('minPages', parseInt(e.target.value))} placeholder="Min" className="w-full sm:w-28 h-11 rounded-lg border-slate-200 dark:border-slate-700 focus:border-[var(--peacock-teal)]" />
                    <span className="text-sm text-slate-500 font-medium">to</span>
                    <Input type="number" value={searchFilters.maxPages} onChange={(e) => handleSearchFilterChange('maxPages', parseInt(e.target.value))} placeholder="Max" className="w-full sm:w-28 h-11 rounded-lg border-slate-200 dark:border-slate-700 focus:border-[var(--peacock-teal)]" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <EnhancedButton className="h-11 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 border border-slate-200 dark:border-slate-700" onClick={resetFilters}>
                  Clear Form
                </EnhancedButton>
                <EnhancedButton className="h-11 bg-[var(--peacock-teal)] hover:bg-teal-700 text-white border-transparent" onClick={applyAdvancedSearch}>
                  <Filter className="h-4 w-4 mr-2" /> Apply Filters
                </EnhancedButton>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        )}

        {/* Success/Error Alerts */}
        {borrowSuccess && (
          <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700 animate-in fade-in-0 duration-bb-ui">
            <AlertTitle className="text-emerald-700 dark:text-emerald-400">Success</AlertTitle>
            <AlertDescription className="text-emerald-600 dark:text-emerald-300">{borrowSuccess}</AlertDescription>
          </Alert>
        )}
        {borrowError && (
          <Alert variant="destructive" className="animate-in fade-in-0 duration-bb-ui">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{borrowError}</AlertDescription>
          </Alert>
        )}

        {/* Fetch Error Display */}
        {error && page === 1 && (
          <EnhancedCard variant="elevated" className="text-center py-12 animate-in fade-in-0 duration-bb-ui border-red-100 dark:border-red-900/30">
            <EnhancedCardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
                  <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
                <div className="space-y-2 max-w-md">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Connection Error</h3>
                  <p className="text-slate-600 dark:text-slate-400">{error}</p>
                </div>
                <EnhancedButton
                  variant="outline"
                  onClick={() => { setPage(1); setBooks([]); }}
                  className="mt-2"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" /> Try Again
                </EnhancedButton>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        )}

        {/* Books Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {books.map((book, index) => (
            <div
              key={book.id}
              className="animate-in fade-in-0 duration-bb-ui h-full"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <BookCard
                book={book}
                onRead={handleRead}
                onListen={handleListen}
                onBorrow={handleBorrow}
                onView={handleView}
                priority={index < 8}
              />
            </div>
          ))}
        </div>

        {/* Pagination Error */}
        {error && page > 1 && (
          <div className="flex justify-center py-4">
            <EnhancedButton variant="ghost" onClick={() => { setError(null); }} className="text-red-600">
               <RefreshCcw className="h-4 w-4 mr-2" /> Retry loading more
            </EnhancedButton>
          </div>
        )}

        {/* Loading Indicator */}
        <div ref={observerTarget} className="h-10">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 border-4 border-slate-200 border-t-[var(--peacock-teal)] rounded-full animate-spin" />
                <p className="text-slate-500 font-medium">Loading more books...</p>
              </div>
            </div>
          )}
        </div>

        {/* No Results */}
        {!isLoading && !error && books.length === 0 && (
          <EnhancedCard variant="elevated" className="text-center py-16">
            <EnhancedCardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-[var(--deep-saffron)]/10 rounded-full">
                  <BookOpen className="h-12 w-12 text-[var(--deep-saffron)]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>No books found</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Try adjusting your search filters or browse our featured collection.
                  </p>
                </div>
                <EnhancedButton
                  className="bg-[var(--peacock-teal)] hover:bg-teal-700 text-white mt-2"
                  onClick={() => { setSearchQuery(''); resetFilters(); }}
                >
                  Clear All Filters
                </EnhancedButton>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        )}
      </div>
    </div>
  );
}
