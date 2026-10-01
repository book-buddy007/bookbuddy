import { useEffect, useRef, useState } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { Icon, type BBIconName } from '@/components/ui/icon';
import { useReaderStore } from '@/store/useReaderStore';
import { cn } from '@/lib/utils';

/* ── One owner for the thumb zone (audit fix 2) ────────────────────────
   The bottom of the reader is this component and nothing else. It has three
   layouts, switched by CSS breakpoint so the measured height is always right:

   - Phone (< md): progress line, "Page x of y · n min left", and five labelled
     actions (Contents, Notes, Sanchika, Varta, Listen).
   - Tablet (md – xl): a floating pill toolbar (Contents, Display, Notes,
     Sanchika, Varta, Listen) above a page scrubber strip.
   - Desktop (xl+): one strip — page x of y, scrubber, time left — plus icon
     buttons for Notes, Sanchika and Listen. Contents is the permanent rail and
     Display / Varta live in the top bar at this width.

   Colours come from the reader theme (--rd-*), so the bar follows Paper / Sepia / Night. */

interface ReaderBottomBarProps {
  /** 1-based. */
  currentPage: number;
  totalPages: number;
  minutesLeft: number;
  percentComplete: number;
  /** True while text-to-speech is running, so Listen becomes Stop. */
  isListening?: boolean;
  onListen: () => void;
  /** Jump to a page (1-based) from the scrubber. Omit to show progress only. */
  onSeek?: (page: number) => void;
  /** Label for the unit being counted ("Page", or "Location" for reflowable EPUBs). */
  unit?: string;
  /* PDF has a drawing rail that collapses to its own "Annotate" pill, centred
     at the bottom. When true, the collapsed bar pill docks just right of
     centre so the two minimised pills sit side by side. */
  pairWithAnnotate?: boolean;
  /** Kept for call-site compatibility; colours now come from the reader theme. */
  isDarkMode?: boolean;
}

type Action = { key: string; label: string; icon: BBIconName; active: boolean; onClick: () => void };

const panelBg = 'bg-[color-mix(in_srgb,var(--rd-panel)_94%,transparent)]';

