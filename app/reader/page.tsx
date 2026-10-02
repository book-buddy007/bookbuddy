'use client';

import React,{ useEffect,useState,useCallback,useMemo,Suspense } from 'react';



import { Button } from "@/components/ui/button";
import { Tabs,TabsList,TabsTrigger,TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "next-themes";
import { useRouter,useSearchParams } from 'next/navigation';
import { useReaderStore } from '@/store/useReaderStore';
import { useAppStore } from '@/store/useAppStore';
import { useAnnotationStore } from '@/store/useAnnotationStore';
import { StudyDrawer } from '@/components/reader/StudyDrawer';
import { ReaderBottomBar } from '@/components/reader/ReaderBottomBar';
import { ReaderProgressSheet } from '@/components/reader/ReaderProgressSheet';
import { useSanchikaStore } from '@/store/useSanchikaStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useBookSearch } from '@/lib/hooks/useBookSearch';
import { useReadingProgress } from '@/lib/hooks/useReadingProgress';
import { DictionaryModal } from '@/components/reader/DictionaryModal';
import { CreateFlashcardModal } from '@/components/reader/CreateFlashcardModal';
import { CitationGeneratorModal } from '@/components/reader/CitationGeneratorModal';
import { useTextToSpeech } from '@/lib/hooks/useTextToSpeech';
import { TTSControlBar } from '@/components/reader/TTSControlBar';
import { ReaderTopBar,type ReaderMode } from '@/components/reader/ReaderTopBar';
import { ReaderDisplayContent } from '@/components/reader/ReaderDisplayContent';
import { READER_PALETTES,toReaderKey } from '@/lib/reader-themes';
import { Icon } from '@/components/ui/icon';

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
    <Suspense fallback={<ReaderSplash />}>
      <ReaderContent />
    </Suspense>
  );
}

