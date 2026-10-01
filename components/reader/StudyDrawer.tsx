import { useEffect, useRef } from 'react';
import { X, Highlighter, Languages, WandSparkles, HelpCircle, Network, AudioLines } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { useReaderStore, type StudyTab } from '@/store/useReaderStore';
import { AnnotationSidebar } from './AnnotationSidebar';
import { VartaSidebar } from './VartaSidebar';
import { SanchikaSidebar } from './SanchikaSidebar';
import { GraphSidebar } from './GraphSidebar';
import { RecapContent } from './DigestSidebar';
import { ChapterQuizContent } from './QuizSidebar';

/* ── The Study drawer (audit fix 1) ────────────────────────────────────
   Five study surfaces used to be five separate overlays: the annotation
   sidebar at z-40, the graph at z-42, Sanchika at z-45, Varta at z-50
   sliding in from the *opposite* edge to all of them, and the quiz and
   digest reachable only from inside Varta. Each had its own width, its
   own header, its own close button, and no idea the others existed.

   They are one drawer with five tabs now. The drawer owns the position,
   the header and the close button; each tab renders its existing panel
   in `embedded` mode, which is the same component with its chrome
   suppressed rather than a reimplementation — see panelShell.ts.

   Which tab is showing lives in the reader store, not here, because
   "Ask Varta" from a text selection has to be able to name a
   destination tab without knowing that a drawer is what will open. */

/* ── Three destinations, not one drawer with six tabs ──────────────────
   Every entry point used to land in the same six-tab drawer, so tapping
   "Sanchika" in the bottom bar opened a drawer whose tab row offered
   Sanchika again, and the Notes tab stacked a second tab row (its own
   Notes/Vocabulary + Current Page/All Pages) under the first.

   The bottom bar's three study buttons own three separate surfaces:

     Notes     — what the student accumulates about the book: their own
                 annotations and vocabulary, plus Graph and Digest, which
                 are the book's own reference material (who/what/where it
                 talks about, and a chapter recap). Graph and Digest lived
                 under Varta while the only thing they had in common with
                 it was the ingestion pipeline that produces them — which
                 is an implementation detail, not something a student
                 navigates by. Neither is a conversation; both are
                 look-things-up surfaces, like the notes beside them.
     Sanchika  — the notebook. No tab row.
     Varta     — the conversation with the book, and Quiz, which is that
                 conversation asking the questions instead of answering
                 them.

   Vocabulary is hoisted OUT of AnnotationSidebar into this row rather
   than left as a tab inside it. Left where it was, the Notes destination
   would read: a row saying Notes/Graph/Digest, then a row saying
   Notes/Vocabulary, then Current Page/All Pages — three rows deep with
   the word "Notes" in two of them, which is the exact duplication this
   drawer exists to remove. Hoisted, every section is at most one row of
   tabs plus that tab's own scope row.

   The section is DERIVED from studyTab rather than stored beside it, so
   there is no second field that can disagree with the first — the same
   reason activePanel is a single enum. */
type StudySection = 'notes' | 'sanchika' | 'varta';

interface StudyTabDef {
  id: StudyTab;
  label: string;
  icon: typeof Highlighter;
  /* Notes and Vocabulary are two tabs over ONE mounted AnnotationSidebar
     — mounting it twice would mean two annotation lists and a doubled
     vocabulary fetch — so they point their aria-controls at the same
     panel. Defaults to the tab's own id. */
  panelId?: StudyTab;
}

const SECTION_TABS: Record<StudySection, StudyTabDef[]> = {
  notes: [
    { id: 'notes',  label: 'Notes',      icon: Highlighter },
    { id: 'vocab',  label: 'Vocabulary', icon: Languages, panelId: 'notes' },
    { id: 'graph',  label: 'Graph',      icon: Network },
    { id: 'digest', label: 'Digest',     icon: AudioLines },
  ],
  sanchika: [],
  varta: [
    { id: 'varta', label: 'Varta', icon: WandSparkles },
    { id: 'quiz',  label: 'Quiz',  icon: HelpCircle },
  ],
};

/* A total map, not a function with a fallback. The `if (...) return tab;
   return 'varta'` version silently filed any new StudyTab under Varta —
   adding 'vocab' to the union would have compiled and quietly shipped
   Vocabulary as a Varta tool. This fails the build instead. */
const SECTION_OF: Record<StudyTab, StudySection> = {
  notes: 'notes',
  vocab: 'notes',
  graph: 'notes',
  digest: 'notes',
  sanchika: 'sanchika',
  varta: 'varta',
  quiz: 'varta',
};

const SECTION_LABEL: Record<StudySection, string> = {
  notes: 'Notes',
  sanchika: 'Sanchika',
  varta: 'Varta',
};

interface StudyDrawerProps {
  bookId: string;
  currentPage: number;
  isDarkMode?: boolean;
  /** Prefilled question when the drawer was opened from a selection. */
  initialQuery?: string;
  onQueryCleared?: () => void;
}

