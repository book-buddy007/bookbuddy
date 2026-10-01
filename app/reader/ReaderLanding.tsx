'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Headphones, Sparkles, Highlighter, Bookmark, Moon,
  Search, Library, Loader2, MousePointerClick, NotebookPen, WandSparkles,
  Layers, BookA, Languages, Globe, X, BookmarkPlus, ChevronRight, ChevronLeft,
} from '@/components/ui/icons';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { BookCard } from '@/components/BookCard';
import { BrandMark } from '@/components/ui/brand-mark';
import type { CatalogBook, BookFormatType } from '@/types/catalog';
import { getReaderRoute, getPrimaryReadFormat } from '@/types/catalog';

const ALL = '__ALL__';

// MandalaMark's gradient reads var(--accent-primary) / var(--accent-strong),
// which only exist in the not-yet-deployed design system — without them the
// SVG's stop-color falls back to black. --gold IS live (styles/indic-design-
// system.css), so only the other two need a local scope override.
const mandalaVars = {
  '--gold': 'var(--gold, #FFB547)',
  '--accent-primary': 'var(--deep-saffron, #FF4D00)',
  '--accent-strong': 'var(--saffron, #FF8A3D)',
} as React.CSSProperties;

// Entrance animations use the deployed vg-animations.css keyframes (pure
// CSS, plays on mount) rather than framer-motion — framer-motion's
// animate prop reproducibly never fired in this environment (elements
// stayed frozen at their `initial` style with no console error), while
// these CSS keyframes are proven already-live elsewhere in the app.
function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${inView ? 'animate-vg-fade-in-up' : 'opacity-0'} ${className}`}
      style={inView ? { animationDelay: `${delay}ms`, animationFillMode: 'both' } : undefined}
    >
      {children}
    </div>
  );
}

const FORMAT_LABELS: Record<BookFormatType, string> = {
  PDF: 'PDF',
  EPUB: 'E-Book',
  AUDIOBOOK: 'Audiobook',
  AI_EMBED: 'Varta Enabled',
};

const BENEFITS = [
  {
    icon: BookOpen,
    title: 'Distraction-Free Reading',
    description: 'A clean PDF & EPUB reader with adjustable fonts, themes, and margins — built for focus.',
    accent: 'saffron' as const,
  },
  {
    icon: Sparkles,
    title: 'Ask Varta',
    description: 'Get instant, page-accurate answers to your questions right inside the book you’re reading.',
    accent: 'teal' as const,
  },
  {
    icon: Highlighter,
    title: 'Sanchika Smart Notes',
    description: 'Capture highlights, notes, and flashcards that stay linked to the exact page they came from.',
    accent: 'gold' as const,
  },
  {
    icon: Headphones,
    title: 'Audio Narration',
    description: 'Switch to audio and keep learning on the move, with your place synced across formats.',
    accent: 'indigo' as const,
  },
  {
    icon: Bookmark,
    title: 'Bookmarks & Sync',
    description: 'Pick up exactly where you left off — your progress follows you to any device.',
    accent: 'saffron' as const,
  },
  {
    icon: Moon,
    title: 'Day & Night Themes',
    description: 'Reading comfort at any hour, with adjustable brightness and color temperature.',
    accent: 'teal' as const,
  },
];

const ACCENT_MAP = {
  saffron: 'from-[var(--deep-saffron)]/10 border-[var(--deep-saffron)]/20',
  teal: 'from-[var(--peacock-teal)]/10 border-[var(--peacock-teal)]/20',
  gold: 'from-[var(--gold)]/10 border-[var(--gold)]/25',
  indigo: 'from-[var(--indigo-deep)]/10 border-[var(--indigo-deep)]/20',
};
const ACCENT_ICON_BG = {
  saffron: 'bg-[var(--deep-saffron)]/15 text-[var(--deep-saffron)]',
  teal: 'bg-[var(--peacock-teal)]/15 text-[var(--peacock-teal)]',
  gold: 'bg-[var(--gold)]/20 text-[var(--temple-stone)]',
  indigo: 'bg-[var(--indigo-deep)]/15 text-[var(--indigo-deep)]',
};

// ═══════════════════════════════════════════════════════════════════════
// LIVE DEMO — annotation + vocabulary/wiki lookup
// Self-contained mock (no network calls): mirrors the real reader's
// interaction model (HighlightedText.tsx's char-offset selection +
// AnnotationToolbar.tsx's colors, DictionaryModal.tsx's tabs) so it
// behaves like the actual feature, not just a static screenshot.
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

const HIGHLIGHT_COLORS: { value: string; class: string }[] = [
  { value: '#FFB547', class: 'bg-bb-accent' },
  { value: '#00B8A9', class: 'bg-bb-cobalt' },
  { value: '#42A5F5', class: 'bg-bb-info' },
  { value: '#FF6EB4', class: 'bg-bb-danger' },
  { value: '#AB47BC', class: 'bg-bb-cobalt' },
];

interface DemoHighlight { start: number; end: number; color: string; }
interface DemoSelection { start: number; end: number; x: number; y: number; }

function LiveFeatureDemo() {
  const textRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<DemoHighlight[]>([]);
  const [selection, setSelection] = useState<DemoSelection | null>(null);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dictTab, setDictTab] = useState<'dictionary' | 'translation' | 'wikipedia'>('dictionary');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.toString().trim() === '') return;
      const range = sel.getRangeAt(0);
      const node = textRef.current;
      if (!node) return;

      let container: Node | null = range.commonAncestorContainer;
      while (container && container !== node && container.parentNode) container = container.parentNode;
      if (container !== node) return;

      const preRange = range.cloneRange();
      preRange.selectNodeContents(node);
      preRange.setEnd(range.startContainer, range.startOffset);
      const startIndex = preRange.toString().length;
      const endIndex = startIndex + sel.toString().length;

      const rect = range.getBoundingClientRect();
      const parentRect = node.getBoundingClientRect();
      setSelection({
        start: startIndex,
        end: endIndex,
        x: rect.left - parentRect.left + rect.width / 2,
        y: rect.top - parentRect.top,
      });
    }, 10);
  }, []);

  const applyHighlight = (color: string) => {
    if (!selection) return;
    setHighlights(prev => [...prev.filter(h => h.end <= selection.start || h.start >= selection.end), { ...selection, color }]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    showToast('Highlighted — saved to Sanchika');
  };

  const runAction = (label: string) => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    showToast(label);
  };

  // Build render segments: cut the text at every highlight boundary AND
  // every vocab-word boundary, so each leaf span gets exactly one style.
  const segments = useMemo(() => {
    const cuts = new Set([0, DEMO_TEXT.length]);
    highlights.forEach(h => { cuts.add(h.start); cuts.add(h.end); });
    const vocabRanges: { start: number; end: number; word: string }[] = [];
    Object.keys(VOCAB_WORDS).forEach(word => {
      const idx = DEMO_TEXT.toLowerCase().indexOf(word);
      if (idx !== -1) {
        vocabRanges.push({ start: idx, end: idx + word.length, word });
        cuts.add(idx);
        cuts.add(idx + word.length);
      }
    });
    const points = Array.from(cuts).sort((a, b) => a - b);
    const result: { text: string; start: number; end: number; highlight?: string; vocab?: string }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      if (start === end) continue;
      const highlight = highlights.find(h => h.start <= start && h.end >= end)?.color;
      const vocab = vocabRanges.find(v => v.start === start && v.end === end)?.word;
      result.push({ text: DEMO_TEXT.slice(start, end), start, end, highlight, vocab });
    }
    return result;
  }, [highlights]);

  const activeVocab = activeWord ? VOCAB_WORDS[activeWord] : null;

  return (
    <div className="relative">
      <div
        ref={textRef}
        onMouseUp={handleMouseUp}
        className="relative select-text text-[17px] sm:text-[19px] leading-relaxed text-slate-700 font-display p-6 sm:p-8 rounded-2xl bg-white border-2 border-dashed border-[var(--deep-saffron)]/25"
      >
        {segments.map((seg, i) =>
          seg.vocab ? (
            <span
              key={i}
              onClick={(e) => { e.stopPropagation(); setActiveWord(seg.vocab!); setDictTab('dictionary'); }}
              className="cursor-pointer font-semibold text-[var(--peacock-teal)] underline decoration-dotted decoration-2 underline-offset-4 hover:text-[var(--deep-saffron)] transition-colors"
              style={seg.highlight ? { backgroundColor: seg.highlight + '80' } : undefined}
            >
              {seg.text}
            </span>
          ) : (
            <span key={i} style={seg.highlight ? { backgroundColor: seg.highlight + '80' } : undefined}>
              {seg.text}
            </span>
          )
        )}

        {/* Floating annotation toolbar */}
        {selection && (
          <div
            style={{ position: 'absolute', left: selection.x, top: selection.y, transform: 'translate(-50%, -110%)' }}
            className="animate-vg-scale-in z-30 flex items-center gap-1.5 rounded-xl bg-slate-900 text-white shadow-2xl px-2.5 py-2 whitespace-nowrap"
          >
            {HIGHLIGHT_COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => applyHighlight(c.value)}
                className={`h-5 w-5 rounded-full ${c.class} ring-2 ring-white/30 hover:ring-white/80 hover:scale-110 transition-all`}
                aria-label={`Highlight ${c.value}`}
              />
            ))}
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button onClick={() => runAction('Note added')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="Add note">
              <NotebookPen className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => runAction('Asked Varta')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="Ask Varta">
              <WandSparkles className="h-3.5 w-3.5 text-[var(--deep-saffron)]" />
            </button>
            <button onClick={() => runAction('Flashcard created')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="Create flashcard">
              <Layers className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <MousePointerClick className="h-3.5 w-3.5" />
        Try it: select any text for highlights & notes, or tap an underlined word to look it up.
      </p>

      {/* Toast */}
      {toast && (
        <div className="animate-vg-fade-in-up absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg z-40">
          {toast}
        </div>
      )}

      {/* Dictionary / Wiki popup */}
      {activeVocab && (
        <>
          <div
            onClick={() => setActiveWord(null)}
            className="animate-vg-fade-in fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <div
            className="animate-vg-scale-in fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xl font-bold text-slate-900 capitalize font-display">{activeWord}</h4>
                <span className="text-sm text-slate-400">{activeVocab.pronunciation}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setActiveWord(null); showToast('Saved to your vocabulary'); }}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-[var(--deep-saffron)] hover:text-[var(--deep-saffron)] transition-colors"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" /> Save
                </button>
                <button onClick={() => setActiveWord(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="flex border-b border-slate-100 px-5 gap-1">
              {[
                { key: 'dictionary' as const, label: 'English', icon: BookA },
                { key: 'translation' as const, label: 'Hindi', icon: Languages },
                { key: 'wikipedia' as const, label: 'Wikipedia', icon: Globe },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setDictTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                    dictTab === t.key
                      ? 'border-[var(--deep-saffron)] text-[var(--deep-saffron)]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 max-h-[45vh] overflow-y-auto">
              {dictTab === 'dictionary' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed">{activeVocab.definition}</p>
                  <p className="text-sm text-slate-400 italic">“{activeVocab.example}”</p>
                </div>
              )}
              {dictTab === 'translation' && (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <p className="text-3xl font-semibold text-[var(--indigo-deep)] font-display">{activeVocab.hindi}</p>
                  <p className="text-xs text-slate-400">Hindi translation</p>
                </div>
              )}
              {dictTab === 'wikipedia' && (
                <p className="text-sm text-slate-600 leading-relaxed">{activeVocab.wiki}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGE
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
                genre: Array.isArray(b.categories) ? b.categories.map((c: any) => c.name ?? c) : [],
                accessTier: (b.accessTier ?? 'FREE').toUpperCase(),
                formats: Array.isArray(b.bookFormats) ? [...new Set<BookFormatType>(b.bookFormats.map((f: any) => f.type))] : [],
                bookFormats: Array.isArray(b.bookFormats) ? b.bookFormats : [],
                available: b.available ?? true,
                rating: b.rating ?? null,
              }))
            : [];
          setBooks(mapped);
        } else {
          setError('Could not load books right now. Please try again.');
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          const names = Array.isArray(data) ? data.map((c: any) => c.name).filter(Boolean).sort() : [];
          setGenres(names);
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
    books.forEach(b => b.formats.forEach(f => set.add(f)));
    return Array.from(set);
  }, [books]);

  const hasActiveFilter = formatFilter !== ALL || genreFilter !== ALL || titleFilter !== ALL;

  const filteredBooks = useMemo(() => {
    if (!hasActiveFilter) return [];
    return books.filter(b => {
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
      await fetch(`/api/v1/books/${book.id}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowedAt: new Date().toISOString() }),
      });
      setBooks(prev => prev.map(b => (b.id === book.id ? { ...b, available: false } : b)));
    } catch (e) {
      console.error('[ReaderLanding] Failed to borrow:', e);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--ivory-cream)]">
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden mesh-bg-indic px-4 sm:px-6 pt-6 sm:pt-16 pb-16 sm:pb-20 text-center">
        
        <div className="relative z-10 flex justify-start mb-8 sm:mb-2 sm:absolute sm:top-6 sm:left-6">
          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        <div className="animate-vg-fade-in-down relative z-10 flex justify-center mb-6">
          <div style={mandalaVars} className="drop-shadow-[0_0_24px_rgba(255,77,0,0.35)] relative">
            <BrandMark height={35} />
            <BookOpen className="absolute -bottom-1 -right-1 h-6 w-6 text-white bg-[var(--peacock-teal)] rounded-full p-1 shadow-lg" />
          </div>
        </div>

        <h1
          className="animate-vg-fade-in-up relative z-10 text-3xl sm:text-5xl font-extrabold text-white mb-4"
          style={{ fontFamily: 'var(--font-display)', animationDelay: '100ms', animationFillMode: 'both' }}
        >
          Your Reader,{' '}
          <span className="text-bb-accent">
            Ready When You Are
          </span>
        </h1>
        <p
          className="animate-vg-fade-in-up relative z-10 text-white/80 text-sm sm:text-base max-w-xl mx-auto"
          style={{ animationDelay: '200ms', animationFillMode: 'both' }}
        >
          Pick a book by format, subject, or name — read it, listen to it, or ask Varta about it, all in one place.
        </p>
      </section>

      {/* ─── Filters ──────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 -mt-8 relative z-20 mb-4">
        <div
          className="animate-vg-fade-in-up rounded-bb-lg bg-bb-surface shadow-e1 p-4 sm:p-5 flex flex-col sm:flex-row gap-3"
          style={{ animationDelay: '300ms', animationFillMode: 'both' }}
        >
          <div className="flex-1">
            <label className="text-xs font-bold text-[var(--indigo-deep)] mb-1.5 block">Format</label>
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="bg-white border-[var(--deep-saffron)]/25">
                <SelectValue placeholder="All Formats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Formats</SelectItem>
                {availableFormats.map(f => (
                  <SelectItem key={f} value={f}>{FORMAT_LABELS[f] ?? f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-xs font-bold text-[var(--indigo-deep)] mb-1.5 block">Subject</label>
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="bg-white border-[var(--deep-saffron)]/25">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Subjects</SelectItem>
                {genres.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-xs font-bold text-[var(--indigo-deep)] mb-1.5 block">Book Name</label>
            <Select value={titleFilter} onValueChange={setTitleFilter}>
              <SelectTrigger className="bg-white border-[var(--deep-saffron)]/25">
                <SelectValue placeholder="All Books" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Books</SelectItem>
                {books.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ─── Book results — only after a filter is chosen ───────── */}
      <div className="max-w-6xl mx-auto px-6 mb-16 min-h-[120px]">
        {!hasActiveFilter ? (
          <div key="prompt" className="animate-vg-fade-in flex flex-col items-center justify-center py-10 gap-2 text-center">
            <ChevronRight className="h-5 w-5 text-[var(--deep-saffron)] rotate-[-90deg] animate-vg-bounce-subtle" />
            <p className="text-sm text-slate-500 font-medium">Choose a format, subject, or book name above to see matching books.</p>
          </div>
        ) : isLoading ? (
          <div key="loading" className="animate-vg-fade-in flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--deep-saffron)]" />
            <p className="text-sm text-slate-500">Loading books…</p>
          </div>
        ) : error ? (
          <div key="error" className="animate-vg-fade-in text-center py-16">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div key="empty" className="animate-vg-fade-in text-center py-16">
            <Search className="h-10 w-10 text-[var(--deep-saffron)]/40 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">No books match these filters yet.</p>
          </div>
        ) : (
          <div key="results" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredBooks.map((book, idx) => (
              <div
                key={book.id}
                className="animate-vg-fade-in-up h-full"
                style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both' }}
              >
                <BookCard
                  book={book}
                  onRead={handleRead}
                  onListen={handleListen}
                  onBorrow={handleBorrow}
                  onView={handleView}
                  priority={idx < 4}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      
      {/* ─── Live feature demo ────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 py-14">
        <Reveal className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--indigo-deep)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            See the reader in action
          </h2>
          <p className="text-sm text-slate-500">
            This is a live, working sample — the exact tools you get inside every book.
          </p>
        </Reveal>
        <Reveal delay={100}>
          <LiveFeatureDemo />
        </Reveal>
      </div>

      
      {/* ─── Benefits ─────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <Reveal className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--indigo-deep)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Everything you need to study smarter
          </h2>
          <p className="text-sm text-slate-500">
            The reader is built around how students actually study — not just how they read.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map(({ icon: Icon, title, description, accent }, idx) => (
            <Reveal key={title} delay={idx * 80}>
              <div
                className={`group relative rounded-2xl border bg-gradient-to-br ${ACCENT_MAP[accent]} to-white p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden h-full`}
              >
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center mb-4 ${ACCENT_ICON_BG[accent]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-800 mb-1.5">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <EnhancedButton
            variant="ghost"
            className="text-[var(--indigo-deep)]"
            icon={<Library className="h-4 w-4" />}
            iconPosition="left"
            onClick={() => router.push('/catalog')}
          >
            Browse the full library
          </EnhancedButton>
        </div>
      </div>
    </div>
  );
}
