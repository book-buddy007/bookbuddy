'use client';

import Link from 'next/link';
import { useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { BookCover } from '@/components/ui/book-cover';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { BBIconName } from '@/components/ui/icon';

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

const FORMAT_ICON: Record<string, BBIconName> = {
  EPUB: 'read',
  PDF: 'pdf',
  Audio: 'audiobook',
  Varta: 'varta',
  Sanchika: 'sanchika',
  TTS: 'mic',
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
  /** Recently-added catalogue books, shown as a drag/auto-scroll carousel in the empty
      state (a student who hasn't started reading anything yet). */
  recentBooks?: RecentBook[];
}

export function ContinueLearningRow({ books, isLoading, recentBooks = [] }: ContinueLearningRowProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Continue learning</h2>
        <Link
          href="/dashboard/student/personal-library"
          className="text-sm font-semibold text-bb-accent-ink hover:underline"
        >
          Go to library →
        </Link>
      </div>

      {isLoading && (
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex min-w-[300px] max-w-sm flex-1 gap-4 rounded-[18px] bg-bb-surface p-4 shadow-e1">
              <Skeleton className="h-[124px] w-[84px] rounded-[4px_12px_12px_4px]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="mt-4 h-1.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && books.length === 0 && recentBooks.length > 0 && (
        <div className="rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Fresh in the library</p>
              <p className="text-[13px] text-bb-muted">
                You haven&apos;t started reading yet. Here&apos;s what&apos;s new.
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href="/catalog">Browse library</Link>
            </Button>
          </div>
          <RecentBooksCarousel books={recentBooks} />
        </div>
      )}

      {!isLoading && books.length === 0 && recentBooks.length === 0 && (
        <EmptyState
          icon="library"
          title="Nothing in progress yet"
          description="Borrow a book from the library and it will show up here so you can pick up where you left off."
          action={
            <Button asChild>
              <Link href="/catalog">Browse library</Link>
            </Button>
          }
        />
      )}

      {!isLoading && books.length > 0 && (
        <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 scrollbar-hide">
          {books.map((book, idx) => (
            <article
              key={book.id}
              className="bb-lift flex min-w-[300px] max-w-sm flex-1 shrink-0 snap-start gap-4 rounded-[18px] bg-bb-surface p-4 shadow-e1"
            >
              <BookCover title={book.title} coverUrl={book.coverUrl} width={84} />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-bb-accent-ink">
                  {idx === 0 ? 'Resume now' : 'Last opened'}
                </p>
                <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug">{book.title}</h3>
                <p className="mt-0.5 truncate text-[13px] text-bb-muted">{book.author}</p>

                <div className="mt-3 flex items-center gap-2">
                  <Progress value={Math.min(book.progressPercent, 100)} className="h-1.5 flex-1" />
                  <span className="text-xs font-semibold tabular-nums text-bb-muted">
                    {Math.min(book.progressPercent, 100)}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-bb-muted">{book.progress}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {book.formats.map((fmt) => (
                    <Chip key={fmt} icon={FORMAT_ICON[fmt]}>
                      {fmt}
                    </Chip>
                  ))}
                </div>

                <Button asChild size="sm" className="mt-auto self-start">
                  <Link href={book.readerHref || '/reader'}>Resume reading</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Recent-books carousel ──────────────────────────────────────────────────
   A real scroll container (not a CSS-transform marquee, which can't be dragged):
   finger-swipe works natively on touch, and a pointer-drag handler adds
   click-and-drag on desktop. A gentle auto-advance keeps it alive but backs off the
   moment the user touches it, and is skipped entirely for reduced-motion. The list
   is duplicated so the auto-advance can loop seamlessly (reset by half the scroll
   width). Dragging past the halfway point wraps too. */
function RecentBooksCarousel({ books }: { books: RecentBook[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const interacting = useRef(false);

  const halfWidth = useCallback(() => (scrollRef.current?.scrollWidth ?? 0) / 2, []);

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
    interacting.current = true;
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
        className="flex cursor-grab touch-pan-x select-none gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      >
        {[...books, ...books].map((b, i) => (
          <Link
            key={`${b.id}-${i}`}
            href={`/catalog/${b.id}`}
            aria-label={b.title}
            // A drag that moved shouldn't also fire navigation on release.
            onClick={(e) => { if (drag.current.moved) e.preventDefault(); }}
            draggable={false}
            className="block w-[120px] shrink-0 rounded-lg focus-visible:outline-none focus-visible:shadow-focus"
          >
            <BookCover title={b.title} coverUrl={b.coverUrl} width={120} className="pointer-events-none" />
            <p className="mt-2 line-clamp-1 text-xs font-semibold">{b.title}</p>
            <p className="line-clamp-1 text-[11px] text-bb-muted">{b.author}</p>
          </Link>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-bb-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bb-surface to-transparent" />
    </div>
  );
}
