'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import apiClient from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type BBIconName } from '@/components/ui/icon';
import { BookCover } from '@/components/ui/book-cover';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { CatalogBook, AccessTier, BookFormatType } from '@/types/catalog';
import { getReaderRoute, isFreeBook, hasAudio, hasAiEmbed } from '@/types/catalog';

const TIER_CHIP: Record<AccessTier, string> = {
  FREE: 'bg-bb-success-soft text-bb-success-ink',
  BRONZE: 'bg-bb-accent-soft text-bb-accent-ink',
  SILVER: 'bg-bb-surface-2 text-bb-text',
  GOLD: 'bg-bb-warning-soft text-bb-warning-ink',
  DIAMOND: 'bg-bb-info-soft text-bb-info-ink',
};

const FORMAT_META: Record<BookFormatType, { label: string; icon: BBIconName }> = {
  EPUB: { label: 'eBook', icon: 'read' },
  PDF: { label: 'PDF', icon: 'pdf' },
  AUDIOBOOK: { label: 'Audiobook', icon: 'audiobook' },
  AI_EMBED: { label: 'Varta enabled', icon: 'varta' },
};

const titleCase = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [book, setBook] = useState<CatalogBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [borrowing, setBorrowing] = useState(false);
  const [borrowSuccess, setBorrowSuccess] = useState<string | null>(null);
  const [borrowError, setBorrowError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // apiClient so proxy cookies and interceptors apply.
        // Backend route is /books/:id (there is no public /catalog/:id route).
        const response = await apiClient.get(`/books/${params.id}`);
        const data = response.data;

        const mapped: CatalogBook = {
          id: String(data.id),
          title: data.title ?? 'Untitled',
          author: data.author ?? 'Unknown Author',
          isbn: data.isbn ?? 'N/A',
          coverUrl: data.coverUrl ?? null,
          backCoverUrl: data.backCoverUrl ?? null,
          description: data.description ?? null,
          publisher: data.publisher ?? null,
          publishYear: data.publishYear ?? null,
          pages: data.pages ?? null,
          language: data.language ?? null,
          genre: Array.isArray(data.categories)
            ? data.categories
                .map((c: any) => c.category?.name)
                .filter((name: any): name is string => typeof name === 'string')
            : [],
          accessTier: (data.accessTier as AccessTier) ?? 'FREE',
          // Distinct types only — a book has many AI_EMBED rows (one per chapter),
          // so the Set stops the format list (and its React key) from duplicating.
          formats: Array.isArray(data.bookFormats)
            ? [...new Set<BookFormatType>(data.bookFormats.map((f: any) => f.type as BookFormatType).filter(Boolean))]
            : [],
          bookFormats: Array.isArray(data.bookFormats)
            ? data.bookFormats.map((f: any) => ({
                type: f.type as BookFormatType,
                fileUrl: f.fileUrl ?? undefined,
                fileSize: f.fileSize ?? undefined,
                metadata: f.metadata ?? undefined,
              }))
            : [],
          available: (data.availableCopies ?? 1) > 0,
          rating: null,
        };

        setBook(mapped);
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 401) setError('auth');
          else if (status === 404) setError('not_found');
          else setError('generic');

          if (process.env.NODE_ENV === 'development') {
            console.error(`[BookDetail] ${status} for /catalog/${params.id}:`, error.message);
          }
        } else {
          setError('generic');
          console.error('Error fetching book details:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchBookDetails();
    }
  }, [params.id]);

  // Signed-out visitors are sent to login (in an effect, not during render).
  useEffect(() => {
    if (error === 'auth') router.push('/login');
  }, [error, router]);

  const handleBorrow = async () => {
    if (!book) return;
    setBorrowing(true);
    try {
      const response = await fetch(`/api/books/${book.id}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to borrow book');

      setBook((prev) => (prev ? { ...prev, available: false } : null));
      setBorrowSuccess(`You borrowed "${book.title}". Find it in My Library.`);
      setTimeout(() => setBorrowSuccess(null), 4000);
    } catch (error) {
      console.error('Error borrowing book:', error);
      setBorrowError('Failed to borrow book. Please try again.');
      setTimeout(() => setBorrowError(null), 4000);
    } finally {
      setBorrowing(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">{children}</div>
  );

  if (loading || error === 'auth') {
    return shell(
      <div aria-busy="true" aria-label="Loading book" className="animate-pulse">
        <div className="h-5 w-32 rounded-full bg-bb-surface-2" />
        <div className="mt-6 flex flex-col gap-8 rounded-bb-xl bg-bb-surface p-6 shadow-e1 md:flex-row md:p-10">
          <div className="mx-auto aspect-[84/124] w-[220px] shrink-0 rounded-[4px_12px_12px_4px] bg-bb-surface-2 md:mx-0 md:w-[260px]" />
          <div className="flex-1 space-y-4">
            <div className="h-9 w-3/4 rounded-full bg-bb-surface-2" />
            <div className="h-5 w-1/3 rounded-full bg-bb-surface-2" />
            <div className="flex gap-2 pt-2">
              <div className="h-7 w-20 rounded-lg bg-bb-surface-2" />
              <div className="h-7 w-24 rounded-lg bg-bb-surface-2" />
            </div>
            <div className="space-y-3 pt-6">
              <div className="h-4 w-full rounded-full bg-bb-surface-2" />
              <div className="h-4 w-full rounded-full bg-bb-surface-2" />
              <div className="h-4 w-2/3 rounded-full bg-bb-surface-2" />
            </div>
          </div>
        </div>
      </div>,
    );
  }

  if (error === 'generic') {
    return shell(
      <EmptyState
        icon="alert-circle"
        title="Couldn't load this book"
        description="Something went wrong fetching the details. Check your connection and try again."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              <Icon name="arrow-left" fillLayer={false} />
              Go back
            </Button>
            <Button onClick={() => window.location.reload()}>
              <Icon name="rotate-cw" fillLayer={false} />
              Retry
            </Button>
          </div>
        }
      />,
    );
  }

  if (!book) {
    return shell(
      <EmptyState
        icon="library"
        title="Book not found"
        description="It may have been removed, or the link is wrong."
        action={
          <Button asChild>
            <Link href="/catalog">Browse the library</Link>
          </Button>
        }
      />,
    );
  }

  const meta = [
    book.isbn && book.isbn !== 'N/A' ? { k: 'ISBN', v: book.isbn } : null,
    book.publisher ? { k: 'Publisher', v: book.publisher } : null,
    book.publishYear ? { k: 'Published', v: String(book.publishYear) } : null,
    book.pages ? { k: 'Pages', v: String(book.pages) } : null,
    book.language ? { k: 'Language', v: book.language } : null,
  ].filter((m): m is { k: string; v: string } => m !== null);

  const free = isFreeBook(book);

  return shell(
    <>
      <Link
        href="/catalog"
        className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-bb-muted hover:text-bb-text focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Icon name="arrow-left" size={16} fillLayer={false} />
        Back to library
      </Link>

      <div className="mt-4 space-y-3" aria-live="polite">
        {borrowSuccess && (
          <Alert variant="success">
            <Icon name="check-circle" fillLayer={false} />
            <AlertTitle>Borrowed</AlertTitle>
            <AlertDescription>{borrowSuccess}</AlertDescription>
          </Alert>
        )}
        {borrowError && (
          <Alert variant="destructive">
            <Icon name="alert-circle" fillLayer={false} />
            <AlertTitle>Couldn&apos;t borrow</AlertTitle>
            <AlertDescription>{borrowError}</AlertDescription>
          </Alert>
        )}
      </div>

      <article className="mt-4 space-y-5">
      <Card variant="stage" className="flex flex-col gap-8 rounded-[28px] p-6 md:flex-row md:gap-12 md:p-10">
        <div className="relative mx-auto shrink-0 md:mx-0">
          <BookCover title={book.title} subject={book.genre[0]} coverUrl={book.coverUrl} width={260} className="max-md:!w-[220px] max-md:!h-[325px]" />
          <span className={cn('absolute left-3 top-3 inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-bold uppercase tracking-[0.06em] shadow-e1', TIER_CHIP[book.accessTier] ?? TIER_CHIP.FREE)}>
            {!free && <Icon name="lock" size={12} fillLayer={false} />}
            {titleCase(book.accessTier)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-[#F2F4F8] lg:text-[38px]">
            {book.title}
          </h1>
          <p className="mt-2 text-lg text-[#A9B4D0]">
            by <span className="font-semibold text-[#F2F4F8]">{book.author}</span>
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <StatusBadge status={book.available ? 'returned' : 'reserved'} label={book.available ? 'Available' : 'All copies on loan'} />
            {book.formats.map((fmt) => (
              <span key={fmt} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 text-[13px] font-semibold text-[#F2F4F8]">
                <Icon name={FORMAT_META[fmt]?.icon ?? 'read'} size={14} />
                {FORMAT_META[fmt]?.label ?? fmt}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            {free ? (
              <>
                {book.formats.includes('EPUB') && (
                  <Button size="lg" onClick={() => router.push(getReaderRoute(book.id, 'EPUB'))}>
                    <Icon name="read" fillLayer={false} />
                    Read eBook
                  </Button>
                )}
                {book.formats.includes('PDF') && (
                  <Button size="lg" variant={book.formats.includes('EPUB') ? 'soft' : 'default'} onClick={() => router.push(getReaderRoute(book.id, 'PDF'))}>
                    <Icon name="pdf" fillLayer={false} />
                    Read PDF
                  </Button>
                )}
                {hasAudio(book) && (
                  <Button size="lg" variant="soft" onClick={() => router.push(getReaderRoute(book.id, 'AUDIOBOOK'))}>
                    <Icon name="audiobook" fillLayer={false} />
                    Listen
                  </Button>
                )}
                {hasAiEmbed(book) && (
                  <Button size="lg" variant="cobalt" onClick={() => router.push(getReaderRoute(book.id, 'AI_EMBED'))}>
                    <Icon name="varta" fillLayer={false} />
                    Ask Varta
                  </Button>
                )}
                {book.formats.length === 0 && (
                  <p className="text-sm text-[#A9B4D0]">No digital edition has been uploaded for this title yet.</p>
                )}
              </>
            ) : book.available ? (
              <Button size="lg" onClick={handleBorrow} disabled={borrowing}>
                {borrowing ? <Icon name="loader" fillLayer={false} className="animate-spin" /> : <Icon name="library" fillLayer={false} />}
                {borrowing ? 'Borrowing…' : 'Borrow book'}
              </Button>
            ) : (
              <Button size="lg" disabled>
                <Icon name="overdue" fillLayer={false} />
                All copies on loan
              </Button>
            )}
          </div>

          {!free && (
            <p className="mt-4 text-[13px] text-[#A9B4D0]">
              {titleCase(book.accessTier)} title.{' '}
              <Link href="/subscription/compare" className="font-semibold text-[#FF8A3D] hover:underline">
                Compare plans
              </Link>
            </p>
          )}
        </div>
      </Card>
      <section className="rounded-bb-card bg-bb-surface p-6 shadow-e1 md:p-8">
          {meta.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-bb-lg bg-bb-surface-2 p-5 text-sm sm:grid-cols-3">
              {meta.map((m) => (
                <div key={m.k} className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-bb-faint">{m.k}</dt>
                  <dd className="mt-1 truncate font-medium text-bb-text">{m.v}</dd>
                </div>
              ))}
            </dl>
          )}

          {book.genre.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Categories">
              {book.genre.map((g) => (
                <li key={g} className="rounded-full bg-bb-accent-soft px-3 py-1 text-xs font-semibold text-bb-accent-ink">{g}</li>
              ))}
            </ul>
          )}

          {book.description && (
            <section className="mt-6">
              <h2 className="font-display text-lg font-bold text-bb-text">About this book</h2>
              <p className="mt-2 whitespace-pre-line font-reading text-[16px] leading-relaxed text-bb-muted">{book.description}</p>
            </section>
          )}

      </section>
      </article>
    </>,
  );
}
