'use client';

import Link from 'next/link';
import { useRef, useEffect, useCallback } from 'react';
import { BookOpen, Headphones, Sparkles, FileText, Mic } from '@/components/ui/icons';

export interface ContinueBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  progress: string;           // e.g. "Chapter 4 of 12"
  progressPercent: number;    // 0–100
  formats: string[];          // e.g. ['EPUB', 'PDF', 'Audio', 'Varta']
  hasNotes?: boolean;
  hasAudio?: boolean;
  hasVartaAI?: boolean;
  readerHref?: string;
}

const FORMAT_ICON: Record<string, React.ReactNode> = {
  EPUB: <BookOpen className="h-3 w-3" />,
  PDF: <FileText className="h-3 w-3" />,
  Audio: <Headphones className="h-3 w-3" />,
  'Varta': <Sparkles className="h-3 w-3" />,
  Sanchika: <BookOpen className="h-3 w-3" />,
  TTS: <Mic className="h-3 w-3" />,
};

export interface RecentBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
}

interface ContinueLearningRowProps {
  books: ContinueBook[];
  isLoading?: boolean;
  /** Recently-added catalogue books, shown as an animated carousel in the empty
      state (a student who hasn't started reading anything yet). */
  recentBooks?: RecentBook[];
}

export function ContinueLearningRow({ books, isLoading, recentBooks = [] }: ContinueLearningRowProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          className="text-xl font-semibold text-slate-900 dark:text-slate-100"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Continue learning
        </h2>
        <Link
          href="/dashboard/student/personal-library"
          className="text-sm font-semibold text-[var(--deep-saffron)] hover:text-[var(--saffron)] transition-colors"
        >
          Go to library →
        </Link>
      </div>

      {/* Skeleton placeholders */}
      {isLoading && (
        <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2 indic-scroll">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="min-w-[320px] max-w-sm flex-shrink-0 rounded-2xl bg-white/60 dark:bg-slate-800/40 p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 animate-pulse"
            >
              <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
              <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700 mb-1" />
              <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
              <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 mb-4" />
              <div className="flex gap-1.5 mb-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
                ))}
              </div>
              <div className="h-9 w-32 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state — a student who hasn't started reading. If the catalogue has
          recently-added books, surface them in a smooth auto-scrolling carousel
          instead of a bare CTA, so the first thing they see is something to read. */}
      {!isLoading && books.length === 0 && recentBooks.length > 0 && (
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/30 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Fresh in the library
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You haven&apos;t started reading yet — here&apos;s what&apos;s new.
              </p>
            </div>
            <Link
              href="/catalog"
              className="shrink-0 inline-flex items-center rounded-full bg-[var(--deep-saffron)] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[var(--saffron)] transition-colors"
            >
              Browse Library
            </Link>
          </div>

          <RecentBooksCarousel books={recentBooks} />
        </div>
      )}

      {/* Empty state fallback — no recent books to show either. */}
      {!isLoading && books.length === 0 && recentBooks.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/30 p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            You haven&apos;t started reading any books yet.
          </p>
          <Link
            href="/catalog"
            className="mt-3 inline-flex items-center rounded-full bg-[var(--deep-saffron)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--saffron)] transition-colors"
          >
            Browse Library
          </Link>
        </div>
      )}

      {/* Cards row */}
      {!isLoading && books.length > 0 && (
        <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2 indic-scroll snap-x snap-mandatory">
          {books.map((book, idx) => (
            <article
              key={book.id}
              className={`
                group min-w-[320px] max-w-sm flex-shrink-0 snap-start
                rounded-2xl p-6 shadow-sm transition-all duration-300
                hover:shadow-xl hover:shadow-[var(--deep-saffron)]/10 hover:-translate-y-1.5
                ${idx === 0
                  ? 'bg-gradient-to-br from-[#FFFCF7] to-[#FFF3E6] dark:from-[#1A1A2E] dark:to-[#0F3460] ring-1 ring-[var(--deep-saffron)]'
                  : 'bg-white/90 dark:bg-[#0F172A] ring-1 ring-slate-100 hover:ring-[var(--deep-saffron)]/30 dark:ring-slate-700/60 dark:hover:ring-[var(--deep-saffron)]/30'
                }
              `}
            >
              {/* Top-priority indicator */}
              {idx === 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--deep-saffron)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--deep-saffron)] mb-2">
                  <Sparkles className="h-3 w-3" /> Top priority
                </span>
              )}

              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {idx === 0 ? 'Resume now' : 'Last opened'}
              </p>

              <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
                {book.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {book.author}
              </p>

              {/* Progress */}
              <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                {book.progress}
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--deep-saffron)] to-[var(--saffron)] transition-all duration-500"
                  style={{ width: `${Math.min(book.progressPercent, 100)}%` }}
                />
              </div>

              {/* Format chips */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {book.formats.map((fmt) => (
                  <span
                    key={fmt}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 dark:bg-slate-700/60 border border-slate-200/60 dark:border-slate-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
                  >
                    {FORMAT_ICON[fmt]}
                    {fmt}
                  </span>
                ))}
              </div>

              {/* Resume button */}
              <Link
                href={book.readerHref || '/reader'}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[var(--deep-saffron)] px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--saffron)] hover:shadow-md group-hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[var(--deep-saffron)]/50 focus:ring-offset-2"
              >
                Resume reading
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Recent-books carousel ──────────────────────────────────────────────────
   A real scroll container (not the old CSS-transform marquee, which could not be
   dragged): finger-swipe works natively on touch, and a pointer-drag handler
   adds click-and-drag on desktop. A gentle auto-advance keeps it alive but backs
   off the moment the user touches it, and is skipped entirely for reduced-motion.
   The list is duplicated so the auto-advance can loop seamlessly (reset by half
   the scroll width). Dragging past the halfway point wraps too. */