/** Full-screen "opening" state, shown before auth and the book have resolved. */
function ReaderSplash({ label = 'Opening your book…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bb-bg text-bb-text">
      <Icon name="loader" size={28} fillLayer={false} className="animate-spin text-bb-accent" />
      <p className="text-sm font-semibold text-bb-muted">{label}</p>
    </div>
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
  /* `?page=N` (Varta's "Open in reader" citation links) opens at that page. It is
     applied once, AFTER the saved position arrives from the server, so the citation
     wins over "where you left off". Page numbers come from PDF citations, so an
     EPUB (which paginates by location) ignores it. */
  const pageParamRef = React.useRef<number | null>(
    (() => {
      const n = Number(searchParams.get('page'));
      return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
    })(),
  );
  const applyPageParam = useCallback(() => {
    const p = pageParamRef.current;
    if (!p) return;
    pageParamRef.current = null;
    useReaderStore.getState().setCurrentPage(p);
  }, []);

  // Use our Zustand store instead of local state
  const {
    fontSize,
    lineHeight,
    fontFamily,
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
    isFocusMode,
    bottomBarHeight,
    searchQuery,
    searchResults,
    activeResultIndex,
    sessionPageSeconds,

    setTheme,

    setCurrentPage,
    setTotalPages,
    setLastCfi,
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
  const [flashcardText] = useState('');
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
  // Contents rail summary: this book's highlights and notes.
  const allAnnotations = useAnnotationStore((s) => s.annotations);
  const annotationCounts = useMemo(() => {
    let highlights = 0;
    let notes = 0;
    for (const a of allAnnotations) {
      if (a.bookId !== currentBookId || a.parentId) continue;
      if (a.type === 'highlight') highlights++;
      else if (a.type === 'note') notes++;
    }
    return { highlights, notes };
  }, [allAnnotations, currentBookId]);
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
  /* EPUBs reflow, so epub.js's "page" is only the page within the current chapter
     (and the total used to read 0). Book-wide positions come from generated
     locations (~1600 characters each): the bar counts "Location x of y" and the
     scrubber can seek. Until they are ready the chapter page is shown. */
  const [epubLocationsReady, setEpubLocationsReady] = useState(false);
  const epubLocationOf = useCallback((cfi: string): number | null => {
    const book = epubRenditionRef.current?.book;
    if (!book || !epubLocationsReady) return null;
    const loc = book.locations.locationFromCfi(cfi) as unknown as number;
    return typeof loc === 'number' && loc >= 0 ? loc + 1 : null;
  }, [epubLocationsReady]);
  const handleEpubReady = useCallback((rendition: import('epubjs').Rendition) => {
    epubRenditionRef.current = rendition;
    setEpubLocationsReady(false);
    const book = rendition.book;
    book.ready
      .then(() => book.locations.generate(1600))
      .then(() => {
        if (epubRenditionRef.current !== rendition) return;
        const total = book.locations.length();
        if (total > 0) setTotalPages(total);
        setEpubLocationsReady(true);
        const cfi = (rendition.currentLocation() as any)?.start?.cfi;
        const loc = cfi ? (book.locations.locationFromCfi(cfi) as unknown as number) : -1;
        if (typeof loc === 'number' && loc >= 0) setCurrentPage(loc + 1);
      })
      .catch(() => undefined);
  }, [setTotalPages, setCurrentPage]);

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
      if (formatUrl !== 'epub') applyPageParam();
    } else {
      // Institutional book: full init + annotation sync
      initFromServer(activeId).finally(() => {
        if (formatUrl !== 'epub') applyPageParam();
      });
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


  // Scrubber: PDFs jump by page (PdfShell follows the store's currentPage);
  // EPUBs display the CFI for the chosen location.
  const handleSeek = useCallback((page: number) => {
    if (format === 'epub') {
      const r = epubRenditionRef.current;
      const cfi = epubLocationsReady ? r?.book.locations.cfiFromLocation(page - 1) : null;
      if (r && cfi) r.display(cfi);
    } else {
      setCurrentPage(page);
    }
  }, [format, epubLocationsReady, setCurrentPage]);
  const canSeek = format !== 'epub' || epubLocationsReady;

  // Calculate reading stats
  // totalPages is 0 until the document (or EPUB locations) report a count.
  const percentComplete = totalPages > 0 ? Math.min(100, Math.max(1, Math.round((currentPage / totalPages) * 100))) : 0;
  const pagesTracked = Object.keys(sessionPageSeconds).length;
  const totalSecondsTracked = Object.values(sessionPageSeconds).reduce((a, b) => a + b, 0);
  const avgSecondsPerPage = pagesTracked > 0 ? Math.max(10, totalSecondsTracked / pagesTracked) : 60;
  const minutesLeft = totalPages > 0 ? Math.max(0, Math.ceil(((totalPages - currentPage) * avgSecondsPerPage) / 60)) : 0;

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
      transition: 'background-color 300ms, color 300ms',
    } as React.CSSProperties;
  };
  /* Warmth and contrast tint the page only. They used to sit on the reader root,
     which filtered the toolbars, panels and popovers along with the text. */
  const contentFilter = [
    contrast !== 1 ? `contrast(${contrast})` : '',
    colorTemperature > 0 ? `sepia(${colorTemperature}%)` : '',
  ].filter(Boolean).join(' ') || undefined;

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
  const [vartaInitialQuery, setVartaInitialQuery] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setSessionSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

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
    return <ReaderSplash />;
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
    <div ref={protectionRef} data-reader={readerKey} onScroll={(e) => { const el = e.currentTarget; if (el.scrollLeft !== 0) el.scrollLeft = 0; if (el.scrollTop !== 0) el.scrollTop = 0; }} className="relative h-screen w-full overflow-hidden text-[color:var(--rd-ink)] supports-[height:100dvh]:h-[100dvh]" style={getThemeStyles()}>

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
      {/* On xl the contents rail is permanent, so the page column starts after it. */}
      <main
        className={`absolute inset-0 z-20 transition-[margin,padding] duration-300 ${!isFocusMode ? 'mt-[calc(70px+var(--bb-safe-top))] xl:pl-[260px]' : ''}`}
        style={{ ...(!isFocusMode ? { marginBottom: bottomBarHeight } : {}), filter: contentFilter }}
      >
        {contentLoading && (
          <div role="status" className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[color:var(--rd-bg)]">
            <Icon name="loader" size={26} fillLayer={false} className="animate-spin text-bb-accent" />
            <p className="text-sm font-semibold text-[color:var(--rd-sub)]">Loading your book…</p>
          </div>
        )}

        {contentError && (
          <div role="alert" className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-bb-lg bg-bb-danger-soft text-bb-danger-ink">
              <Icon name="alert-circle" size={26} fillLayer={false} />
            </span>
            <p className="font-display text-lg font-bold">Couldn&apos;t open this book</p>
            <p className="text-sm text-[color:var(--rd-sub)]">Check your connection, then reload the page.</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <Icon name="rotate-cw" fillLayer={false} />
              Reload
            </Button>
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
                    setCurrentPage(epubLocationOf(cfi) ?? page);
                    if (href) setEpubHref(href);
                  }}
                  onTocLoad={setEpubToc}
                  onReady={handleEpubReady}
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
      
      {/* Search overlay (EPUB; PDFs search inside PdfShell) */}
      {activePanel === 'search' && (
        <div
          className="absolute inset-0 z-50 flex items-start justify-center bg-[rgba(10,15,36,0.35)] pt-24 backdrop-blur-sm animate-in fade-in-0 duration-bb-ui"
          onClick={(e) => { if (e.target === e.currentTarget) closePanel(); }}
        >
          <div role="dialog" aria-label="Search in book" className="mx-4 flex w-full max-w-lg flex-col overflow-hidden rounded-bb-lg border border-[color:var(--rd-border)] bg-[color:var(--rd-panel)] text-[color:var(--rd-ink)] shadow-e2 animate-in zoom-in-95 duration-bb-ui">
            <div className="flex items-center gap-3 border-b border-[color:var(--rd-border)] px-4 py-3">
              <Icon name="search" size={20} className="shrink-0 text-bb-accent" />
              <input
                type="search"
                autoFocus
                aria-label="Search in book"
                placeholder="Search in this book…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-0 flex-1 border-none bg-transparent text-base font-medium outline-none placeholder:text-[color:var(--rd-sub)]"
              />
              <button type="button" onClick={closePanel} aria-label="Close search" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-[color:var(--rd-track)] focus-visible:outline-none focus-visible:shadow-focus">
                <Icon name="close" size={18} fillLayer={false} />
              </button>
            </div>

            {searchQuery.length > 0 && (
              <div className="flex flex-1 flex-col overflow-hidden">
                {isSearching ? (
                  <div role="status" className="flex items-center justify-center p-8">
                    <Icon name="loader" size={22} fillLayer={false} className="animate-spin text-bb-accent" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between border-b border-[color:var(--rd-border)] px-5 py-2.5 text-xs text-[color:var(--rd-sub)]">
                      <span>{searchResults.length} results</span>
                      <span className="hidden sm:inline">
                        <kbd className="rounded bg-[color:var(--rd-track)] px-1.5 py-0.5 text-[10px] font-semibold">Ctrl+G</kbd> next
                      </span>
                    </div>
                    <ScrollArea className="max-h-[50vh] p-2">
                      <ul className="space-y-1">
                        {searchResults.map((result, index) => {
                          const lowerPreview = result.preview.toLowerCase();
                          const matchIndex = lowerPreview.indexOf(searchQuery.toLowerCase());
                          return (
                            <li key={`${result.pageIndex}-${result.charStart}-${index}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveResultIndex(index);
                                  setCurrentPage(result.pageIndex);
                                  closePanel();
                                }}
                                aria-current={activeResultIndex === index ? 'true' : undefined}
                                className={`w-full rounded-bb-md p-3 text-left transition-colors ${activeResultIndex === index ? 'bg-[color:var(--rd-track)]' : 'hover:bg-[color:var(--rd-track)]'}`}
                              >
                                <span className="mb-1 flex justify-between gap-3 text-xs">
                                  <span className="font-bold text-bb-accent-ink">Page {result.pageIndex}</span>
                                  <span className="truncate text-[color:var(--rd-sub)]">{result.chapterTitle}</span>
                                </span>
                                <span className="line-clamp-2 font-reading text-[15px] leading-relaxed">
                                  {matchIndex === -1 ? result.preview : (
                                    <>
                                      {result.preview.substring(0, matchIndex)}
                                      <mark className="rounded bg-[color:var(--rd-hl)] px-0.5 font-semibold text-inherit">
                                        {result.preview.substring(matchIndex, matchIndex + searchQuery.length)}
                                      </mark>
                                      {result.preview.substring(matchIndex + searchQuery.length)}
                                    </>
                                  )}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex flex-col items-center px-4 py-10 text-center">
                    <Icon name="search" size={28} className="mb-3 text-[color:var(--rd-sub)]" />
                    <p className="text-sm font-semibold">No results</p>
                    <p className="mt-1 text-xs text-[color:var(--rd-sub)]">Nothing matches &ldquo;{searchQuery}&rdquo; in this book.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Contents: a drawer below xl, a permanent 260px rail from xl up ──
          Below xl it is full height at z-[47] (it owns a close button, so covering
          the bars costs nothing). From xl it sits between the top bar and the
          bottom bar, under both, and the page column starts after it. It is ONE
          element at every size because PdfShell portals the PDF outline and
          thumbnails into #pdf-toc-container / #pdf-thumbnails-container. */}
      <aside
        aria-label="Contents"
        style={{ ['--rail-bottom' as string]: `${bottomBarHeight}px` }}
        className={[
          'absolute inset-y-0 left-0 z-[47] flex w-[88vw] max-w-[320px] flex-col border-r border-[color:var(--rd-border)] bg-[color:var(--rd-panel)] pb-[env(safe-area-inset-bottom)] text-[color:var(--rd-ink)] shadow-e2 transition-transform duration-300 sm:w-[320px]',
          activePanel === 'toc' && !isFocusMode ? 'translate-x-0' : '-translate-x-full',
          !isFocusMode
            ? 'xl:bottom-[var(--rail-bottom)] xl:top-[calc(70px+var(--bb-safe-top))] xl:z-[44] xl:w-[260px] xl:translate-x-0 xl:pb-0 xl:shadow-none'
            : '',
        ].join(' ')}
      >
        <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4">
          <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">Contents</h3>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close contents"
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-[color:var(--rd-track)] focus-visible:outline-none focus-visible:shadow-focus xl:hidden"
          >
            <Icon name="close" size={18} fillLayer={false} />
          </button>
        </div>

        <Tabs defaultValue="contents" className="flex min-h-0 flex-1 flex-col px-3">
          <TabsList className="grid h-auto grid-cols-3 rounded-full bg-[color:var(--rd-track)] p-1">
            {[
              { value: 'contents', label: 'Chapters' },
              { value: 'pages', label: 'Pages' },
              { value: 'bookmarks', label: 'Saved' },
            ].map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="min-h-9 rounded-full text-[13px] font-semibold text-[color:var(--rd-sub)] shadow-none data-[state=active]:bg-[color:var(--rd-panel)] data-[state=active]:text-[color:var(--rd-ink)] data-[state=active]:shadow-e1"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="contents" forceMount className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
            <ScrollArea className="h-full pr-1">
              {format === 'pdf' ? (
                <div id="pdf-toc-container" className="space-y-1.5 text-sm" />
              ) : epubToc.length > 0 ? (
                <nav aria-label="Chapters" className="space-y-0.5 pb-2">
                  {(() => {
                    const activeIdx = epubToc.findIndex((item) => !!epubHref && epubHref.split('#')[0].endsWith(item.href.split('#')[0]));
                    return epubToc.map((item, i) => {
                      const active = i === activeIdx;
                      const done = activeIdx > -1 && i < activeIdx;
                      return (
                        <button
                          key={item.href + i}
                          type="button"
                          onClick={() => { epubRenditionRef.current?.display(item.href); closePanel(); }}
                          aria-current={active ? 'true' : undefined}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-bb-md px-3 text-left text-sm transition-colors ${active ? 'bg-[color:var(--rd-track)] font-semibold' : 'hover:bg-[color:var(--rd-track)]'}`}
                        >
                          <span className={`w-6 shrink-0 text-xs font-bold tabular-nums ${active ? 'text-bb-accent' : 'text-[color:var(--rd-sub)]'}`}>{i + 1}</span>
                          <span className="line-clamp-2 flex-1">{item.label}</span>
                          <span
                            aria-label={active ? 'Reading now' : done ? 'Read' : undefined}
                            className={`h-2 w-2 shrink-0 rounded-full ${active ? 'bg-bb-accent' : done ? 'bg-bb-cobalt-light' : 'bg-transparent'}`}
                          />
                        </button>
                      );
                    });
                  })()}
                </nav>
              ) : (
                <p className="px-2 py-6 text-center text-sm text-[color:var(--rd-sub)]">This book has no table of contents.</p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pages" forceMount className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
            <ScrollArea className="h-full pr-1">
              {format === 'pdf' ? (
                <div id="pdf-thumbnails-container" className="pdf-thumbnails-grid" />
              ) : (
                <p className="px-2 py-6 text-center text-sm text-[color:var(--rd-sub)]">Page thumbnails are available for PDFs.</p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="bookmarks" forceMount className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
            <ScrollArea className="h-full pr-1">
              {bookmarks.length > 0 ? (
                <ul className="space-y-0.5 pb-2">
                  {[...bookmarks].sort((a, b) => a - b).map((page) => (
                    <li key={page}>
                      <button
                        type="button"
                        onClick={() => handleSeek(page)}
                        aria-current={currentPage === page ? 'true' : undefined}
                        className={`flex min-h-11 w-full items-center gap-3 rounded-bb-md px-3 text-left text-sm transition-colors ${currentPage === page ? 'bg-[color:var(--rd-track)] font-semibold' : 'hover:bg-[color:var(--rd-track)]'}`}
                      >
                        <Icon name="bookmark" size={16} className="text-bb-accent" />
                        {format === 'epub' ? 'Location' : 'Page'} {page}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <Icon name="bookmark" size={26} className="mb-3 text-[color:var(--rd-sub)]" />
                  <p className="text-sm font-semibold">No bookmarks yet</p>
                  <p className="mt-1 text-xs text-[color:var(--rd-sub)]">Use the bookmark button in the top bar to save a page.</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Highlights summary */}
        {!isPersonalFile && (
          <div className="m-3 shrink-0 rounded-bb-md bg-[color:var(--rd-track)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--rd-sub)]">Your highlights</p>
            <p className="mt-1 font-display text-base font-bold">
              {annotationCounts.highlights} highlight{annotationCounts.highlights === 1 ? '' : 's'}
              <span className="font-normal text-[color:var(--rd-sub)]"> · {annotationCounts.notes} note{annotationCounts.notes === 1 ? '' : 's'}</span>
            </p>
            <button
              type="button"
              onClick={() => openStudy('notes')}
              className="mt-2 inline-flex items-center gap-1 rounded text-sm font-semibold text-bb-accent-ink hover:underline focus-visible:outline-none focus-visible:shadow-focus"
            >
              Open notes
              <Icon name="arrow-right" size={14} fillLayer={false} />
            </button>
          </div>
        )}
      </aside>

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

      {/* (The floating "Page View / Scroll View" switch that used to sit here toggled
          `viewMode`, which no reader component reads, so it was removed.) */}

      {/* Exit focus mode. Always visible (faint until hovered or focused): touch
          devices have no hover, and this is the only way back besides Escape. */}
      {isFocusMode && (
        <div className="absolute left-1/2 top-[calc(12px+var(--bb-safe-top))] z-50 -translate-x-1/2 opacity-60 transition-opacity duration-bb-ui focus-within:opacity-100 hover:opacity-100">
          <button
            type="button"
            onClick={toggleFocusMode}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--rd-border)] bg-[color:var(--rd-panel)] px-4 text-sm font-semibold text-[color:var(--rd-ink)] shadow-e2 focus-visible:outline-none focus-visible:shadow-focus"
          >
            <Icon name="close" size={16} fillLayer={false} />
            Exit focus mode
          </button>
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
            unit={format === 'epub' && epubLocationsReady ? 'Location' : 'Page'}
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
            onSeek={canSeek ? handleSeek : undefined}
            unit={format === 'epub' && epubLocationsReady ? 'Location' : 'Page'}
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

