'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { fetchWithRetry } from '@/lib/utils/fetch-with-retry';



import { Button } from "@/components/ui/button"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, List, Moon, FileSearch, Sun, BookOpenText, X, BookOpenCheck, ScrollText, Eye, ALargeSmall } from "@/components/ui/icons"
import { CircularProgress } from "@/components/ui/circular-progress"; // Pre-built circular progress component
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTheme } from "next-themes"
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useReaderStore } from '@/store/useReaderStore';
import { useAppStore } from '@/store/useAppStore';
import { useAnnotationStore } from '@/store/useAnnotationStore';
import { StudyDrawer } from '@/components/reader/StudyDrawer';
import { ReaderBottomBar } from '@/components/reader/ReaderBottomBar';
import { ReaderProgressSheet } from '@/components/reader/ReaderProgressSheet';
import { useSanchikaStore } from '@/store/useSanchikaStore';
import { HighlightedText } from '@/components/reader/HighlightedText';
import { useAuthStore } from '@/store/useAuthStore';
import { useBookSearch } from '@/lib/hooks/useBookSearch';
import { useReadingProgress } from '@/lib/hooks/useReadingProgress';
import { DictionaryModal } from '@/components/reader/DictionaryModal';
import { CreateFlashcardModal } from '@/components/reader/CreateFlashcardModal';
import { CitationGeneratorModal } from '@/components/reader/CitationGeneratorModal';
import { useTextToSpeech } from '@/lib/hooks/useTextToSpeech';
import { TTSControlBar } from '@/components/reader/TTSControlBar';
import { ReaderTopBar, type ReaderMode } from '@/components/reader/ReaderTopBar';
import { ReaderDisplayContent } from '@/components/reader/ReaderDisplayContent';
import { READER_PALETTES, toReaderKey } from '@/lib/reader-themes';
import { Icon } from '@/components/ui/icon';
import { useDictionaryStore } from '@/store/useDictionaryStore';

import { useBookContent } from '@/lib/hooks/useBookContent';
import { PdfShell } from '@/components/reader/PdfShell';
import { EpubShell } from '@/components/reader/EpubShell';
import { DynamicWatermark } from '@/components/reader/DynamicWatermark';
import { useContentProtection } from '@/lib/hooks/useContentProtection';
import { ReaderLanding } from './ReaderLanding';

// Types
interface Page {
  number: number;
  content: string;
}

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: 'linear-gradient(180deg, #FBFBFD 0%, #F2F4F8 100%)' }}>
        <p className="text-sm font-medium text-amber-800 tracking-wide">Opening your book...</p>
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}

const isPersonalFileInit = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('personalFileId');

function ReaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme: setNextTheme } = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const bookIdUrl = searchParams.get('bookId') || searchParams.get('id');
  const personalFileIdUrl = searchParams.get('personalFileId');
  const formatUrl = (searchParams.get('format') ?? 'pdf').toLowerCase();
  const [bookId, setBookId] = useState<string | null>(bookIdUrl);
  const [personalFileId] = useState<string | null>(personalFileIdUrl);
  const [format, setFormat] = useState<string>(formatUrl);
  const [isMobile, setIsMobile] = useState(false);
  const [hoverZone, setHoverZone] = useState<'left' | 'right' | 'center' | null>(null);

  // Use our Zustand store instead of local state
  const {
    fontSize,
    lineHeight,
    fontFamily,
    margins,
    theme: readerTheme,
    colorTemperature,
    contrast,
    autoTheme,
    currentPage,
    totalPages,
    lastCfi,
    viewMode,
    bookmarks,
    activePanel,
    studyTab,
    isFocusMode,
    bottomBarHeight,
    searchQuery,
    searchResults,
    activeResultIndex,
    sessionPageSeconds,
    currentStreak,
    dailyGoalProgress,

    setFontSize,
    setLineHeight,
    setFontFamily,
    setMargins,
    setTheme,
    setColorTemperature,
    setContrast,
    toggleAutoTheme,

    setCurrentPage,
    setTotalPages,
    setLastCfi,
    toggleViewMode,
    toggleBookmark,

    togglePanel,
    closePanel,
    openStudy,
    setSearchQuery,
    setSearchResults,
    setActiveResultIndex,
    syncToServer,
    initFromServer,
    fetchStreak,
    updateStreak,
    toggleFocusMode
  } = useReaderStore();

  // For app-wide theme sync
  const { setTheme: setAppTheme } = useAppStore();

  // Sanchika Store integration
  const { addNote: addSanchikaNote } = useSanchikaStore();

  // Get user from auth store
  const { user } = useAuthStore();

  // DRM: Content protection (blocks right-click, dev tools, text selection)
  const { containerRef: protectionRef } = useContentProtection();

  /* Modals — genuinely transient, and each one is dismissed before
     anything else can be reached, so these stay local booleans. The
     *panels*, which could stack, are the ones that moved to the single
     activePanel enum in the reader store (audit fix 1). */
  const [flashcardText, setFlashcardText] = useState('');
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
  const [isCitationOpen, setIsCitationOpen] = useState(false);

  // Auto-open a panel when the reader is reached via a `?tab=` nav link
  // (Sanchika, Varta, Explore). Previously a no-op: nav links pointed at
  // /reader?tab=varta etc. but nothing here read the param, so clicking them
  // just opened the reader with no sidebar — see TRIO_CONTEXT.md's
  // deferred-work list.
  const tabParam = searchParams.get('tab');
  useEffect(() => {
    if (!tabParam) return;
    if (tabParam === 'sanchika') openStudy('sanchika');
    else if (tabParam === 'varta') openStudy('varta');
    else if (tabParam === 'annotations') openStudy('notes');
    else if (tabParam === 'explore' || tabParam === 'graph') openStudy('graph');
    /* Graph and Digest now open under Notes rather than Varta, but a link
       names a TAB, not a section, so every existing `?tab=` URL still
       lands where it always did. */
    else if (tabParam === 'digest' || tabParam === 'recap') openStudy('digest');
    else if (tabParam === 'vocab' || tabParam === 'vocabulary') openStudy('vocab');
  }, [tabParam, openStudy]);

  const { openDictionary } = useDictionaryStore();

  const handleDefine = (text: string) => {
    openDictionary(text, undefined, currentBookId);
  };

  const handleCreateFlashcard = (text: string) => {
    setFlashcardText(text);
    setIsFlashcardOpen(true);
  };

  const handleAskVarta = (text: string) => {
    setVartaInitialQuery(text);
    openStudy('varta');
  };

  /* Still the local store, deliberately: Book Buddy cannot write to DCP's notes
     until phase 3's SECURITY DEFINER path exists (see
     docs/context/SANCHIKA_TRIO_SHARING.md). The Sanchika panel shows these
     under "Saved on this device only" so a saved passage is visible rather
     than swallowed, and opening the panel is what makes that visible at the
     moment of saving. */
  const handleSaveToSanchika = (text: string) => {
    addSanchikaNote(currentBookId, `"${text}"`, `Page ${currentPage}`);
    openStudy('sanchika');
  };

  const handleSpeakText = (text: string) => {
    tts.speak(text);
  };

  // Fetch book content presigned URL (Moved up for dependencies)
  const { data: content, isLoading: contentLoading, error: contentError } = useBookContent(bookId, format, personalFileId);
  const currentBookId = personalFileId || bookId || "book-1";
  const isPersonalFile = !!personalFileId;
  // Title, author and which reading modes the book offers (Read / PDF / Listen).
  const [bookTitle, setBookTitle] = useState(isPersonalFileInit() ? 'Your file' : 'Digital Library Reader');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookFormatTypes, setBookFormatTypes] = useState<string[]>([]);
  useEffect(() => {
    if (!bookId || personalFileId) return;
    let cancelled = false;
    fetch(`/api/v1/books/${encodeURIComponent(bookId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const b = json?.data ?? json;
        if (cancelled || !b) return;
        if (b.title) setBookTitle(b.title);
        if (b.author) setBookAuthor(b.author);
        if (Array.isArray(b.bookFormats)) setBookFormatTypes(Array.from(new Set(b.bookFormats.map((x: any) => String(x.type)))));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [bookId, personalFileId]);
  const bookContent = useMemo<Page[]>(() => [], []);

  // EPUB table of contents (fed by epub.js) and the spine document currently on screen.
  const [epubToc, setEpubToc] = useState<{ label: string; href: string }[]>([]);
  const [epubHref, setEpubHref] = useState('');
  const epubRenditionRef = React.useRef<import('epubjs').Rendition | null>(null);

  // Text-to-Speech integration
  const tts = useTextToSpeech();
  const { speak: readAloud, stop: stopReading, state: ttsState } = tts;

  // Extract visible text from the currently rendered PDF page
  const extractPdfPageText = useCallback((pageIndex: number): string => {
    // Try to find the exact page layer by index (react-pdf-viewer standard testid)
    const pageLayer = document.querySelector(`[data-testid="core__page-layer-${pageIndex - 1}"]`);
    if (pageLayer) {
      const spans = pageLayer.querySelectorAll('.rpv-core__text-layer span');
      if (spans.length) {
        return Array.from(spans).map(s => s.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
      }
    }

    // Fallback: @react-pdf-viewer renders text in .rpv-core__text-layer span elements
    const layers = document.querySelectorAll('.rpv-core__text-layer');
    if (!layers.length) return '';
    // Find the layer that's currently visible (intersecting the viewport)
    let visibleLayer: Element | null = null;
    for (const layer of Array.from(layers)) {
      const rect = layer.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        visibleLayer = layer;
        break;
      }
    }
    if (!visibleLayer) visibleLayer = layers[0];
    const spans = visibleLayer.querySelectorAll('span');
    return Array.from(spans).map(s => s.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
  }, []);

  const handleReadAloud = useCallback((text?: string) => {
    // If already playing → stop
    if (ttsState.isPlaying) {
      stopReading();
      return;
    }
    const toSpeak = text || (format === 'pdf' ? extractPdfPageText(currentPage) : (bookContent[currentPage - 1]?.content || ''));
    if (toSpeak.trim()) readAloud(toSpeak);
  }, [ttsState.isPlaying, stopReading, readAloud, format, extractPdfPageText, currentPage, bookContent]);


  // Initialize reading progress tracker
  useReadingProgress();

  // Handle Syncing reading progress
  useEffect(() => {
    const activeId = personalFileId || bookId;
    if (!activeId) return;

    if (isPersonalFile) {
      // Personal files: no institutional init, no annotations sync
      // Just init reading position from personal progress endpoint later
    } else {
      // Institutional book: full init + annotation sync
      initFromServer(activeId);
      fetchStreak();
      useAnnotationStore.getState().syncAnnotationsWithBackend(activeId);
    }

    const performSync = () => {
      if (isPersonalFile) {
        // Sync personal file progress to personal-library API
        const state = useReaderStore.getState();
        const percentComplete = Math.round((state.currentPage / Math.max(1, state.totalPages)) * 100);
        const timeSpentSeconds = Object.values(state.sessionPageSeconds).reduce((a, b) => a + b, 0);
        fetch(`/api/proxy/personal-library/${personalFileId}/progress`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            currentPage: state.currentPage,
            percentComplete,
            timeSpentSeconds,
            totalPagesRead: Object.keys(state.sessionPageSeconds).length,
            bookmarks: state.bookmarks,
          }),
        }).catch(() => { /* silent fail for personal sync */ });
      } else {
        syncToServer(activeId);
        const state = useReaderStore.getState();
        const minutesRead = state.sessionStartTime ? Math.floor((Date.now() - state.sessionStartTime) / 60000) : 0;
        updateStreak(minutesRead);
      }
    };

    // Auto-sync every 30 seconds
    const interval = setInterval(performSync, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') performSync();
    };

    window.addEventListener('beforeunload', performSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      performSync(); // Sync on component unmount
      window.removeEventListener('beforeunload', performSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [bookId, personalFileId, isPersonalFile, syncToServer, initFromServer, fetchStreak, updateStreak]);


  // Calculate reading stats
  const percentComplete = Math.max(1, Math.round((currentPage / totalPages) * 100));
  const pagesTracked = Object.keys(sessionPageSeconds).length;
  const totalSecondsTracked = Object.values(sessionPageSeconds).reduce((a, b) => a + b, 0);
  const avgSecondsPerPage = pagesTracked > 0 ? Math.max(10, totalSecondsTracked / pagesTracked) : 60;
  const minutesLeft = Math.ceil(((totalPages - currentPage) * avgSecondsPerPage) / 60);

  // Keyboard shortcut listeners for search navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+G / Cmd+G for finding next, Ctrl+Shift+G for previous
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();

        if (activePanel !== 'search' || searchResults.length === 0) return;

        if (e.shiftKey) {
          // Previous result
          const newIndex = activeResultIndex <= 0 ? searchResults.length - 1 : activeResultIndex - 1;
          setActiveResultIndex(newIndex);
          setCurrentPage(searchResults[newIndex].pageIndex);
        } else {
          // Next result
          const newIndex = activeResultIndex >= searchResults.length - 1 ? 0 : activeResultIndex + 1;
          setActiveResultIndex(newIndex);
          setCurrentPage(searchResults[newIndex].pageIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePanel, searchResults, activeResultIndex, setActiveResultIndex, setCurrentPage]);

  // Get book ID from URL
  useEffect(() => {
    setBookId(bookIdUrl);
    setFormat(formatUrl);
  }, [bookIdUrl, formatUrl]);


  // Search Integration
  const { results: searchResultsLocal, isSearching } = useBookSearch(bookContent, searchQuery, currentBookId);

  useEffect(() => {
    setSearchResults(searchResultsLocal);
  }, [searchResultsLocal, setSearchResults]);


  // Set total pages on mount
  useEffect(() => {
    setTotalPages(bookContent.length);
  }, [setTotalPages, bookContent.length]);

  useEffect(() => {
    setIsClient(true);

    // Check if mobile on mount
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // If not authenticated, redirect to login
  useEffect(() => {
    if (isClient && !isAuthLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router, isClient]);

  // Set total pages on mount
  useEffect(() => {
    setTotalPages(bookContent.length);
  }, [setTotalPages, bookContent.length]);

  // Keyboard navigation for page view mode
  useEffect(() => {
    if (viewMode !== 'page') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys if not in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentPage(Math.max(1, currentPage - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentPage(Math.min(totalPages, currentPage + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentPage, totalPages, setCurrentPage]);

  // Global keyboard shortcuts (always active)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        e.preventDefault();
        toggleFocusMode();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isFocusMode, toggleFocusMode]);

  // Handle click navigation on page margins (Page View mode only)
  const handlePageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode !== 'page') return;

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const containerWidth = rect.width;

    // Calculate click position as percentage
    const clickPercentage = (clickX / containerWidth) * 100;

    // Define zones: left margin (0-25%), center (25-75%), right margin (75-100%)
    const leftMarginThreshold = isMobile ? 20 : 25;
    const rightMarginThreshold = isMobile ? 80 : 75;

    if (clickPercentage < leftMarginThreshold) {
      // Left margin - go to previous page
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } else if (clickPercentage > rightMarginThreshold) {
      // Right margin - go to next page
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    }
    // Center area - do nothing, allow text selection
  }, [viewMode, currentPage, totalPages, setCurrentPage, isMobile]);

  // Handle mouse move to show hover indicators
  const handlePageMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode !== 'page') {
      setHoverZone(null);
      return;
    }

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const containerWidth = rect.width;

    const mousePercentage = (mouseX / containerWidth) * 100;

    const leftMarginThreshold = isMobile ? 20 : 25;
    const rightMarginThreshold = isMobile ? 80 : 75;

    if (mousePercentage < leftMarginThreshold && currentPage > 1) {
      setHoverZone('left');
    } else if (mousePercentage > rightMarginThreshold && currentPage < totalPages) {
      setHoverZone('right');
    } else {
      setHoverZone('center');
    }
  }, [viewMode, currentPage, totalPages, isMobile]);

  // Handle mouse leave to clear hover indicators
  const handlePageMouseLeave = useCallback(() => {
    setHoverZone(null);
  }, []);

  // Auto theme based on time of day
  useEffect(() => {
    if (typeof window !== 'undefined' && autoTheme) {
      const hour = new Date().getHours();
      const newTheme = hour >= 18 || hour < 6 ? 'dark' : 'light';
      setTheme(newTheme as any);
      setNextTheme(newTheme);
      setAppTheme(newTheme as any);
    }
  }, [autoTheme, setNextTheme, setTheme, setAppTheme]);

  // Update app theme when reader theme changes
  useEffect(() => {
    if (readerTheme === 'eye-comfort') {
      // For eye-comfort mode, we keep the UI in light theme but apply sepia to the content
      setNextTheme('light');
    } else {
      setNextTheme(readerTheme);
    }
  }, [readerTheme, setNextTheme]);

  /* Reader themes are Paper / Sepia / Night (lib/reader-themes.ts, mirrored by the
     [data-reader] tokens). The persisted store still calls them light / eye-comfort / dark. */
  const effectiveReaderTheme =
    readerTheme === 'light' && theme === 'dark'
      ? 'dark'
      : readerTheme === 'light' && theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : readerTheme;
  const readerKey = toReaderKey(effectiveReaderTheme);

  const getThemeStyles = () => {
    const p = READER_PALETTES[readerKey];
    return {
      backgroundColor: p.bg,
      color: p.ink,
      accentColor: 'var(--bb-accent)',
      borderColor: p.border,
      filter: readerKey === 'sepia' ? `contrast(${contrast}) sepia(${colorTemperature}%)` : `contrast(${contrast})`,
      transition: 'background-color 300ms, color 300ms',
    } as React.CSSProperties;
  };

  // Helper function to determine if we're in dark mode (for highlight colors)
  const isDarkMode = () => {
    if (readerTheme === 'dark') return true;
    if (readerTheme === 'eye-comfort') return false;
    // Check system theme when reader is in light mode
    if (theme === 'dark') return true;
    if (theme === 'system' && typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  };

  // Session timer for the progress sheet — hooks must be before any early return
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showPageShimmer, setShowPageShimmer] = useState(false);
  const [vartaInitialQuery, setVartaInitialQuery] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setSessionSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Trigger golden shimmer on page change
  useEffect(() => {
    setShowPageShimmer(true);
    const t = setTimeout(() => setShowPageShimmer(false), 900);
    return () => clearTimeout(t);
  }, [currentPage]);

  const formatSessionTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const wordsPerMin = Math.max(1, Math.round((currentPage * 250) / Math.max(1, sessionSeconds / 60)));

  /* The FAB's eight-item radial menu was here (audit fix 2). Every one
     of its actions now has a permanent home: Search and Aa in the
     header, Contents / Notes / Study / Listen in the bottom bar, Cite
     and Sanchika on the selection sheet. A floating button that opens a
     menu of things that are already on screen is a fifth layer in the
     thumb zone buying nothing, so it is deleted rather than restyled.
     Its CSS in reader.module.css was already dead — this page renders no
     class from that file. */

  // Show loading state while checking authentication
  if (!isClient || !isAuthenticated) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen gap-5 ${isDarkMode() ? 'bg-slate-950' : 'bg-gradient-to-b from-white to-slate-50'}`}>
        <div className="relative">
          <div className="h-12 w-12 border-4 border-slate-200 dark:border-slate-700/50 rounded-full" />
          <div className="h-12 w-12 border-4 border-transparent border-t-[var(--deep-saffron)] rounded-full animate-spin absolute inset-0" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-bb-accent">Opening your book...</p>
      </div>
    );
  }

  // No book was requested via the URL — show the reader landing page
  // (pick-a-book filters + features) instead of falling through to
  // "book-1" and rendering a blank shell.
  if (!bookIdUrl && !personalFileIdUrl) {
    return <ReaderLanding />;
  }

  return (
    /* onScroll pins the shell. The reader root is never meant to scroll —
       it is a fixed viewport with its own scrolling regions inside. But the
       closed panels park off the right edge, so the root HAS hidden
       overflow, and `overflow: hidden` does not stop *programmatic* scrolls:
       any focus() or scrollIntoView() on an element that is momentarily
       off-screen (a drawer control mid-slide, a field inside a panel) makes
       the browser scroll the shell sideways, and nothing can scroll it back.
       That left the whole reader shifted left with a blank band on the right.
       The individual callers pass preventScroll; this is the backstop that
       makes the failure mode impossible rather than merely unlikely. */
    <div ref={protectionRef} data-reader={readerKey} onScroll={(e) => { const el = e.currentTarget; if (el.scrollLeft !== 0) el.scrollLeft = 0; if (el.scrollTop !== 0) el.scrollTop = 0; }} className={`relative w-full h-screen supports-[height:100dvh]:h-[100dvh] overflow-hidden transition-colors duration-500 ${isDarkMode() ? 'text-slate-100' : 'text-slate-900'}`} style={getThemeStyles()}>
      
      {/* Background patterns if in dark mode */}
      {isDarkMode() && <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('/grid.svg')] z-0"></div>}

      {/* DRM: Dynamic Watermark Overlay */}
      {user && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          <DynamicWatermark
            userName={user.name}
            userEmail={user.email}
            userId={user.id}
          />
        </div>
      )}

      {/* Top bar (66px): back · title/chapter · Read/PDF/Listen · search · bookmark · Aa · Ask Varta.
          Search, bookmark and Aa are the three header actions the earlier audit settled on;
          the study tools live in the Study drawer and the bottom bar. */}
      {!isFocusMode && (
        <ReaderTopBar
          title={bookTitle}
          chapter={bookAuthor || undefined}
          mode={format === 'epub' ? 'read' : 'pdf'}
          modes={(() => {
        const t = bookFormatTypes.map((x) => x.toUpperCase());
        const m: ReaderMode[] = [];
        if (t.some((x) => /EPUB|E_BOOK|EBOOK/.test(x)) || format === 'epub') m.push('read');
        if (t.includes('PDF') || format === 'pdf') m.push('pdf');
        if (t.some((x) => /AUDIO/.test(x))) m.push('listen');
        return m;
      })()}
          onMode={(m) => {
            if (m === 'listen') router.push(`/player?bookId=${bookId ?? ''}`);
            else setFormat(m === 'read' ? 'epub' : 'pdf');
          }}
          onBack={() => router.push('/catalog')}
          onSearch={format !== 'pdf' ? () => togglePanel('search') : undefined}
          searchActive={activePanel === 'search'}
          bookmarked={bookmarks.includes(currentPage)}
          onBookmark={() => toggleBookmark(currentPage)}
          onDisplay={() => togglePanel('settings')}
          displayActive={activePanel === 'settings'}
          onVarta={() => openStudy('varta')}
        />
      )}

      {/* Progress ribbon under the bar */}
      {!isFocusMode && (
        <div className="absolute inset-x-0 z-30 h-1 bg-[color:var(--rd-track)]" style={{ top: 'calc(66px + var(--bb-safe-top))' }}>
          <div className="h-full bg-bb-progress transition-all duration-500" style={{ width: `${percentComplete}%` }} />
        </div>
      )}


      {/* Main Reading Viewer Area */}
      {/* 
        CRITICAL FIX: This uses absolute inset positioning with explicit pixel boundaries padding.
        It bypasses the infinite expanding flex container box sizing calculation bugs. 
      */}
      {/* mb clears the bottom bar (fix 2). It used to be `mb-16` for
          EPUB only, so on a PDF the fixed footer overlapped the last
          line of every page. The bar is the same height for both
          formats, so the margin is now unconditional. */}
      {/* The bottom reservation is whatever the bar actually measures
          (bottomBarHeight, published by ReaderBottomBar) rather than a
          hardcoded 84px. The bar's height varies with the safe-area inset
          and with how its labels wrap, so a fixed number left a blank strip
          on some screens and overlapped the page on others. 0px when the
          bar is collapsed to a pill. */}
      <main
        className={`absolute inset-0 z-20 transition-all duration-300 ${!isFocusMode ? 'mt-[calc(66px+var(--bb-safe-top))]' : ''}`}
        style={!isFocusMode ? { marginBottom: bottomBarHeight } : undefined}
      >
        {contentLoading && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm z-30 gap-4">
             <div className="relative">
               <div className="h-10 w-10 border-4 border-slate-200 dark:border-slate-700/30 rounded-full" />
               <div className="h-10 w-10 border-4 border-transparent border-t-[var(--deep-saffron)] rounded-full animate-spin absolute inset-0" />
             </div>
             <p className="text-xs font-semibold tracking-wide text-bb-accent">Loading content...</p>
           </div>
        )}
        
        {contentError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 gap-4">
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20">
              <X className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-sm font-semibold text-red-500 dark:text-red-400">Failed to load book content</p>
            <p className="text-xs text-slate-400">Please try refreshing the page</p>
          </div>
        )}

        {content?.url && (
          <div className="w-full h-full relative z-20 overflow-hidden">
            {format === 'epub' ? (
              <div className="w-full h-full overflow-y-auto">
                <EpubShell
                  url={content.url}
                  initialCfi={lastCfi || ""}
                  theme={readerKey}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  lineHeight={lineHeight}
                  onLocationChange={(cfi, page, href) => {
                    setLastCfi(cfi);
                    setCurrentPage(page);
                    if (href) setEpubHref(href);
                  }}
                  onTocLoad={setEpubToc}
                  onReady={(rendition) => { epubRenditionRef.current = rendition; }}
                  onSpeakText={handleSpeakText}
                  onAskVarta={handleAskVarta}
                  onSaveToSanchika={handleSaveToSanchika}
                />
              </div>
            ) : (
              <div className="w-full h-full" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <PdfShell
                  url={content.url}
                  bookId={currentBookId}
                  initialPage={currentPage}
                  onPageChange={(page) => setCurrentPage(page)}
                  onDocumentLoad={(total) => setTotalPages(total)}
                  onSpeakText={handleReadAloud}
                  onAskVarta={handleAskVarta}
                  onSaveToSanchika={handleSaveToSanchika}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Slide-out Panels overlaid on top of content */}
      
      {/* Search Overlay */}
      {activePanel === 'search' && (
        <div className={`absolute inset-0 z-50 flex items-start justify-center pt-24 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode() ? 'bg-slate-950/70' : 'bg-slate-900/30'} backdrop-blur-sm`} onClick={(e) => { if (e.target === e.currentTarget) closePanel(); }}>
          <div className={`w-full max-w-lg mx-4 rounded-2xl shadow-2xl border ${isDarkMode() ? 'bg-slate-950/95 border-slate-700/50' : 'bg-white/95 border-slate-200/50'} backdrop-blur-md overflow-hidden flex flex-col`}>
            <div className={`p-4 border-b ${isDarkMode() ? 'border-slate-700/30' : 'border-slate-200/50'} flex items-center space-x-3`}>
              <FileSearch className="h-5 w-5 text-[var(--deep-saffron)]" />
              <input
                type="text"
                autoFocus
                placeholder="Search in book..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 bg-transparent border-none outline-none text-base font-medium ${isDarkMode() ? 'text-slate-100 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
              />
              <Button variant="ghost" size="icon" onClick={closePanel} aria-label="Close search" className="hit-target rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {searchQuery.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {isSearching ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="h-6 w-6 border-2 border-slate-300 border-t-[var(--deep-saffron)] rounded-full animate-spin" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <div className={`flex justify-between items-center text-xs px-5 py-3 border-b ${isDarkMode() ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                      <span>{searchResults.length} results found</span>
                      <span>Use <kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">Ctrl+G</kbd> to cycle</span>
                    </div>
                    <ScrollArea className="max-h-[50vh] p-3">
                      <div className="space-y-2">
                        {searchResults.map((result, index) => (
                          <button
                            key={`${result.pageIndex}-${result.charStart}-${index}`}
                            onClick={() => {
                              setActiveResultIndex(index);
                              setCurrentPage(result.pageIndex);
                              closePanel();
                            }}
                            className={`w-full text-left p-3 rounded-xl transition-all border ${activeResultIndex === index ? (isDarkMode() ? 'bg-[var(--deep-saffron)]/10 border-[var(--deep-saffron)]/30' : 'bg-[var(--peacock-teal)]/10 border-slate-300') : (isDarkMode() ? 'border-transparent hover:bg-slate-800/80' : 'border-transparent hover:bg-slate-50')}`}
                          >
                            <div className="flex justify-between text-xs mb-1">
                              <span className={`font-semibold ${isDarkMode() ? 'text-[var(--saffron)]' : 'text-[var(--peacock-teal)]'}`}>Page {result.pageIndex}</span>
                              <span className={isDarkMode() ? 'text-slate-500' : 'text-slate-400'}>{result.chapterTitle}</span>
                            </div>
                            <div className={`text-sm line-clamp-2 leading-relaxed ${isDarkMode() ? 'text-slate-300' : 'text-slate-700'}`}>
                              {(() => {
                                const lowerPreview = result.preview.toLowerCase();
                                const lowerQuery = searchQuery.toLowerCase();
                                const matchIndex = lowerPreview.indexOf(lowerQuery);
                                if (matchIndex === -1) return result.preview;
                                const before = result.preview.substring(0, matchIndex);
                                const match = result.preview.substring(matchIndex, matchIndex + searchQuery.length);
                                const after = result.preview.substring(matchIndex + searchQuery.length);
                                return (
                                  <>
                                    {before}
                                    <span className="bg-[var(--gold)]/30 text-[var(--deep-saffron)] dark:text-[var(--gold)] font-bold px-0.5 rounded mx-px">{match}</span>
                                    {after}
                                  </>
                                );
                              })()}
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <div className={`p-4 rounded-2xl mb-4 ${isDarkMode() ? 'bg-[var(--peacock-teal)]/10' : 'bg-[var(--peacock-teal)]/10'}`}>
                      <FileSearch className="h-8 w-8 text-[var(--saffron)]" />
                    </div>
                    <p className={`text-sm font-semibold mb-1 ${isDarkMode() ? 'text-slate-300' : 'text-slate-700'}`}>No results found</p>
                    <p className={`text-xs ${isDarkMode() ? 'text-slate-500' : 'text-slate-400'}`}>Try a different search for "{searchQuery}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide Out Panel - TOC (Left) */}
      {/* Full height at z-[47], matching StudyDrawer: each of these owns a close
          button, so covering the header and the bottom bar costs nothing and
          buys a full column of list. z-40 would have let the bar (z-[45]) punch
          through the bottom — see the note in StudyDrawer. */}
      <div className={`absolute inset-y-0 left-0 w-[88vw] max-w-[300px] sm:max-w-none sm:w-[300px] lg:w-[340px] pb-[env(safe-area-inset-bottom)] shadow-2xl z-[47] transform transition-transform duration-300 flex flex-col ${activePanel === 'toc' && !isFocusMode ? 'translate-x-0' : '-translate-x-full'} border-r border-[color:var(--rd-border)] bg-[color:var(--rd-panel)] text-[color:var(--rd-ink)] backdrop-blur-md`}>
         <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-bold tracking-tight flex items-center gap-2 text-bb-accent">
                 <List className="h-5 w-5 text-[var(--peacock-teal)] dark:text-[var(--saffron)]" />
                 Index & Bookmarks
               </h3>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 onClick={closePanel}
                 aria-label="Close contents"
                 className="hit-target rounded-full"
               >
                  <X className="h-4 w-4" />
               </Button>
            </div>
         </div>
         
         <div className="p-4 flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="contents" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid grid-cols-3 mx-0 mb-4 p-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-sm min-h-[44px]">
                <TabsTrigger 
                  value="contents" 
                  className="rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 dark:data-[state=inactive]:text-slate-400"
                >Index</TabsTrigger>
                <TabsTrigger 
                  value="pages" 
                  className="rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 dark:data-[state=inactive]:text-slate-400"
                >Pages</TabsTrigger>
                <TabsTrigger 
                  value="bookmarks" 
                  className="rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 dark:data-[state=inactive]:text-slate-400 flex items-center gap-1"
                >
                  <Bookmark className="h-3.5 w-3.5" /> Bookmarks
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="contents" forceMount className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                <ScrollArea className="h-full pr-2">
                  {format === 'pdf' ? (
                    <div id="pdf-toc-container" className="space-y-1.5 text-sm" />
                  ) : format === 'epub' && epubToc.length > 0 ? (
                    <nav aria-label="Chapters" className="space-y-1">
                      {epubToc.map((item, i) => {
                        const base = item.href.split('#')[0];
                        const active = !!epubHref && epubHref.split('#')[0].endsWith(base);
                        return (
                          <button
                            key={item.href + i}
                            onClick={() => { epubRenditionRef.current?.display(item.href); closePanel(); }}
                            aria-current={active ? 'true' : undefined}
                            className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors ${active ? 'bg-[color:var(--rd-track)] font-semibold' : 'hover:bg-[color:var(--rd-track)]'}`}
                          >
                            <span className={`w-6 shrink-0 text-xs font-bold ${active ? 'text-bb-accent' : 'text-[color:var(--rd-sub)]'}`}>{i + 1}</span>
                            <span className="line-clamp-2 flex-1">{item.label}</span>
                            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${active ? 'bg-bb-accent' : 'bg-transparent'}`} />
                          </button>
                        );
                      })}
                    </nav>
                  ) : (
                    <div className="space-y-1.5">
                      {bookContent.map((page) => {
                        const isCompleted = currentPage > page.number || (sessionPageSeconds[page.number] && sessionPageSeconds[page.number] > 60);
                        const isActive = currentPage === page.number;
                        const timeSpent = sessionPageSeconds[page.number] || 0;
                        return (
                          <button
                            key={page.number}
                            onClick={() => setCurrentPage(page.number)}
                            className={`w-full text-left p-3 rounded-xl transition-all border block ${isActive ? (isDarkMode() ? 'bg-[var(--deep-saffron)]/10 border-[var(--deep-saffron)]/30' : 'bg-[var(--peacock-teal)]/10 border-slate-300') : (isDarkMode() ? 'border-transparent hover:bg-slate-800/80' : 'border-transparent hover:bg-slate-50')}`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className={`font-medium line-clamp-1 flex-1 text-sm ${isActive ? 'text-[var(--peacock-teal)] dark:text-[var(--saffron)]' : ''}`}>
                                Ch. {page.number}: {page.content.split('\n')[0].replace('Chapter ' + page.number + ':', '')}
                              </span>
                              {isCompleted && <BookOpenCheck className="h-4 w-4 text-emerald-500 shrink-0" />}
                            </div>
                            <div className="flex items-center justify-between text-[10px] mt-2 opacity-70">
                               <span>{isActive ? 'Reading now' : isCompleted ? 'Read' : `${Math.max(1, Math.ceil(page.content.length / 1000))} min`}</span>
                               {timeSpent > 0 && <span>{Math.floor(timeSpent / 60)}m spent</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pages" forceMount className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                <ScrollArea className="h-full pr-2">
                  <div id="pdf-thumbnails-container" className="pdf-thumbnails-grid" />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="bookmarks" forceMount className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                <ScrollArea className="h-full pr-2">
                  {bookmarks.length > 0 ? (
                    <div className="space-y-2">
                    {bookmarks.map(page => (
                      <button key={page} onClick={() => setCurrentPage(page)} className={`w-full text-left p-3 rounded-xl transition-all duration-200 border group ${currentPage === page ? (isDarkMode() ? 'bg-[var(--deep-saffron)]/10 border-[var(--deep-saffron)]/30' : 'bg-[var(--peacock-teal)]/10 border-slate-300') : (isDarkMode() ? 'border-slate-800/50 hover:bg-[var(--peacock-teal)]/10 hover:border-[var(--deep-saffron)]/20' : 'border-slate-100 hover:bg-[var(--peacock-teal)]/5 hover:border-slate-300/50')}`}>
                        <div className="font-medium text-sm flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${currentPage === page ? 'bg-[var(--deep-saffron)]/20' : (isDarkMode() ? 'bg-slate-800' : 'bg-[var(--peacock-teal)]/10')} transition-colors`}>
                            <Bookmark className="h-3.5 w-3.5 text-[var(--deep-saffron)]" fill={currentPage === page ? 'currentColor' : 'none'} />
                          </div>
                          <span className={`${currentPage === page ? 'text-[var(--peacock-teal)] dark:text-[var(--saffron)]' : ''}`}>Page {page}</span>
                        </div>
                      </button>
                    ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className={`p-4 rounded-2xl mb-4 ${isDarkMode() ? 'bg-[var(--peacock-teal)]/10' : 'bg-[var(--peacock-teal)]/10'}`}>
                        <Bookmark className="h-8 w-8 text-[var(--saffron)]" />
                      </div>
                      <p className={`text-sm font-semibold mb-1 ${isDarkMode() ? 'text-slate-300' : 'text-slate-700'}`}>No bookmarks yet</p>
                      <p className={`text-xs ${isDarkMode() ? 'text-slate-500' : 'text-slate-400'}`}>Tap the bookmark icon to save pages</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>


            </Tabs>
         </div>
      </div>

      {/* Display panel ("Aa"): a 320px popover from tablet up, a bottom sheet on phones. */}
      {activePanel === 'settings' && !isFocusMode && (
        <div className="absolute inset-0 z-[46] md:hidden" onClick={closePanel} aria-hidden="true" />
      )}
      <div
        role="dialog"
        aria-label="Text and display"
        aria-hidden={!(activePanel === 'settings' && !isFocusMode)}
        className={`absolute z-[47] flex flex-col border border-[color:var(--rd-border)] bg-[color:var(--rd-panel)] text-[color:var(--rd-ink)] shadow-e2 backdrop-blur-md transition-[transform,opacity] duration-bb-ui ease-bb inset-x-0 bottom-0 max-h-[85dvh] rounded-t-[30px] pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-auto md:right-5 md:top-[78px] md:max-h-[calc(100dvh-100px)] md:w-[320px] md:rounded-[22px] md:pb-0 ${activePanel === 'settings' && !isFocusMode ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[110%] opacity-0 md:-translate-y-2 md:translate-y-0'}`}
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-[color:var(--rd-track)] md:hidden" />
        <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-3">
          <h3 className="font-display text-xl font-extrabold tracking-[-0.03em]">Text &amp; display</h3>
          <button type="button" onClick={closePanel} aria-label="Close settings" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[color:var(--rd-track)] focus-visible:outline-none focus-visible:shadow-focus">
            <Icon name="close" size={20} fillLayer={false} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2">
          <ReaderDisplayContent showTextControls={format !== 'pdf'} />
        </div>
      </div>

      {/* Floating View Mode Switch (EPUB only).
          Was at bottom-6, which is now inside the bottom bar. Moved above
          it — one more thing that had been quietly sharing the thumb
          zone (audit fix 2). */}
      {!isFocusMode && format !== 'pdf' && (
        <div className="absolute bottom-[96px] left-1/2 -translate-x-1/2 z-[43]">
          <EnhancedButton variant="outline" size="sm" onClick={toggleViewMode} className={`rounded-full px-5 py-2.5 shadow-2xl backdrop-blur-md border transition-all duration-300 hover:scale-105 hover:shadow-[var(--deep-saffron)]/20 ${isDarkMode() ? 'bg-slate-900/90 text-white border-slate-700/50 hover:border-[var(--deep-saffron)]/50' : 'bg-white/95 text-slate-800 border-slate-300/60 hover:border-indigo-300'}`}>
            {viewMode === 'scroll' ? <><BookOpenCheck className="h-4 w-4 mr-2 text-[var(--deep-saffron)]" /> <span className="font-semibold">Page View</span></> : <><ScrollText className="h-4 w-4 mr-2 text-[var(--deep-saffron)]" /> <span className="font-semibold">Scroll View</span></>}
          </EnhancedButton>
        </div>
      )}

      {/* Floating Exit Focus Mode Button */}
      {isFocusMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <EnhancedButton variant="outline" size="sm" onClick={toggleFocusMode} className={`rounded-full px-5 py-2.5 shadow-2xl backdrop-blur-md border transition-all duration-300 hover:scale-105 ${isDarkMode() ? 'bg-slate-900/90 text-slate-200 border-slate-700/50 hover:border-[var(--deep-saffron)]/50 hover:shadow-[var(--deep-saffron)]/20' : 'bg-white/95 text-slate-700 border-slate-300/60 hover:border-indigo-300 hover:shadow-[var(--deep-saffron)]/10'}`}>
            <X className="h-4 w-4 mr-2 text-red-400" /> <span className="font-semibold">Exit Focus Mode</span>
          </EnhancedButton>
        </div>
      )}

      {/* ── Panels ──
          Was five overlays mounted side by side, each with its own open
          flag: annotations, graph, Sanchika, Varta and the TTS bar.
          Notes, Varta and Graph are tabs of the one Study drawer now
          (audit fix 1); Sanchika is a panel in the same activePanel enum,
          so opening it closes the drawer rather than landing on top of
          it. */}
      <StudyDrawer
        bookId={currentBookId}
        currentPage={currentPage}
        isDarkMode={isDarkMode()}
        initialQuery={vartaInitialQuery}
        onQueryCleared={() => setVartaInitialQuery('')}
      />

      {/* ── The thumb zone, single owner (audit fix 2) ──
          Hidden in focus mode, which is the one state where the student
          has asked for nothing but the text. */}
      {!isFocusMode && (
        <>
          <ReaderProgressSheet
            currentPage={currentPage}
            totalPages={totalPages}
            percentComplete={percentComplete}
            minutesLeft={minutesLeft}
            sessionSeconds={sessionSeconds}
            wordsPerMin={wordsPerMin}
            isDarkMode={isDarkMode()}
          />
          <ReaderBottomBar
            currentPage={currentPage}
            totalPages={totalPages}
            minutesLeft={minutesLeft}
            percentComplete={percentComplete}
            isDarkMode={isDarkMode()}
            isListening={ttsState.isPlaying}
            onListen={() => handleReadAloud()}
            pairWithAnnotate={format === 'pdf'}
          />
        </>
      )}

      {/* The TTS bar used to float at bottom-6 — a fifth thing in the
          thumb zone. It sits directly above the bottom bar now, so the
          bar's own Stop control stays reachable while it plays. */}
      {ttsState.isPlaying && (
        <div className="absolute left-1/2 -translate-x-1/2 z-[44] px-2 w-full max-w-md" style={{ bottom: bottomBarHeight }}>
          <TTSControlBar text={''} onClose={stopReading} ttsInstance={tts} />
        </div>
      )}
      <DictionaryModal />
      <CreateFlashcardModal isOpen={isFlashcardOpen} onClose={() => setIsFlashcardOpen(false)} initialFrontText={flashcardText} bookId={bookId || undefined} bookTitle={bookTitle} />
      <CitationGeneratorModal isOpen={isCitationOpen} onClose={() => setIsCitationOpen(false)} bookData={{ title: bookTitle, author: bookAuthor || 'Unknown Author', publisher: 'VPD', publishYear: new Date().getFullYear() }} />
    </div>
  )
}

