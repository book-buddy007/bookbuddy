import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SearchResult } from '@/lib/hooks/useBookSearch';

/* ── Panel traffic control (audit fix 1) ───────────────────────────────
   The reader used to track every overlay with its own independent
   boolean — three here (isSearchOpen / isSettingsOpen / isTocOpen) and
   the rest scattered across component state and two other stores. None
   of them knew about each other, so on a 390px screen two or three
   could stack on top of one another and the student had to dismiss them
   in the order they happened to arrive.

   One field replaces the lot. Mutual exclusion is not enforced by
   remembering to close the previous panel — it is structural, because
   a variable can only hold one value. Adding a panel later cannot
   reintroduce the bug. */
export type ReaderPanel =
  | 'toc'       // Contents — chapters, pages, bookmarks
  | 'search'    // Full-text search
  | 'settings'  // Aa — font, size, theme, margins
  | 'study'     // The Study drawer: Notes · Varta · Sanchika · Quiz · Graph · Digest
  | 'progress'  // Reading stats + session timer (was the floating stats bar)
  | null;

/* Which tab the Study drawer opens on. Kept separate from activePanel so
   that "Ask Varta" from a text selection can name a destination tab
   without the caller having to know the drawer is what will open.

   Sanchika lives here too rather than as its own overlay: it used to be a
   separate right-edge panel that fought Varta for the same slot, so the
   two could never be seen together and opening one closed the other. As a
   tab it shares the drawer's single space instead of competing for it. */
export type StudyTab = 'notes' | 'vocab' | 'varta' | 'sanchika' | 'quiz' | 'graph' | 'digest';

// Define the shape of our reader store state
interface ReaderState {
  // Reading settings
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  margins: number;
  theme: 'light' | 'dark' | 'eye-comfort';
  colorTemperature: number;
  contrast: number;
  autoTheme: boolean;

  // Reading progress
  currentPage: number;
  /** Reader pages visited since this reader mounted, in visit order. Not
      persisted — "this session" means this sitting, and a list restored from
      last week would quiz on pages the student no longer remembers reading. */
  sessionPages: number[];
  totalPages: number;
  lastCfi: string | null;
  viewMode: 'scroll' | 'page';
  bookmarks: number[];

  // UI state — one panel at a time, see ReaderPanel above
  activePanel: ReaderPanel;
  studyTab: StudyTab;
  isFocusMode: boolean;
  /* Whether the bottom action bar is tucked to a pill. Lifted out of the
     bar's own component state so the reading area can reclaim the space it
     used to reserve (the leftover "ribbon" under the page) and so the
     drawing rail's Annotate pill can dock beside the bar's pill instead of
     stacking over it. */
  isBottomBarCollapsed: boolean;
  /* The bottom bar's MEASURED height in px (0 when collapsed to a pill).
     The reading area and the Study drawer reserve this instead of a
     hardcoded 84px: the real height moves with the device's safe-area
     inset and with how the bar's labels wrap, so a fixed number left a
     blank strip under the page on some screens and overlapped it on
     others. ReaderBottomBar owns writing it. */
  bottomBarHeight: number;
  searchQuery: string;
  searchResults: SearchResult[];
  activeResultIndex: number;

  // Progress & Sync
  sessionStartTime: number | null;
  sessionPageSeconds: Record<number, number>;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';

  // Reading Streak
  currentStreak: number;
  longestStreak: number;
  dailyGoalProgress: number; // percentage 0-100

  // Actions
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setFontFamily: (family: string) => void;
  setMargins: (margins: number) => void;
  setTheme: (theme: 'light' | 'dark' | 'eye-comfort') => void;
  setColorTemperature: (temp: number) => void;
  setContrast: (contrast: number) => void;
  toggleAutoTheme: () => void;

  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  setLastCfi: (cfi: string | null) => void;
  toggleViewMode: () => void;
  toggleBookmark: (page: number) => void;

  /* Opening any panel closes whatever was open — that is the whole
     point of the enum, so there is no `closeOthers` to forget. */
  openPanel: (panel: Exclude<ReaderPanel, null>) => void;
  togglePanel: (panel: Exclude<ReaderPanel, null>) => void;
  closePanel: () => void;
  /* Opens the Study drawer on a named tab in one action, so callers
     (the selection sheet, the bottom bar) never set two fields and
     race. */
  openStudy: (tab?: StudyTab) => void;
  setStudyTab: (tab: StudyTab) => void;
  toggleFocusMode: () => void;
  toggleBottomBar: () => void;
  setBottomBarHeight: (px: number) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setActiveResultIndex: (index: number) => void;

