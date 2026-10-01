import { useEffect, useRef } from 'react';
import { List, Highlighter, NotebookPen, WandSparkles, Headphones, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { useReaderStore } from '@/store/useReaderStore';

/* ── One owner for the thumb zone (audit fix 2) ────────────────────────
   The bottom of a phone screen used to be triple-booked: a FAB at
   bottom:1rem/right:1rem, a floating stats strip edge-to-edge at
   bottom:5rem, a settings sheet rising to 70vh, a floating TTS pill and
   a fixed reader footer under all of it. Four layers competing for one
   thumb, and no env(safe-area-inset-bottom) anywhere, so on an iPhone
   the lowest of them sat under the home indicator.

   This bar is the only thing that lives there now. Everything else
   either moved into it, moved into the header, or moved into a sheet
   that pushes the bar rather than covering it.

   The progress line above the actions replaces the floating stats: the
   audit's point was that three progress indicators answered no question,
   so this states the two facts a student actually wants — where am I,
   and how much is left — in words. Tapping it opens the full stats. */

interface ReaderBottomBarProps {
  /** 1-based. */
  currentPage: number;
  totalPages: number;
  minutesLeft: number;
  percentComplete: number;
  isDarkMode?: boolean;
  /** True while text-to-speech is running, so Listen becomes Stop. */
  isListening?: boolean;
  onListen: () => void;
  /* PDF has a drawing rail that collapses to its own "Annotate" pill,
     centred at the bottom. When true, the collapsed bar pill docks just
     right of centre so the two minimised pills sit side by side rather
     than the bar pill stacking under the Annotate one. Off (EPUB) the bar
     pill stays centred. */
  pairWithAnnotate?: boolean;
}

export function ReaderBottomBar({
  currentPage,
  totalPages,
  minutesLeft,
  percentComplete,
  isDarkMode = false,
  isListening = false,
  onListen,
  pairWithAnnotate = false,
}: ReaderBottomBarProps) {
  const activePanel = useReaderStore((s) => s.activePanel);
  const togglePanel = useReaderStore((s) => s.togglePanel);
  const openStudy = useReaderStore((s) => s.openStudy);
  const closePanel = useReaderStore((s) => s.closePanel);
  const studyTab = useReaderStore((s) => s.studyTab);

  /* ── The three study entries toggle, like Contents ─────────────────────
     Each of these buttons reports `aria-pressed`, which promises a control
     that can be pressed AND released. `openStudy` only ever opens, so a
     student who tapped the highlighted "Sanchika" got nothing back and a
     screen reader announced "pressed" with no way to unpress from that
     control — only Contents, on `togglePanel`, actually toggled.

     The toggle lives HERE and not in `openStudy` on purpose. "Ask Varta"
     from a text selection, `?tab=` deep links and "Save to Sanchika" all
     call `openStudy` and must open the drawer whether or not it is already
     showing that section; a store-level toggle would make each of them
     close the very panel they were asked to open. The bar is a toggle
     control, those are commands, and only the bar's own call site knows
     which it is. */
  const studyOpen = activePanel === 'study';
  /* Each entry stays lit while the student is inside any tab of the
     section it opens — Notes owns Vocabulary, Graph and Digest; Varta
     owns Quiz. The grouping is StudyDrawer's SECTION_OF; kept as literals
     here rather than imported so the bar does not depend on the drawer. */
  const notesActive =
    studyOpen &&
    (studyTab === 'notes' || studyTab === 'vocab' || studyTab === 'graph' || studyTab === 'digest');
  const sanchikaActive = studyOpen && studyTab === 'sanchika';
  const vartaActive = studyOpen && (studyTab === 'varta' || studyTab === 'quiz');

  const toggleStudy = (tab: 'notes' | 'sanchika' | 'varta', isActive: boolean) =>
    isActive ? closePanel() : openStudy(tab);

  /* Collapsible, the same way the drawing rail collapses to an "Annotate"
     pill (DrawingToolbar.tsx). The bar is primary navigation, so it starts
     expanded — but a student who wants the whole screen for the page can
     tuck it down to a single pill and bring it back with one tap. The flag
     lives in the reader store, not here, so the reading area can reclaim
     the space the bar used to reserve and the drawing rail can dock its
     pill beside this one. */
  const collapsed = useReaderStore((s) => s.isBottomBarCollapsed);
  const toggleBottomBar = useReaderStore((s) => s.toggleBottomBar);
  const setBottomBarHeight = useReaderStore((s) => s.setBottomBarHeight);

  /* ── Publish the bar's real height ────────────────────────────────────
     The reading area and the Study drawer used to reserve a hardcoded 84px
     for this bar. The bar is not 84px tall: `safe-bottom` adds
     max(0.5rem, env(safe-area-inset-bottom)), which is ~34px on a phone
     with a home indicator and 8px on a tablet, and the two text rows wrap
     differently by width. So the reservation was too small on some devices
     (bar overlapping the page) and too big on others — the blank strip
     under the page — and it changed mid-session on mobile as the browser's
     dynamic toolbar showed and hid.

     The bar measures itself and publishes the result, so every consumer
     reserves exactly what is there. Collapsed publishes 0: the pill floats
     over the page rather than reserving a band. */
  const barRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (collapsed) {
      /* The pill floats over the page rather than reserving a band. */
      setBottomBarHeight(0);
      return;
    }
    const el = barRef.current;
    if (!el) return;
    const apply = () => setBottomBarHeight(Math.round(el.getBoundingClientRect().height));
    apply();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    /* Mobile browsers resize the viewport when their toolbar hides, which
       changes the safe-area inset — the reason this drifted mid-session. */
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, [collapsed, setBottomBarHeight]);

  /* Focus mode unmounts the bar entirely — release the reservation so the
     page is not left holding a band for something that is gone. */
  useEffect(() => () => { useReaderStore.getState().setBottomBarHeight(0); }, []);

  const actions = [
    {
      key: 'contents',
      label: 'Contents',
      icon: List,
      active: activePanel === 'toc',
      onClick: () => togglePanel('toc'),
    },
    {
      key: 'notes',
      label: 'Notes',
      icon: Highlighter,
      active: notesActive,
      onClick: () => toggleStudy('notes', notesActive),
    },
    {
      key: 'sanchika',
      label: 'Sanchika',
      icon: NotebookPen,
      active: sanchikaActive,
      onClick: () => toggleStudy('sanchika', sanchikaActive),
    },
    {
      /* Varta is the conversation with the book — the chat plus Quiz,
         which is the same conversation asking rather than answering.
         Graph and Digest moved to Notes: neither is a conversation, and
         both are things you look up beside your own notes. */
      key: 'varta',
      label: 'Varta',
      icon: WandSparkles,
      active: vartaActive,
      onClick: () => toggleStudy('varta', vartaActive),
    },
    {
      key: 'listen',
      label: isListening ? 'Stop' : 'Listen',
      icon: isListening ? Square : Headphones,
      active: isListening,
      onClick: onListen,
    },
  ];

  /* ── Collapsed: a single unobtrusive pill, clear of the page ──
     Mirrors the drawing rail's "Annotate" pill. Shows where the student
     is and expands the full bar on tap. */
  if (collapsed) {
    /* Sits on the same bottom-5 baseline as the drawing rail's Annotate
       pill. On a PDF the two are docked either side of centre (Annotate
       left, this right) so they read as one pair; on an EPUB there is no
       Annotate pill, so this one centres itself. */
    const dock = pairWithAnnotate
      ? 'left-1/2 ml-1'
      : 'left-1/2 -translate-x-1/2';
    return (
      <button
        type="button"
        ref={(n) => { barRef.current = n; }}
        onClick={toggleBottomBar}
        aria-label={`Show reader toolbar. Page ${currentPage} of ${totalPages}, about ${minutesLeft} minutes left.`}
        className={[
          'absolute bottom-5 z-[46]', dock,
          'flex items-center gap-2 pl-3.5 pr-4 py-2 rounded-full',
          'border backdrop-blur-md shadow-[0_8px_28px_-8px_rgba(0,0,0,0.18)] transition-colors',
          isDarkMode
            ? 'bg-[var(--night-ink)]/90 border-[var(--gold)]/15 text-slate-200 hover:text-[var(--accent-primary-dark)]'
            : 'bg-white/90 border-[var(--accent-primary)]/25 text-slate-600 hover:text-[var(--accent-strong)]',
        ].join(' ')}
      >
        <ChevronUp className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-semibold">
          Page {currentPage} / {totalPages}
        </span>
      </button>
    );
  }

  return (
    <nav
      ref={(n) => { barRef.current = n; }}
      aria-label="Reader actions"
      className={[
        'absolute bottom-0 left-0 right-0 z-[45] safe-bottom',
        'border-t backdrop-blur-md',
        isDarkMode
          ? 'bg-[var(--night-ink)]/95 border-[var(--gold)]/12 text-slate-200'
          : 'bg-white/95 border-[var(--accent-primary)]/20 text-slate-700',
      ].join(' ')}
    >
      {/* Progress line — full-width, decorative to AT (the button below
          carries the sentence). Pulled out of the button so the collapse
          handle can sit beside the progress text without nesting buttons. */}
      <div className="h-0.5 w-full bg-[var(--accent-primary)]/15 dark:bg-[var(--gold)]/10">
        <div
          className="h-full bg-[var(--accent-strong)] dark:bg-[var(--accent-primary-dark)] transition-[width] duration-500"
          style={{ width: `${percentComplete}%` }}
        />
      </div>

      <div className="flex items-stretch">
        {/* Progress, in words. */}
        <button
          type="button"
          onClick={() => togglePanel('progress')}
          aria-label={`Page ${currentPage} of ${totalPages}, about ${minutesLeft} minutes left in this book. Open reading stats.`}
          className="flex-1 block group"
        >
          <div
            aria-hidden="true"
            className="flex items-center justify-center gap-2 px-3 pt-1.5 pb-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-[var(--accent-strong)] dark:group-hover:text-[var(--accent-primary-dark)]"
          >
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Page {currentPage} of {totalPages}
            </span>
            <span className="opacity-50">·</span>
            <span>{minutesLeft} min left</span>
          </div>
        </button>

        {/* Collapse handle — tuck the bar down to a pill so the page gets
            the full screen. */}
        <button
          type="button"
          onClick={toggleBottomBar}
          aria-label="Hide reader toolbar"
          className="shrink-0 grid place-items-center px-3 text-slate-500 dark:text-slate-400 hover:text-[var(--accent-strong)] dark:hover:text-[var(--accent-primary-dark)] transition-colors"
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-stretch justify-around px-1 pb-1">
        {actions.map(({ key, label, icon: Icon, active, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            aria-pressed={active}
            /* 52px tall and labelled. The old FAB's four actions are
               these four, so it is gone rather than duplicated here. */
            className={[
              'flex-1 flex flex-col items-center justify-center gap-0.5',
              'min-h-[52px] rounded-xl px-1 transition-colors',
              active
                ? 'text-[var(--accent-strong)] dark:text-[var(--accent-primary-dark)] bg-[var(--accent-soft)] dark:bg-[var(--gold)]/10'
                : 'text-slate-600 dark:text-slate-400',
            ].join(' ')}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {/* 12px is the floor set in styles/ux-foundation.css — the
                old floating stat labels were 10px uppercase at 0.7
                opacity, which is the pattern this replaces. */}
            <span className="text-[0.75rem] font-semibold leading-none">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