export function StudyDrawer({
  bookId,
  currentPage,
  isDarkMode = false,
  initialQuery = '',
  onQueryCleared,
}: StudyDrawerProps) {
  const activePanel = useReaderStore((s) => s.activePanel);
  const studyTab = useReaderStore((s) => s.studyTab);
  const setStudyTab = useReaderStore((s) => s.setStudyTab);
  const closePanel = useReaderStore((s) => s.closePanel);
  /* bottomBarHeight is no longer read here: the drawer runs the full height of
     the reader and covers the bar rather than reserving space above it. The
     store still publishes it for anything else that needs to clear the bar. */

  const isOpen = activePanel === 'study';
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* The header names the destination the student chose in the bottom bar,
     not the sub-tool inside it — opening Sanchika and reading "Study" made
     the two feel like different surfaces. Inside Varta the tab row already
     says which tool is showing, so the header stays "Varta". */
  const section = SECTION_OF[studyTab];
  const activeLabel = SECTION_LABEL[section];
  const sectionTabs = SECTION_TABS[section];

  /* Escape closes the drawer. Scoped to the drawer's own subtree rather
     than bound on window: a bare window listener is what made a stray
     Enter create a highlight while the student was typing in the
     dictionary search (audit fix 5), and the same shape of bug applies
     here. Nothing outside the drawer can trigger this. */
  useEffect(() => {
    if (!isOpen) return;
    const node = panelRef.current;
    if (!node) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closePanel();
      }
    };
    node.addEventListener('keydown', onKeyDown);
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closePanel]);

  /* Move focus into the drawer when it opens, so a keyboard or screen
     reader user is actually taken there instead of being left behind on
     the button that opened it.

     `preventScroll` is load-bearing, not a nicety. The closed panels are
     parked off the right edge by their transform, so the reader root has
     ~420px of overflow it cannot show (overflow-x is hidden). A bare
     .focus() lands on this button while the drawer is still mid-slide —
     the button is still physically off-screen — so the browser scrolls the
     root sideways to reveal it. Because the overflow is hidden, nothing can
     scroll it back: the whole reader stays shifted left with a blank band
     on the right, the header's last control clipped, and panel content
     pushed out of view (which reads as an empty panel). It only reproduced
     sometimes because it is a race against the 300ms transform. */
  useEffect(() => {
    if (isOpen) closeRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={`${activeLabel} — study tools`}
      aria-hidden={!isOpen}
      /* The drawer keeps rendering while closed so its tabs' fetched
         state survives — a conversation, an entity list, a quiz in
         progress. But it is only translated off-screen, not removed, so
         without `inert` the Tab key still walks into it and focus
         disappears off the side of the viewport. React 19 passes this
         through as a real attribute. */
      inert={!isOpen}
      className={[
        /* Full height, deliberately covering the header and the bottom bar.
           The drawer owns a close button, so nothing behind it needs to stay
           reachable — and on a phone this is the difference between a chat
           squeezed into a strip and one that reads like a conversation.
           `pb-[env(safe-area-inset-bottom)]` keeps the last row clear of the
           home indicator now that the bottom bar is no longer doing it.

           The z-index is the load-bearing part. This previously slotted
           BETWEEN the header and the bottom bar because an earlier full-height
           attempt sat at z-40 — below the bar's z-[45] and the dock's z-[46] —
           so the drawer covered the header while the bar punched through the
           bottom of it. That overlap is what produced the "two panes stacked"
           look, not the height. Sitting above both fixes the cause; the
           dictionary modal at z-50 still wins, which is correct since it opens
           from inside here. */
        'absolute inset-y-0 right-0 z-[47] flex flex-col overflow-hidden',
        'pb-[env(safe-area-inset-bottom)]',
        /* One width scale shared with the TOC/Settings drawers (page.tsx):
           full-bleed on phone, a mid drawer on tablet, wider on desktop,
           with the desktop step at lg (1024) so all three panels change
           together rather than each at its own breakpoint. */
        'w-full sm:w-96 lg:w-[420px]',
        'border-l border-[color:var(--rd-border)] text-[color:var(--rd-ink)]',
        'bg-[color:var(--rd-panel)] shadow-e2',
        'transition-transform duration-300',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--rd-border)] px-4 py-3">
        <h2 className="font-display text-lg font-extrabold tracking-[-0.02em]">
          {activeLabel}
        </h2>
        <Button
          ref={closeRef}
          variant="ghost"
          size="icon"
          onClick={closePanel}
          aria-label="Close study drawer"
          className="rounded-full hit-target"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Drawn only where a section actually has more than one tool.
          Sanchika owns its whole surface, so it gets no row — a one-tab
          tab row is just a label that looks clickable.

          Hand-rolled rather than the shadcn Tabs used elsewhere: these tabs
          must be driven by the store (so "Ask Varta" from a selection can
          open the drawer on a named tab) and must survive being scrolled
          horizontally on a 390px screen. */}
      {sectionTabs.length > 1 && (
      <div
        role="tablist"
        aria-label={`${activeLabel} tools`}
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-[color:var(--rd-border)] px-2 py-2"
      >
        {sectionTabs.map(({ id, label, icon: Icon, panelId }) => {
          const active = studyTab === id;
          return (
            <button
              key={id}
              role="tab"
              id={`study-tab-${id}`}
              aria-selected={active}
              aria-controls={`study-panel-${panelId ?? id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setStudyTab(id)}
              className={[
                'hit-target flex shrink-0 items-center gap-1.5 rounded-full px-3',
                'text-xs font-semibold transition-colors',
                active
                  ? 'bg-bb-accent-soft text-bb-accent-ink'
                  : 'text-[color:var(--rd-sub)] hover:bg-[color:var(--rd-track)] hover:text-[color:var(--rd-ink)]',
              ].join(' ')}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
      )}

      {/* Every tab stays mounted. Varta holds a conversation, the graph
          holds a fetched entity list and the quiz holds answers in
          progress — unmounting on tab change would throw all three away
          and re-request them on the way back. Hidden panels are `hidden`
          rather than removed, which also keeps them out of the tab
          order. Digest is the one that would hurt most: regenerating a
          recap is an LLM call, not a refetch. */}
      <div className="flex-1 min-h-0 relative">
        {/* One panel, two tabs: `mainTab` is driven from the row above
            instead of AnnotationSidebar's own state, so the hoisted
            Vocabulary tab and the panel it shows cannot disagree. */}
        <TabPanel
          id="notes"
          active={studyTab === 'notes' || studyTab === 'vocab'}
          labelledBy={studyTab === 'vocab' ? 'study-tab-vocab' : 'study-tab-notes'}
        >
          <AnnotationSidebar
            bookId={bookId}
            currentPage={currentPage}
            isOpen
            onClose={closePanel}
            isDarkMode={isDarkMode}
            embedded
            mainTab={studyTab === 'vocab' ? 'vocab' : 'notes'}
          />
        </TabPanel>

        <TabPanel id="varta" active={studyTab === 'varta'}>
          <VartaSidebar
            bookId={bookId}
            isOpen={isOpen && studyTab === 'varta'}
            onClose={closePanel}
            isDarkMode={isDarkMode}
            initialQuery={initialQuery}
            onQueryCleared={onQueryCleared}
            embedded
          />
        </TabPanel>

        <TabPanel id="sanchika" active={studyTab === 'sanchika'}>
          {/* `isOpen` is not decoration here: it gates the poll against
              DigiClassroom's database, so a drawer sitting on another tab
              must not keep querying. */}
          <SanchikaSidebar
            bookId={bookId}
            isOpen={isOpen && studyTab === 'sanchika'}
            onClose={closePanel}
            isDarkMode={isDarkMode}
            embedded
          />
        </TabPanel>

        <TabPanel id="quiz" active={studyTab === 'quiz'}>
          <ChapterQuizContent bookId={bookId} isDarkMode={isDarkMode} />
        </TabPanel>

        <TabPanel id="graph" active={studyTab === 'graph'}>
          <GraphSidebar
            bookId={bookId}
            isOpen={isOpen && studyTab === 'graph'}
            onClose={closePanel}
            isDarkMode={isDarkMode}
            embedded
          />
        </TabPanel>

        <TabPanel id="digest" active={studyTab === 'digest'}>
          <RecapContent bookId={bookId} isDarkMode={isDarkMode} />
        </TabPanel>
      </div>
    </div>
  );
}

function TabPanel({
  id,
  active,
  labelledBy,
  children,
}: {
  id: StudyTab;
  active: boolean;
  /** Which tab button names this panel, when it isn't `study-tab-${id}`
      — Notes and Vocabulary share one panel. */
  labelledBy?: string;
  children: React.ReactNode;
}) {
  /* Tab semantics only where a tab row actually exists above the panel.
     Sanchika is a whole destination with no row: labelling it
     `role="tabpanel" aria-labelledby="study-tab-sanchika"` pointed at a
     button id that is no longer emitted anywhere, which left the open
     panel with a dangling reference, no accessible name, and a tabpanel
     role owned by no tablist. It renders as a plain container — the
     drawer's own `aria-label` ("Sanchika — study tools") is what names
     it, so nothing is lost by saying less here. */
  const isTabbed = SECTION_TABS[SECTION_OF[id]].length > 1;

  return (
    /* `hidden` alone would not work here: the UA rule [hidden]{display:none}
       loses to Tailwind's .flex, which is an author-stylesheet rule of the
       same specificity. The class has to do the hiding. `inert` then takes
       the panel out of the tab order and the accessibility tree, which is
       what `hidden` would otherwise have given us. */
    <div
      role={isTabbed ? 'tabpanel' : undefined}
      id={`study-panel-${id}`}
      aria-labelledby={isTabbed ? (labelledBy ?? `study-tab-${id}`) : undefined}
      inert={!active}
      className={`absolute inset-0 min-h-0 overflow-hidden ${active ? 'flex flex-col' : 'hidden'}`}
    >
      {children}
    </div>
  );
}