function RecentBooksCarousel({ books }: { books: RecentBook[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const interacting = useRef(false);

  // Keep the infinite loop stable: whenever scroll passes the first copy, jump
  // back by exactly one copy's width. Imperceptible because both copies match.
  const halfWidth = useCallback(() => (scrollRef.current?.scrollWidth ?? 0) / 2, []);

  // Auto-advance. rAF-paced, ~0.4px/frame, paused while the user interacts or if
  // the OS asks for reduced motion.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const step = () => {
      if (!interacting.current && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += 0.4;
        if (el.scrollLeft >= halfWidth()) el.scrollLeft -= halfWidth();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [halfWidth, books.length]);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    interacting.current = true; // pause auto-advance for any input type
    // Manual drag-to-scroll is MOUSE only. Touch/pen already scroll natively via
    // overflow-x-auto + touch-pan-x; capturing them here would double the motion.
    if (e.pointerType !== 'mouse') return;
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    el.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
    if (el.scrollLeft >= halfWidth()) el.scrollLeft -= halfWidth();
    else if (el.scrollLeft < 0) el.scrollLeft += halfWidth();
  };
  const endDrag = (e: React.PointerEvent) => {
    drag.current.active = false;
    // Small delay before auto-advance resumes so a flick doesn't jump.
    window.setTimeout(() => { interacting.current = false; }, 600);
    scrollRef.current?.releasePointerCapture?.(e.pointerId);
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onMouseEnter={() => { interacting.current = true; }}
        onMouseLeave={() => { if (!drag.current.active) interacting.current = false; }}
        className="flex gap-4 overflow-x-auto pb-1 cursor-grab active:cursor-grabbing select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-x"
      >
        {[...books, ...books].map((b, i) => (
          <Link
            key={`${b.id}-${i}`}
            href={`/catalog/${b.id}`}
            aria-label={b.title}
            // A drag that moved shouldn't also fire navigation on release.
            onClick={(e) => { if (drag.current.moved) e.preventDefault(); }}
            draggable={false}
            className="group/item block w-[120px] shrink-0"
          >
            <div className="aspect-[2/3] w-full overflow-hidden rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
              {b.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.coverUrl}
                  alt={b.title}
                  loading="lazy"
                  draggable={false}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-105 pointer-events-none"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-3 text-center">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-4">
                    {b.title}
                  </span>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-1">
              {b.title}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1">
              {b.author}
            </p>
          </Link>
        ))}
      </div>
      {/* Edge fades — themed to the card's own surface in both modes. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/90 dark:from-[#0F172A]/90 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/90 dark:from-[#0F172A]/90 to-transparent" />
    </div>
  );
}
