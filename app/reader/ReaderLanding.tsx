'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Icon, type BBIconName } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState } from '@/components/ui/empty-state';
import { BookCard } from '@/components/BookCard';
import { EpubSelectionPopover, type SelectionPopoverState } from '@/components/reader/EpubSelectionPopover';
import { FeatureHero, FeatureSectionTitle, Reveal } from '@/components/landing/feature-landing';
import { toast } from '@/hooks/use-toast';
import type { CatalogBook, BookFormatType } from '@/types/catalog';
import { getReaderRoute, getPrimaryReadFormat } from '@/types/catalog';

const ALL = '__ALL__';

const FORMAT_LABELS: Record<BookFormatType, string> = {
  PDF: 'PDF',
  EPUB: 'eBook',
  AUDIOBOOK: 'Audiobook',
  AI_EMBED: 'Varta enabled',
};

const BENEFITS: { icon: BBIconName; title: string; description: string }[] = [
  { icon: 'read', title: 'Distraction-free reading', description: 'A clean PDF and EPUB reader with adjustable text, themes and spacing, built for focus.' },
  { icon: 'varta', title: 'Ask Varta', description: 'Page-accurate answers to your questions, right inside the book you are reading.' },
  { icon: 'sanchika', title: 'Sanchika notes', description: 'Highlights, notes and flashcards that stay linked to the exact page they came from.' },
  { icon: 'audiobook', title: 'Listen along', description: 'Switch to audio and keep learning on the move, with your place kept across formats.' },
  { icon: 'bookmark', title: 'Bookmarks and sync', description: 'Pick up where you left off. Your progress follows you to any device.' },
  { icon: 'theme', title: 'Paper, Sepia, Night', description: 'Comfortable reading at any hour, with warmth and contrast you can tune.' },
];

// ═══════════════════════════════════════════════════════════════════════
// LIVE DEMO — highlighting and word lookup. Self-contained (no network): it
// uses the reader's real selection popover and highlight colours, and a
// mock dictionary for three words. Nothing here is saved.
// ═══════════════════════════════════════════════════════════════════════

const DEMO_TEXT =
  'Every plant cell contains chloroplasts, tiny structures where photosynthesis converts sunlight into chemical energy. That energy later fuels cellular respiration inside the mitochondria — the cell’s powerhouse — a cycle every student meets in Class 9 Science.';

const VOCAB_WORDS: Record<string, { pronunciation: string; definition: string; example: string; hindi: string; wiki: string }> = {
  chloroplasts: {
    pronunciation: '/ˈklɔrəˌplæsts/',
    definition: 'Organelles found in plant cells that conduct photosynthesis, capturing light energy to produce food.',
    example: 'Chloroplasts give leaves their green colour.',
    hindi: 'हरितलवक',
    wiki: 'A chloroplast is a type of membrane-bound organelle known as a plastid that conducts photosynthesis in plant and algal cells. Chloroplasts have a high concentration of chlorophyll, the pigment that gives leaves their green colour.',
  },
  photosynthesis: {
    pronunciation: '/ˌfəʊtəʊˈsɪnθəsɪs/',
    definition: 'The process by which green plants use sunlight to synthesise nutrients from carbon dioxide and water.',
    example: 'Photosynthesis releases oxygen as a byproduct.',
    hindi: 'प्रकाश संश्लेषण',
    wiki: 'Photosynthesis is a biological process used by many cellular organisms to convert light energy into chemical energy, which is later used to fuel cellular activities. It is a key process that keeps most living organisms alive.',
  },
  mitochondria: {
    pronunciation: '/ˌmaɪtəˈkɒndriə/',
    definition: 'Organelles that generate most of a cell’s supply of chemical energy, often called the powerhouse of the cell.',
    example: 'Muscle cells contain many mitochondria because they need lots of energy.',
    hindi: 'सूत्रकणिका',
    wiki: 'Mitochondria are membrane-bound organelles found in the cytoplasm of almost all eukaryotic cells. Their primary function is to generate large quantities of energy in the form of adenosine triphosphate (ATP).',
  },
};

interface DemoHighlight { start: number; end: number; color: string }
interface DemoSelection extends SelectionPopoverState { start: number; end: number }

