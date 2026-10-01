import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Highlighter, FileText, X, BookOpenCheck, Layers, WandSparkles,
  AudioLines, Share2, NotebookPen, Copy, Check, Quote, Wand2,
} from "@/components/ui/icons";
import { useAnnotationStore, AnnotationColor } from "@/store/useAnnotationStore";
import { HIGHLIGHT_SWATCHES, HIGHLIGHT_INK } from "./highlightPalette";

/* ── The selection surface (audit fixes 3, 4, 5, 7) ────────────────────
   This was a desktop popover rendered on phones unchanged: position
   fixed, min-width 280px, translateY(-100%) so it sat *above* the
   selection, and clamped to the viewport exactly once in a mount-time
   useEffect([]) — before the note textarea expanded it, so switching to
   the Note tab could push it back off screen with nothing to correct it.
   On a 390px screen it covered the sentence the student had just
   selected. Its six actions were icon-only with `title` tooltips, which
   a touch device never shows, so on the surface where it mattered most
   the controls were unlabelled.

   Below `md` it is a bottom sheet now: the selected text stays visible
   above it, every action carries a word, and targets are 44–56px. At
   `md` and up the floating popover stays, because a mouse can afford it
   and the text is not in the way.

   The clamp re-runs on resize, on orientation change and whenever the
   sheet's own height changes, rather than once at mount. */

interface AnnotationToolbarProps {
  bookId: string;
  pageNumber: number;
  selectedText: string;
  selectionRange: { startIndex: number; endIndex: number };
  onComplete: () => void;
  onDefine?: (text: string) => void;
  onCreateFlashcard?: (text: string) => void;
  onAskVarta?: (text: string) => void;
  onSaveToSanchika?: (text: string) => void;
  onReadAloud?: (text: string) => void;
  /* New routes the audit's feature table asks for — these three
     capabilities existed but had no path from a text selection. */
  onSimplify?: (text: string) => void;
  onCite?: (text: string) => void;
  position: { x: number; y: number };
  isDarkMode?: boolean;
}

/** True below Tailwind's `md` breakpoint, kept in sync with resize. */
function useIsCompact(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return compact;
}