export function ReaderBottomBar({
  currentPage,
  totalPages,
  minutesLeft,
  percentComplete,
  isListening = false,
  onListen,
  onSeek,
  unit = 'Page',
  pairWithAnnotate = false,
}: ReaderBottomBarProps) {
  const activePanel = useReaderStore((s) => s.activePanel);
  const togglePanel = useReaderStore((s) => s.togglePanel);
  const openStudy = useReaderStore((s) => s.openStudy);
  const closePanel = useReaderStore((s) => s.closePanel);
  const studyTab = useReaderStore((s) => s.studyTab);

  /* The study entries toggle (they report aria-pressed). The toggle lives here,
     not in `openStudy`: "Ask Varta" from a selection, `?tab=` links and "Save to
     Sanchika" are commands that must always open, while the bar is a toggle. */
  const studyOpen = activePanel === 'study';
  // Each entry stays lit inside any tab of its section (StudyDrawer's SECTION_OF).
  const notesActive =
    studyOpen && (studyTab === 'notes' || studyTab === 'vocab' || studyTab === 'graph' || studyTab === 'digest');
  const sanchikaActive = studyOpen && studyTab === 'sanchika';
  const vartaActive = studyOpen && (studyTab === 'varta' || studyTab === 'quiz');
  const toggleStudy = (tab: 'notes' | 'sanchika' | 'varta', isActive: boolean) => (isActive ? closePanel() : openStudy(tab));

  const collapsed = useReaderStore((s) => s.isBottomBarCollapsed);
  const toggleBottomBar = useReaderStore((s) => s.toggleBottomBar);
  const setBottomBarHeight = useReaderStore((s) => s.setBottomBarHeight);

  /* ── Publish the bar's real height ──
     The reading area and Study drawer reserve exactly what the bar measures:
     it varies with the safe-area inset, the breakpoint layout and the mobile
     browser toolbar. Collapsed publishes 0 — the pill floats over the page. */
  const barRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (collapsed) {
      setBottomBarHeight(0);
      return;
    }
    const el = barRef.current;
    if (!el) return;
    const apply = () => setBottomBarHeight(Math.round(el.getBoundingClientRect().height));
    apply();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, [collapsed, setBottomBarHeight]);

  // Focus mode unmounts the bar: release the reservation.
  useEffect(() => () => { useReaderStore.getState().setBottomBarHeight(0); }, []);

  // Scrubber shows the page under the thumb while dragging, and seeks on release.
  const [scrub, setScrub] = useState<number | null>(null);
  const total = Math.max(0, totalPages);
  const shownPage = Math.min(Math.max(1, scrub ?? currentPage), Math.max(1, total));
  const canSeek = !!onSeek && total > 1;
  const pct = Math.min(100, Math.max(0, percentComplete));
  const where = total > 0 ? `${unit} ${shownPage} of ${total}` : `${unit} ${shownPage}`;
  const left = total > 0 && Number.isFinite(minutesLeft) ? `${Math.max(0, minutesLeft)} min left` : null;

  const contents: Action = { key: 'contents', label: 'Contents', icon: 'contents', active: activePanel === 'toc', onClick: () => togglePanel('toc') };
  const display: Action = { key: 'display', label: 'Display', icon: 'theme', active: activePanel === 'settings', onClick: () => togglePanel('settings') };
  const notes: Action = { key: 'notes', label: 'Notes', icon: 'highlight', active: notesActive, onClick: () => toggleStudy('notes', notesActive) };
  const sanchika: Action = { key: 'sanchika', label: 'Sanchika', icon: 'sanchika', active: sanchikaActive, onClick: () => toggleStudy('sanchika', sanchikaActive) };
  const varta: Action = { key: 'varta', label: 'Varta', icon: 'varta', active: vartaActive, onClick: () => toggleStudy('varta', vartaActive) };
  const listen: Action = { key: 'listen', label: isListening ? 'Stop' : 'Listen', icon: isListening ? 'square' : 'audiobook', active: isListening, onClick: onListen };

  /* ── Collapsed: a single pill, clear of the page ── */
  if (collapsed) {
    const dock = pairWithAnnotate ? 'left-1/2 ml-1' : 'left-1/2 -translate-x-1/2';
    return (
      <button
        type="button"
        ref={(n) => { barRef.current = n; }}
        onClick={toggleBottomBar}
        aria-label={`Show reader toolbar. ${where}${left ? `, about ${left}` : ''}.`}
        className={cn(
          'absolute bottom-5 z-[46] flex items-center gap-2 rounded-full border border-[color:var(--rd-border)] py-2 pl-3.5 pr-4 text-[color:var(--rd-ink)] shadow-e2 backdrop-blur-md transition-colors hover:text-bb-accent-ink focus-visible:outline-none focus-visible:shadow-focus',
          panelBg,
          dock,
        )}
      >
        <Icon name="chevron-up" size={16} fillLayer={false} />
        <span className="text-xs font-semibold">{where}</span>
      </button>
    );
  }

  const scrubber = (
    <SliderPrimitive.Root
      min={1}
      max={Math.max(2, total)}
      step={1}
      value={[shownPage]}
      disabled={!canSeek}
      onValueChange={([v]) => setScrub(v)}
      onValueCommit={([v]) => { setScrub(null); onSeek?.(v); }}
      aria-label={`Go to ${unit.toLowerCase()}`}
      className="group relative flex h-8 min-w-0 flex-1 touch-none select-none items-center data-[disabled]:opacity-60"
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[color:var(--rd-track)]">
        {canSeek ? (
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-bb-progress" />
        ) : (
          <span className="absolute inset-y-0 left-0 rounded-full bg-bb-progress" style={{ width: `${pct}%` }} />
        )}
      </SliderPrimitive.Track>
      {canSeek && (
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-white bg-bb-accent shadow-e1 transition-transform duration-bb-micro hover:scale-110 focus-visible:outline-none focus-visible:shadow-focus" />
      )}
    </SliderPrimitive.Root>
  );

  const collapseBtn = (
    <button
      type="button"
      onClick={toggleBottomBar}
      aria-label="Hide reader toolbar"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[color:var(--rd-sub)] transition-colors hover:bg-[color:var(--rd-track)] hover:text-[color:var(--rd-ink)] focus-visible:outline-none focus-visible:shadow-focus"
    >
      <Icon name="chevron-down" size={18} fillLayer={false} />
    </button>
  );

  const statsBtn = (className?: string) => (
    <button
      type="button"
      onClick={() => togglePanel('progress')}
      aria-label={`${where}${left ? `, about ${left}` : ''}. Open reading stats.`}
      className={cn('shrink-0 rounded-lg text-left focus-visible:outline-none focus-visible:shadow-focus', className)}
    >
      <span aria-hidden className="text-sm font-semibold tabular-nums text-[color:var(--rd-ink)]">{where}</span>
    </button>
  );

  return (
    <nav
      ref={(n) => { barRef.current = n; }}
      aria-label="Reader actions"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[45] flex flex-col items-center"
    >
      {/* Tablet: floating pill toolbar above the scrubber strip */}
      <div className={cn('pointer-events-auto mb-3 hidden items-center gap-0.5 rounded-full border border-[color:var(--rd-border)] p-1.5 shadow-e2 backdrop-blur-md md:flex xl:hidden', panelBg)}>
        {[contents, display, notes, sanchika, varta, listen].map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={a.onClick}
            aria-pressed={a.active}
            className={cn(
              'flex h-12 min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-full px-3 text-[11px] font-semibold transition-colors duration-bb-micro focus-visible:outline-none focus-visible:shadow-focus',
              a.active ? 'bg-bb-accent-soft text-bb-accent-ink' : 'text-[color:var(--rd-sub)] hover:bg-[color:var(--rd-track)] hover:text-[color:var(--rd-ink)]',
            )}
          >
            <Icon name={a.icon} size={18} />
            {a.label}
          </button>
        ))}
      </div>

      <div className={cn('pointer-events-auto w-full border-t border-[color:var(--rd-border)] text-[color:var(--rd-ink)] backdrop-blur-md safe-bottom', panelBg)}>
        {/* Phone */}
        <div className="md:hidden">
          <div className="h-0.5 w-full bg-[color:var(--rd-track)]">
            <div className="h-full bg-bb-progress transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => togglePanel('progress')}
              aria-label={`${where}${left ? `, about ${left} in this book` : ''}. Open reading stats.`}
              className="flex flex-1 items-center justify-center gap-2 px-3 pb-0.5 pt-1.5 text-xs font-medium text-[color:var(--rd-sub)] focus-visible:outline-none"
            >
              <span aria-hidden className="font-semibold text-[color:var(--rd-ink)]">{where}</span>
              {left && <><span aria-hidden className="opacity-50">·</span><span aria-hidden>{left}</span></>}
            </button>
            <button
              type="button"
              onClick={toggleBottomBar}
              aria-label="Hide reader toolbar"
              className="grid shrink-0 place-items-center px-3 text-[color:var(--rd-sub)] hover:text-[color:var(--rd-ink)]"
            >
              <Icon name="chevron-down" size={16} fillLayer={false} />
            </button>
          </div>
          <div className="flex items-stretch justify-around px-1 pb-1">
            {[contents, notes, sanchika, varta, listen].map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={a.onClick}
                aria-pressed={a.active}
                className={cn(
                  'flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors',
                  a.active ? 'bg-bb-accent-soft text-bb-accent-ink' : 'text-[color:var(--rd-sub)]',
                )}
              >
                <Icon name={a.icon} size={20} />
                <span className="text-[0.75rem] font-semibold leading-none">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tablet + desktop strip */}
        <div className="hidden h-14 items-center gap-4 px-5 md:flex">
          {statsBtn()}
          {scrubber}
          {left && <span className="shrink-0 text-sm text-[color:var(--rd-sub)]">{left}</span>}
          <div className="hidden items-center gap-1 border-l border-[color:var(--rd-border)] pl-3 xl:flex">
            {[notes, sanchika, listen].map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={a.onClick}
                aria-pressed={a.active}
                aria-label={a.label}
                title={a.label}
                className={cn(
                  'grid h-10 w-10 place-items-center rounded-full transition-colors duration-bb-micro focus-visible:outline-none focus-visible:shadow-focus',
                  a.active ? 'bg-bb-accent-soft text-bb-accent-ink' : 'text-[color:var(--rd-sub)] hover:bg-[color:var(--rd-track)] hover:text-[color:var(--rd-ink)]',
                )}
              >
                <Icon name={a.icon} size={20} />
              </button>
            ))}
          </div>
          {collapseBtn}
        </div>
      </div>
    </nav>
  );
}