function LiveFeatureDemo() {
  const textRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<DemoHighlight[]>([]);
  const [selection, setSelection] = useState<DemoSelection | null>(null);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [dictTab, setDictTab] = useState<'dictionary' | 'translation' | 'wikipedia'>('dictionary');

  const say = useCallback((msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(null), 2200);
  }, []);

  const handleSelect = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection();
      const node = textRef.current;
      if (!sel || sel.rangeCount === 0 || sel.toString().trim() === '' || !node) return;
      const range = sel.getRangeAt(0);
      if (!node.contains(range.commonAncestorContainer)) return;

      const pre = range.cloneRange();
      pre.selectNodeContents(node);
      pre.setEnd(range.startContainer, range.startOffset);
      const start = pre.toString().length;
      const end = start + sel.toString().length;

      const rect = range.getBoundingClientRect();
      const host = node.getBoundingClientRect();
      setSelection({
        text: sel.toString(),
        cfiRange: '',
        start,
        end,
        x: rect.left - host.left + rect.width / 2,
        y: rect.top - host.top,
        bottom: rect.bottom - host.top,
      });
    }, 10);
  }, []);

  const clearSelection = () => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const applyHighlight = (_value: string, hex: string) => {
    if (!selection) return;
    setHighlights((prev) => [...prev.filter((h) => h.end <= selection.start || h.start >= selection.end), { start: selection.start, end: selection.end, color: hex }]);
    clearSelection();
    say('Highlighted. In a real book it goes to your notes.');
  };

  // Cut the text at every highlight and vocabulary boundary so each span has one style.
  const segments = useMemo(() => {
    const cuts = new Set([0, DEMO_TEXT.length]);
    highlights.forEach((h) => { cuts.add(h.start); cuts.add(h.end); });
    const vocabRanges: { start: number; end: number; word: string }[] = [];
    Object.keys(VOCAB_WORDS).forEach((word) => {
      const idx = DEMO_TEXT.toLowerCase().indexOf(word);
      if (idx !== -1) {
        vocabRanges.push({ start: idx, end: idx + word.length, word });
        cuts.add(idx);
        cuts.add(idx + word.length);
      }
    });
    const points = Array.from(cuts).sort((a, b) => a - b);
    const out: { text: string; highlight?: string; vocab?: string }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      if (start === end) continue;
      out.push({
        text: DEMO_TEXT.slice(start, end),
        highlight: highlights.find((h) => h.start <= start && h.end >= end)?.color,
        vocab: vocabRanges.find((v) => v.start === start && v.end === end)?.word,
      });
    }
    return out;
  }, [highlights]);

  const activeVocab = activeWord ? VOCAB_WORDS[activeWord] : null;

  return (
    <div className="relative">
      <div data-reader="paper" className="rounded-bb-xl border border-dashed border-[color:var(--rd-border)] bg-[color:var(--rd-bg)] px-6 py-7 shadow-e1 sm:px-9">
        {/* Outside the selectable box: selection offsets are measured from its first character. */}
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">Chapter 5 · The fundamental unit of life</p>
        <div
          ref={textRef}
          onMouseUp={handleSelect}
          onTouchEnd={handleSelect}
          className="relative select-text font-reading text-[18px] leading-[1.75] text-[color:var(--rd-ink)] sm:text-[20px]"
        >
          {segments.map((seg, i) =>
            seg.vocab ? (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveWord(seg.vocab!); setDictTab('dictionary'); }}
                className="cursor-pointer select-text rounded-sm font-semibold text-bb-cobalt underline decoration-dotted decoration-2 underline-offset-4 hover:text-bb-accent-ink focus-visible:outline-none focus-visible:shadow-focus"
                style={seg.highlight ? { backgroundColor: seg.highlight } : undefined}
              >
                {seg.text}
              </button>
            ) : (
              <span key={i} style={seg.highlight ? { backgroundColor: seg.highlight } : undefined}>{seg.text}</span>
            ),
          )}

          {selection && (
            <EpubSelectionPopover
              state={selection}
              container={textRef.current}
              onHighlight={applyHighlight}
              onNote={() => { clearSelection(); say('In a real book this opens a note on that passage.'); }}
              onListen={() => { clearSelection(); say('In a real book this reads aloud from here.'); }}
              onAskVarta={() => { clearSelection(); say('In a real book Varta answers from this page.'); }}
              onClose={clearSelection}
            />
          )}
        </div>
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-bb-muted">
        <Icon name="highlight" size={14} />
        Select any text to highlight it, or tap an underlined word to look it up.
      </p>

      <div aria-live="polite" className="pointer-events-none absolute inset-x-0 -bottom-12 flex justify-center">
        {note && (
          <span className="rounded-full bg-bb-navy px-4 py-2 text-xs font-semibold text-white shadow-e2 animate-in fade-in-0 slide-in-from-bottom-2 duration-bb-ui">
            {note}
          </span>
        )}
      </div>

      <Modal
        open={!!activeVocab}
        onOpenChange={(o) => !o && setActiveWord(null)}
        title={<span className="capitalize">{activeWord}</span>}
        description={activeVocab?.pronunciation}
      >
        {activeVocab && (
          <div className="space-y-4">
            <Segmented
              fullWidth
              size="sm"
              value={dictTab}
              onValueChange={setDictTab}
              options={[
                { value: 'dictionary', label: 'English' },
                { value: 'translation', label: 'Hindi' },
                { value: 'wikipedia', label: 'Wikipedia' },
              ]}
            />
            <div className="min-h-[120px]">
              {dictTab === 'dictionary' && (
                <div className="space-y-2">
                  <p className="text-[15px] leading-relaxed text-bb-text">{activeVocab.definition}</p>
                  <p className="font-reading text-[15px] italic text-bb-muted">“{activeVocab.example}”</p>
                </div>
              )}
              {dictTab === 'translation' && (
                <div className="flex flex-col items-center gap-1 py-4">
                  <p className="font-display text-3xl font-bold text-bb-text">{activeVocab.hindi}</p>
                  <p className="text-xs text-bb-muted">Hindi</p>
                </div>
              )}
              {dictTab === 'wikipedia' && <p className="text-sm leading-relaxed text-bb-muted">{activeVocab.wiki}</p>}
            </div>
            <p className="text-xs text-bb-faint">Sample entry. In the reader, words you look up can be saved to your vocabulary.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4" aria-busy="true" aria-label="Loading books">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="animate-pulse rounded-bb-lg bg-bb-surface p-3 shadow-e1">
          <div className="aspect-[84/124] rounded-[4px_12px_12px_4px] bg-bb-surface-2" />
          <div className="mt-3 h-4 w-3/4 rounded-full bg-bb-surface-2" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGE — /reader with no book: pick one, try the tools.
// ═══════════════════════════════════════════════════════════════════════

export function ReaderLanding() {
  const router = useRouter();
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formatFilter, setFormatFilter] = useState(ALL);
  const [genreFilter, setGenreFilter] = useState(ALL);
  const [titleFilter, setTitleFilter] = useState(ALL);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const [booksRes, categoriesRes] = await Promise.all([
          fetch('/api/v1/books?limit=100&status=PUBLISHED'),
          fetch('/api/v1/books/categories?type=GENRE'),
        ]);

        if (booksRes.ok) {
          const data = await booksRes.json();
          const mapped: CatalogBook[] = Array.isArray(data.data)
            ? data.data.map((b: any): CatalogBook => ({
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
                // The list endpoint nests categories as { category: { name } }; reading
                // `c.name` gave objects, so the Subject filter never matched anything.
                genre: Array.isArray(b.categories) ? b.categories.map((c: any) => c.category?.name ?? c.name ?? c).filter((g: any) => typeof g === 'string') : [],
                accessTier: (b.accessTier ?? 'FREE').toUpperCase(),
                formats: Array.isArray(b.bookFormats) ? [...new Set<BookFormatType>(b.bookFormats.map((f: any) => f.type))] : [],
                bookFormats: Array.isArray(b.bookFormats) ? b.bookFormats : [],
                available: (b.availableCopies ?? 1) > 0,
                rating: b.rating ?? null,
              }))
            : [];
          setBooks(mapped);
        } else {
          setError('Could not load books right now. Please try again.');
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setGenres(Array.isArray(data) ? data.map((c: any) => c.name).filter(Boolean).sort() : []);
        }
      } catch (e) {
        console.error('[ReaderLanding] Failed to load books:', e);
        setError('Could not load books right now. Please try again.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const availableFormats = useMemo(() => {
    const set = new Set<BookFormatType>();
    books.forEach((b) => b.formats.forEach((f) => set.add(f)));
    return Array.from(set);
  }, [books]);

  const hasActiveFilter = formatFilter !== ALL || genreFilter !== ALL || titleFilter !== ALL;

  const filteredBooks = useMemo(() => {
    if (!hasActiveFilter) return [];
    return books.filter((b) => {
      if (formatFilter !== ALL && !b.formats.includes(formatFilter as BookFormatType)) return false;
      if (genreFilter !== ALL && !b.genre.includes(genreFilter)) return false;
      if (titleFilter !== ALL && b.id !== titleFilter) return false;
      return true;
    });
  }, [books, formatFilter, genreFilter, titleFilter, hasActiveFilter]);

  const handleRead = (book: CatalogBook, format?: 'EPUB' | 'PDF') => {
    const fmt = format ?? getPrimaryReadFormat(book.formats) ?? 'PDF';
    router.push(getReaderRoute(book.id, fmt));
  };
  const handleListen = (book: CatalogBook) => router.push(getReaderRoute(book.id, 'AUDIOBOOK'));
  const handleView = (book: CatalogBook) => router.push(`/catalog/${book.id}`);
  const handleBorrow = async (book: CatalogBook) => {
    try {
      const res = await fetch(`/api/v1/books/${book.id}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowedAt: new Date().toISOString() }),
      });
      // It used to mark the book borrowed whatever the server said.
      if (!res.ok) throw new Error(`borrow ${res.status}`);
      setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, available: false } : b)));
      toast({ title: 'Borrowed', description: `“${book.title}” is in your library.` });
    } catch (e) {
      console.error('[ReaderLanding] Failed to borrow:', e);
      toast({ title: 'Couldn’t borrow', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const clearFilters = () => { setFormatFilter(ALL); setGenreFilter(ALL); setTitleFilter(ALL); };

  return (
    <div className="min-h-dvh w-full bg-bb-bg pb-20 text-bb-text">
      <FeatureHero
        eyebrow="Reader"
        icon="read"
        title={<>Your reader, <span className="text-bb-blaze-light">ready when you are</span></>}
        description="Pick a book by format, subject or name. Read it, listen to it, or ask Varta about it, all in one place."
        back={{ href: '/dashboard', label: 'Dashboard' }}
      />

      <div className="relative z-10 mx-auto -mt-14 mb-6 max-w-5xl px-4 sm:px-6">
        <div className="grid gap-4 rounded-bb-lg bg-bb-surface p-5 shadow-e2 sm:grid-cols-3">
          <FormField label="Format" htmlFor="rl-format">
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger id="rl-format"><SelectValue placeholder="All formats" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All formats</SelectItem>
                {availableFormats.map((f) => <SelectItem key={f} value={f}>{FORMAT_LABELS[f] ?? f}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Subject" htmlFor="rl-subject">
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger id="rl-subject"><SelectValue placeholder="All subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All subjects</SelectItem>
                {genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Book" htmlFor="rl-book">
            <Select value={titleFilter} onValueChange={setTitleFilter}>
              <SelectTrigger id="rl-book"><SelectValue placeholder="All books" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All books</SelectItem>
                {books.map((b) => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      {/* Results appear once a filter is chosen */}
      <div className="mx-auto mb-16 min-h-[120px] max-w-6xl px-4 sm:px-6">
        {!hasActiveFilter ? (
          <p className="flex items-center justify-center gap-2 py-8 text-center text-sm font-medium text-bb-muted">
            <Icon name="arrow-up-right" size={16} fillLayer={false} className="-rotate-45 text-bb-accent" />
            Choose a format, subject or book above to see matching titles.
          </p>
        ) : isLoading ? (
          <GridSkeleton />
        ) : error ? (
          <EmptyState icon="alert-circle" title="Couldn’t load books" description={error}
            action={<Button variant="outline" onClick={() => window.location.reload()}><Icon name="rotate-cw" fillLayer={false} />Try again</Button>} />
        ) : filteredBooks.length === 0 ? (
          <EmptyState icon="search" title="No books match" description="Try a different format or subject."
            action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>} />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {filteredBooks.map((book, idx) => (
              <li key={book.id} className="h-full animate-in fade-in-0 slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${Math.min(idx, 8) * 60}ms`, animationFillMode: 'both' }}>
                <BookCard book={book} onRead={handleRead} onListen={handleListen} onBorrow={handleBorrow} onView={handleView} priority={idx < 4} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="mx-auto mb-24 max-w-3xl px-4 sm:px-6">
        <Reveal>
          <FeatureSectionTitle title="Try the reader" description="A working sample of the tools inside every book. Nothing here is saved." />
        </Reveal>
        <Reveal delay={100}>
          <LiveFeatureDemo />
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <FeatureSectionTitle title="Everything you need to study smarter" description="Built around how students actually study, not just how they read." />
        </Reveal>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon, title, description }, idx) => (
            <li key={title}>
              <Reveal delay={idx * 70} className="h-full">
                <div className="bb-lift h-full rounded-bb-lg bg-bb-surface p-6 shadow-e1">
                  <span className="mb-4 grid h-12 w-12 place-items-center rounded-bb-md bg-bb-accent-soft text-bb-accent-ink">
                    <Icon name={icon} size={24} />
                  </span>
                  <h3 className="font-display text-lg font-bold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-bb-muted">{description}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/catalog">
              <Icon name="library" />
              Browse the full library
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