export function AnnotationToolbar({
  bookId,
  pageNumber,
  selectedText,
  selectionRange,
  onComplete,
  onDefine,
  onCreateFlashcard,
  onAskVarta,
  onSaveToSanchika,
  onReadAloud,
  onSimplify,
  onCite,
  position,
  isDarkMode = false
}: AnnotationToolbarProps) {
  const [activeTab, setActiveTab] = useState<'highlight' | 'note'>('highlight');
  const [color, setColor] = useState<AnnotationColor>('yellow');
  const [noteContent, setNoteContent] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const { addAnnotation } = useAnnotationStore();
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const compact = useIsCompact();

  const wordCount = selectedText.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    /* preventScroll for the same reason as the toolbar root below: focusing
       a field inside a floating surface must never scroll the reader shell
       sideways to "reveal" it. */
    if (activeTab === 'note') noteInputRef.current?.focus({ preventScroll: true });
  }, [activeTab]);

  /* Keep the popover on screen. Only the desktop popover is positioned —
     the compact sheet is pinned to the bottom edge and cannot drift. */
  const clamp = useCallback(() => {
    const el = toolbarRef.current;
    if (!el || compact) return;
    const margin = 10;

    // Reset before measuring, or each run compounds the last one's
    // correction — the old version measured a box it had already moved.
    el.style.left = `${position.x}px`;
    el.style.top = `${position.y}px`;
    el.style.transform = 'translateY(-100%)';

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left;
    if (rect.right > vw - margin) left = vw - rect.width - margin;
    if (left < margin) left = margin;
    el.style.left = `${left}px`;

    /* Flip below the selection when there is no room above it, rather
       than clamping to the top edge and landing on the text. */
    if (rect.top < margin) {
      el.style.top = `${position.y + 24}px`;
      el.style.transform = 'none';
      const after = el.getBoundingClientRect();
      if (after.bottom > vh - margin) {
        el.style.top = `${Math.max(margin, vh - after.height - margin)}px`;
      }
    }
  }, [position.x, position.y, compact]);

  useEffect(() => {
    clamp();
    window.addEventListener('resize', clamp);
    window.addEventListener('orientationchange', clamp);
    /* The box changes height when the note textarea appears. Watching it
       is what makes the clamp hold for the whole life of the toolbar
       instead of only at mount. */
    const el = toolbarRef.current;
    const ro = el && 'ResizeObserver' in window ? new ResizeObserver(clamp) : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.removeEventListener('resize', clamp);
      window.removeEventListener('orientationchange', clamp);
      ro?.disconnect();
    };
  }, [clamp]);

  const handleCreateAnnotation = useCallback(() => {
    if (activeTab === 'highlight' || (activeTab === 'note' && noteContent.trim())) {
      addAnnotation({
        bookId,
        pageNumber,
        type: activeTab,
        color,
        content: activeTab === 'note' ? noteContent : '',
        selectedText,
        position: { startIndex: selectionRange.startIndex, endIndex: selectionRange.endIndex },
        isShared,
      });
      setIsShared(false);
      setNoteContent('');
      onComplete();
    }
  }, [activeTab, noteContent, addAnnotation, bookId, pageNumber, color, selectedText, selectionRange, isShared, onComplete]);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(selectedText).then(() => {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1400);
    }).catch(() => { /* clipboard blocked — the button simply does nothing */ });
  }, [selectedText]);

  /* Audit fix 5. This listener used to be bound to `window` and, in
     highlight mode, created a highlight on a bare Enter — so pressing
     Enter while typing in the dictionary search or the Varta composer
     silently annotated the page behind them.

     It is bound to the toolbar's own element now, and it still ignores
     any event whose target is a text field, because the note textarea
     lives inside this very subtree and Enter there means "new line".
     Escape stays global-ish only in the sense that the toolbar has
     focus; nothing outside it can reach this handler at all. */
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    const isTextEntry = (t: EventTarget | null) =>
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      (t instanceof HTMLElement && t.isContentEditable);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onComplete();
        return;
      }
      if (e.key !== 'Enter') return;
      if (isTextEntry(e.target) && !(e.ctrlKey || e.metaKey)) return;
      if (activeTab === 'highlight' || (activeTab === 'note' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        handleCreateAnnotation();
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleCreateAnnotation, onComplete]);

  /* Take focus so the keyboard handler above can receive anything at
     all, and so a screen reader is moved to the sheet it just opened. */
  useEffect(() => {
    toolbarRef.current?.focus({ preventScroll: true });
  }, []);

  /* Every action that leaves the selection behind. Ordered by how often
     a student reaches for it, not by which subsystem owns it. */
  const actions = [
    onDefine && { key: 'define', label: 'Define', icon: BookOpenCheck, run: () => onDefine(selectedText) },
    onCreateFlashcard && { key: 'flashcard', label: 'Flashcard', icon: Layers, run: () => onCreateFlashcard(selectedText) },
    onAskVarta && { key: 'varta', label: 'Ask Varta', icon: WandSparkles, run: () => onAskVarta(selectedText) },
    onSaveToSanchika && { key: 'sanchika', label: 'Sanchika', icon: NotebookPen, run: () => onSaveToSanchika(selectedText) },
    onReadAloud && { key: 'read', label: 'Read aloud', icon: AudioLines, run: () => onReadAloud(selectedText) },
    { key: 'copy', label: justCopied ? 'Copied' : 'Copy', icon: justCopied ? Check : Copy, run: handleCopy },
    onSimplify && { key: 'simplify', label: 'Simplify', icon: Wand2, run: () => onSimplify(selectedText) },
    onCite && { key: 'cite', label: 'Cite', icon: Quote, run: () => onCite(selectedText) },
  ].filter(Boolean) as { key: string; label: string; icon: typeof Copy; run: () => void }[];

  const surface = isDarkMode
    ? 'bg-[var(--night-ink)]/95 border-[var(--gold)]/20 text-[var(--ivory-cream)]'
    : 'bg-[var(--ivory-cream)]/97 border-[var(--accent-primary)]/30 text-slate-900';

  const colorRow = (
    <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label="Highlight colour">
      {HIGHLIGHT_SWATCHES.map((swatch) => {
        const selected = color === swatch.value;
        return (
          <button
            key={swatch.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={swatch.label}
            onClick={() => setColor(swatch.value)}
            /* 44px on touch, from --hit-min. The swatch itself stays a
               small disc; the padding around it is the target. */
            className={`hit-target grid place-items-center rounded-full transition-transform ${selected ? 'scale-105' : ''}`}
            style={{ minWidth: 'var(--hit-min, 40px)', minHeight: 'var(--hit-min, 40px)' }}
          >
            <span
              className={`block rounded-full border transition-all ${selected ? 'h-7 w-7 ring-2 ring-offset-2' : 'h-6 w-6'}`}
              style={{
                background: isDarkMode ? swatch.dark : swatch.light,
                borderColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)',
                ...(selected
                  ? ({
                      '--tw-ring-color': 'var(--accent-strong)',
                      '--tw-ring-offset-color': isDarkMode ? 'var(--night-ink)' : 'var(--ivory-cream)',
                    } as React.CSSProperties)
                  : {}),
              }}
            />
          </button>
        );
      })}
    </div>
  );

  const noteBox = (
    <Textarea
      ref={noteInputRef}
      placeholder="Write your note here…"
      aria-label="Note text"
      className={`min-h-[96px] resize-none text-sm rounded-xl focus-visible:ring-1 focus-visible:ring-[var(--accent-strong)] ${
        isDarkMode
          ? 'bg-[var(--slate-blue)] border-[var(--gold)]/20 text-[var(--ivory-cream)] placeholder:text-slate-500'
          : 'bg-white/70 border-[var(--accent-primary)]/30 text-slate-900 placeholder:text-slate-500'
      }`}
      value={noteContent}
      onChange={(e) => setNoteContent(e.target.value)}
    />
  );

  const submitRow = (
    <div className="flex gap-2">
      <Button
        className="flex-1 min-h-[48px] rounded-xl font-semibold border-0 bg-[var(--accent-strong)] text-white hover:bg-[var(--accent-contrast)]"
        onClick={handleCreateAnnotation}
        disabled={activeTab === 'note' && !noteContent.trim()}
      >
        {activeTab === 'highlight' ? 'Highlight' : 'Add note'}
      </Button>
      <Button
        variant="outline"
        aria-pressed={isShared}
        /* Was an icon with a `title` — invisible on touch, so nobody
           could tell what the button did, let alone that it was a
           toggle. It says what it is now. */
        aria-label={isShared ? 'Shared with class — tap to keep private' : 'Keep private — tap to share with class'}
        className={`min-h-[48px] px-3 rounded-xl gap-1.5 ${
          isShared
            ? 'bg-[var(--accent-soft)] border-[var(--accent-strong)] text-[var(--accent-contrast)]'
            : 'border-[var(--accent-primary)]/30'
        }`}
        onClick={() => setIsShared(!isShared)}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-semibold">{isShared ? 'Shared' : 'Share'}</span>
      </Button>
    </div>
  );

  const tabRow = (
    <div className="flex items-center gap-1" role="tablist" aria-label="Annotation type">
      {([
        { id: 'highlight' as const, label: 'Highlight', icon: Highlighter },
        { id: 'note' as const, label: 'Note', icon: FileText },
      ]).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="tab"
          aria-selected={activeTab === id}
          onClick={() => setActiveTab(id)}
          className={`hit-target flex items-center gap-1.5 px-3 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === id
              ? 'bg-[var(--accent-strong)] text-white'
              : isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );

  const actionGrid = (
    <div className={compact ? 'grid grid-cols-4 gap-1' : 'flex flex-wrap items-center gap-1'}>
      {actions.map(({ key, label, icon: Icon, run }) => (
        <button
          key={key}
          type="button"
          onClick={run}
          /* Labelled, not `title`-d. A touch device never shows a title
             tooltip, which is what made the old six icons unreadable on
             the surface they mattered most. */
          className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 min-h-[56px] transition-colors ${
            isDarkMode ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-[var(--accent-soft)]'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="text-[0.75rem] font-medium leading-none text-center">{label}</span>
        </button>
      ))}
    </div>
  );

  /* ── Compact: a bottom sheet ──────────────────────────────────────
     Anchored to the bottom edge, so it cannot cover the sentence that
     was selected, and it shows that sentence back so the student can
     see what they are about to act on. */
  if (compact) {
    return (
      <div
        ref={toolbarRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Selection actions"
        className={`fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl border-t backdrop-blur-md annotation-toolbar safe-bottom outline-none ${surface}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Selected · {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </p>
            <p
              className="text-sm mt-0.5 line-clamp-2 rounded px-1 -mx-1"
              style={{
                background: color ? (isDarkMode
                  ? HIGHLIGHT_SWATCHES.find(s => s.value === color)?.dark
                  : HIGHLIGHT_SWATCHES.find(s => s.value === color)?.light) : undefined,
                color: isDarkMode ? HIGHLIGHT_INK.dark : HIGHLIGHT_INK.light,
              }}
            >
              {selectedText}
            </p>
          </div>
          <button
            onClick={onComplete}
            aria-label="Dismiss selection actions"
            className="hit-target grid place-items-center rounded-full shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 py-3 space-y-3">
          {actionGrid}
          <div className="h-px bg-current opacity-10" />
          {tabRow}
          {activeTab === 'highlight' ? colorRow : noteBox}
          {submitRow}
        </div>
      </div>
    );
  }

  /* ── Desktop: the floating popover ────────────────────────────── */
  return (
    <div
      ref={toolbarRef}
      tabIndex={-1}
      role="dialog"
      aria-label="Selection actions"
      className={`fixed z-50 rounded-2xl border p-3 flex flex-col gap-3 annotation-toolbar backdrop-blur-md shadow-2xl outline-none ${surface}`}
      style={{ left: `${position.x}px`, top: `${position.y}px`, transform: 'translateY(-100%)', minWidth: '320px', maxWidth: 'min(28rem, calc(100vw - 20px))' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        {tabRow}
        <button onClick={onComplete} aria-label="Dismiss selection actions" className="hit-target grid place-items-center rounded-full">
          <X className="h-4 w-4" />
        </button>
      </div>

      {actionGrid}

      <div className="flex flex-col gap-3">
        {activeTab === 'highlight' ? colorRow : noteBox}
        {submitRow}
      </div>
    </div>
  );
}