  setSessionStartTime: (time: number | null) => void;
  updateSessionPageSeconds: (page: number, seconds: number) => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'synced' | 'error') => void;
  syncToServer: (bookId: string) => Promise<void>;
  initFromServer: (bookId: string) => Promise<void>;

  // Streak Sync
  fetchStreak: () => Promise<void>;
  updateStreak: (minutesRead: number) => Promise<void>;

  // Reset settings
  resetSettings: () => void;
}

// Create the store with persist middleware for localStorage
export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      // Initial state
      fontSize: 16,
      lineHeight: 1.5,
      fontFamily: 'Inter',
      margins: 2,
      theme: 'light',
      colorTemperature: 0,
      contrast: 1,
      autoTheme: false,

      currentPage: 1,
      sessionPages: [],
      totalPages: 100,
      lastCfi: null,
      viewMode: 'page',
      bookmarks: [],

      activePanel: null,
      studyTab: 'notes',
      isFocusMode: false,
      isBottomBarCollapsed: false,
      bottomBarHeight: 84,
      searchQuery: '',
      searchResults: [],
      activeResultIndex: -1,

      sessionStartTime: Date.now(),
      sessionPageSeconds: {},
      syncStatus: 'idle',

      currentStreak: 0,
      longestStreak: 0,
      dailyGoalProgress: 0,

      // Actions
      setFontSize: (size) => set({ fontSize: size }),
      setLineHeight: (height) => set({ lineHeight: height }),
      setFontFamily: (family) => set({ fontFamily: family }),
      setMargins: (margins) => set({ margins }),
      setTheme: (theme) => set({ theme }),
      setColorTemperature: (temp) => set({ colorTemperature: temp }),
      setContrast: (contrast) => set({ contrast }),
      toggleAutoTheme: () => set((state) => ({ autoTheme: !state.autoTheme })),

      /* Records the page as visited as well as current. `sessionPages` is what
         makes the "quiz me on what I just read" scope possible: the database
         stores currentPage, percentComplete and a daily page COUNT, but never
         which pages — so a session's reading cannot be reconstructed from it
         at all, and it has to be observed live.

         Reader page numbers, not printed ones. The conversion happens at the
         point of use via /books/:id/page-map; keeping both coordinate systems
         out of the store is what stops them being mixed up here. */
      setCurrentPage: (page) =>
        set((state) => {
          if (state.currentPage === page && state.sessionPages.includes(page)) {
            return { currentPage: page };
          }
          const seen = state.sessionPages.includes(page)
            ? state.sessionPages
            : [...state.sessionPages, page];
          return { currentPage: page, sessionPages: seen };
        }),
      setTotalPages: (pages) => set({ totalPages: pages }),
      setLastCfi: (cfi) => set({ lastCfi: cfi }),
      toggleViewMode: () => set((state) => ({
        viewMode: state.viewMode === 'scroll' ? 'page' : 'scroll'
      })),
      toggleBookmark: (page) => set((state) => ({
        bookmarks: state.bookmarks.includes(page)
          ? state.bookmarks.filter(b => b !== page)
          : [...state.bookmarks, page].sort((a, b) => a - b)
      })),

      /* Leaving search always clears the query. It used to be cleared
         only by toggleSearch, so switching straight to another panel
         left a stale query — and with it the highlighted matches that
         HighlightedText draws from it — sitting under the text. */
      openPanel: (panel) => set((state) => ({
        activePanel: panel,
        searchQuery: panel === 'search' ? state.searchQuery : '',
      })),
      togglePanel: (panel) => set((state) => {
        const next = state.activePanel === panel ? null : panel;
        return {
          activePanel: next,
          searchQuery: next === 'search' ? state.searchQuery : '',
        };
      }),
      closePanel: () => set({ activePanel: null, searchQuery: '' }),
      openStudy: (tab) => set((state) => ({
        activePanel: 'study',
        studyTab: tab ?? state.studyTab,
        searchQuery: '',
      })),
      setStudyTab: (tab) => set({ studyTab: tab }),
      toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
      toggleBottomBar: () => set((state) => ({ isBottomBarCollapsed: !state.isBottomBarCollapsed })),
      /* Guarded so a ResizeObserver reporting the same height cannot loop. */
      setBottomBarHeight: (px) => set((state) => (state.bottomBarHeight === px ? {} : { bottomBarHeight: px })),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results, activeResultIndex: results.length > 0 ? 0 : -1 }),
      setActiveResultIndex: (index) => set({ activeResultIndex: index }),

      setSessionStartTime: (time) => set({ sessionStartTime: time }),
      updateSessionPageSeconds: (page, seconds) => set((state) => ({
        sessionPageSeconds: {
          ...state.sessionPageSeconds,
          [page]: (state.sessionPageSeconds[page] || 0) + seconds
        }
      })),
      setSyncStatus: (status) => set({ syncStatus: status }),

      syncToServer: async (bookId: string) => {
        const state = get();
        if (state.syncStatus === 'syncing') return;

        set({ syncStatus: 'syncing' });

        try {
          const syncData = {
            bookId,
            currentPage: state.currentPage,
            lastCfi: state.lastCfi,
            totalPagesRead: 0,
            timeSpentSeconds: Object.values(state.sessionPageSeconds).reduce((a, b) => a + b, 0),
            percentComplete: Math.round((state.currentPage / state.totalPages) * 100),
            dailyProgress: state.sessionPageSeconds,
            bookmarks: state.bookmarks,
            readerSettings: {
              fontSize: state.fontSize,
              lineHeight: state.lineHeight,
              fontFamily: state.fontFamily,
              theme: state.theme,
            }
          };

          const response = await fetch('/api/reader/sync', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(syncData)
          });

          if (response.status === 401) {
            // Not authenticated — silently skip sync, don't disrupt reader
            set({ syncStatus: 'idle' });
            return;
          }

          if (!response.ok) {
            // Non-critical failure — just mark status, don't throw/log error
            set({ syncStatus: 'error' });
            return;
          }

          set({ syncStatus: 'synced' });
          setTimeout(() => {
            const currentStatus = get().syncStatus;
            if (currentStatus === 'synced') set({ syncStatus: 'idle' });
          }, 3000);

        } catch (error) {
          // Use console.warn — console.error triggers Next.js error boundary crash
          console.warn('[Reader Sync] Background sync skipped:', (error as Error)?.message);
          set({ syncStatus: 'error' });
        }
      },

      initFromServer: async (bookId: string) => {
        try {
          const response = await fetch(`/api/reader/sync?bookId=${bookId}`);
          if (!response.ok) return;

          const data = await response.json();
          if (data && (data.currentPage || data.lastCfi)) {
            set((state) => ({
              currentPage: data.currentPage || state.currentPage,
              lastCfi: data.lastCfi || state.lastCfi,
              bookmarks: data.bookmarks || state.bookmarks,
              sessionPageSeconds: typeof data.dailyProgress === 'object' ? data.dailyProgress : state.sessionPageSeconds,
              // Do not overwrite typography preferences by default as they are user-device specific
            }));
          }
        } catch (error) {
          console.warn('[Reader Sync] Initial fetch failed:', (error as Error)?.message);
        }
      },

      fetchStreak: async () => {
        try {
          const response = await fetch('/api/progress/streak', {
            headers: { 'Content-Type': 'application/json' }
          });
          if (response.ok) {
            const data = await response.json();
            const state = get();

            // Calculate mock daily goal progression (capped at 100)
            const minutesReadToday = state.sessionStartTime ? Math.floor((Date.now() - state.sessionStartTime) / 60000) : 0;
            const goalMinutes = data.dailyGoalMinutes || 20;
            const dailyGoalProgress = Math.min(100, (minutesReadToday / goalMinutes) * 100);

            set({
              currentStreak: data.currentStreak,
              longestStreak: data.longestStreak,
              dailyGoalProgress
            });
          }
        } catch (error) {
          console.error("Failed to fetch reader streak", error);
        }
      },

      updateStreak: async (minutesRead: number) => {
        try {
          const response = await fetch('/api/progress/streak', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ minutesRead })
          });

          if (response.ok) {
            const data = await response.json();
            const goalMinutes = data.dailyGoalMinutes || 20;
            const updatedProgress = Math.min(100, (minutesRead / goalMinutes) * 100);

            set({
              currentStreak: data.currentStreak,
              longestStreak: data.longestStreak,
              dailyGoalProgress: updatedProgress
            });
          }
        } catch (error) {
          console.error("Failed to update reader streak", error);
        }
      },

      // Reset to default settings
      resetSettings: () => set({
        fontSize: 16,
        lineHeight: 1.5,
        fontFamily: 'Inter',
        margins: 2,
        theme: 'light',
        colorTemperature: 0,
        contrast: 1,
        autoTheme: false,
      }),
    }),
    {
      name: 'reader-storage', // Name for the localStorage item
      partialize: (state) => ({
        // Only persist these fields in localStorage
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        fontFamily: state.fontFamily,
        margins: state.margins,
        theme: state.theme,
        colorTemperature: state.colorTemperature,
        contrast: state.contrast,
        autoTheme: state.autoTheme,
        bookmarks: state.bookmarks,
        lastCfi: state.lastCfi,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
      }),
    }
  )
); 