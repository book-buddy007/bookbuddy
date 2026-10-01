'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Headphones, ChevronLeft, Library, MessageCircle, Lock, AlertCircle, RefreshCcw } from "@/components/ui/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import apiClient from '@/lib/apiClient';
import axios from 'axios';
import type { CatalogBook, AccessTier, BookFormatType } from '@/types/catalog';
import {
  getReaderRoute,
  getPrimaryReadFormat,
  isFreeBook,
  hasReader,
  hasAudio,
  hasAiEmbed,
  TIER_STYLES,
  FORMAT_LABELS,
} from '@/types/catalog';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [book, setBook] = useState<CatalogBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [borrowSuccess, setBorrowSuccess] = useState<string | null>(null);
  const [borrowError, setBorrowError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use apiClient to ensure proxy cookies and interceptors are triggered.
        // Backend route is /books/:id (there is no public /catalog/:id route).
        const response = await apiClient.get(`/books/${params.id}`);
        const data = response.data;

        // Map API response to CatalogBook shape
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
          // so the Set stops the badge list (and its React key={fmt}) from duplicating.
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
          
          if (status === 401) {
            setError('auth');
          } else if (status === 404) {
            setError('not_found');
          } else {
            setError('generic');
          }

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

  const handleBorrow = async () => {
    if (!book) return;

    try {
      const response = await fetch(`/api/books/${book.id}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to borrow book');

      setBook(prev => prev ? { ...prev, available: false } : null);
      setBorrowSuccess(`Successfully borrowed "${book.title}"`);
      setTimeout(() => setBorrowSuccess(null), 3000);
    } catch (error) {
      console.error('Error borrowing book:', error);
      setBorrowError('Failed to borrow book. Please try again.');
      setTimeout(() => setBorrowError(null), 3000);
    }
  };

  // ── Loading State ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-950 dark:via-indigo-950/20 dark:to-purple-950/10 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-8"></div>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3">
                <div className="bg-slate-200 dark:bg-slate-800 rounded-xl aspect-[2/3]"></div>
              </div>
              <div className="w-full md:w-2/3 space-y-4">
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                <div className="flex gap-2 mt-4">
                  <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                  <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                </div>
                <div className="space-y-3 mt-8">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────

  if (error === 'auth') {
    router.push('/login');
    return null;
  }

  if (error === 'not_found' || (!book && error)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-950 dark:via-indigo-950/20 dark:to-purple-950/10 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-10 text-center flex flex-col items-center">
            <BookOpen className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-6" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Book Not Found</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md">We couldn't find the book you were looking for. It may have been removed or the URL might be incorrect.</p>
            <Button onClick={() => router.push('/catalog')} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Library className="w-4 h-4 mr-2" /> Browse Library
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error === 'generic') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-950 dark:via-indigo-950/20 dark:to-purple-950/10 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-10 text-center flex flex-col items-center">
            <AlertCircle className="h-16 w-16 text-red-500/80 mb-6" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Connection Failed</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md">We encountered an issue while retrieving this book's details. Please try again.</p>
            <div className="flex items-center gap-3">
              <Button onClick={() => router.back()} variant="outline" className="border-slate-300 dark:border-slate-700">
                <ChevronLeft className="w-4 h-4 mr-2" /> Go Back
              </Button>
              <Button 
                onClick={() => {
                   setError(null);
                   setLoading(true);
                   window.location.reload();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <RefreshCcw className="w-4 h-4 mr-2" /> Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const tierStyle = TIER_STYLES[book.accessTier] ?? TIER_STYLES.FREE;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-950 dark:via-indigo-950/20 dark:to-purple-950/10 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/catalog')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Library
        </button>

        {/* Alerts */}
        {borrowSuccess && (
          <Alert className="mb-6 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
            <AlertTitle className="text-emerald-800 dark:text-emerald-300">Success</AlertTitle>
            <AlertDescription className="text-emerald-700 dark:text-emerald-400">{borrowSuccess}</AlertDescription>
          </Alert>
        )}
        {borrowError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{borrowError}</AlertDescription>
          </Alert>
        )}

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800 overflow-hidden">
          <div className="p-6 md:p-10">
            <div className="flex flex-col md:flex-row gap-8 lg:gap-12">

              {/* ── Cover Image ────────────────────────────────────────── */}
              <div className="w-full md:w-[280px] lg:w-[320px] flex-shrink-0">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-lg">
                  {book.coverUrl && !imageError ? (
                    <Image
                      src={book.coverUrl}
                      alt={`${book.title} cover`}
                      fill
                      className="object-cover"
                      onError={() => setImageError(true)}
                      priority
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-700 flex flex-col items-center justify-center p-8 text-center">
                      <BookOpen className="h-16 w-16 text-white/80 mb-4" />
                      <p className="text-white/90 font-bold text-lg leading-tight">{book.title}</p>
                      <p className="text-white/60 text-sm mt-2">{book.author}</p>
                    </div>
                  )}

                  {/* Tier Badge on Cover */}
                  <Badge className={`absolute top-3 left-3 ${tierStyle} text-xs font-bold uppercase tracking-wider shadow-md`}>
                    {book.accessTier === 'FREE' ? '✨ Free' : `🔒 ${book.accessTier}`}
                  </Badge>
                </div>
              </div>

              {/* ── Book Info ──────────────────────────────────────────── */}
              <div className="flex-1 min-w-0">
                {/* Title & Author */}
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                  {book.title}
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 mb-5">
                  by <span className="font-medium text-slate-700 dark:text-slate-300">{book.author}</span>
                </p>

                {/* Tier + Availability Row */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <Badge className={`${tierStyle} text-sm font-semibold px-3 py-1`}>
                    {book.accessTier} Tier
                  </Badge>
                  <Badge className={book.available
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }>
                    {book.available ? "✅ Available" : "📕 Borrowed"}
                  </Badge>
                </div>

                {/* Format Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {(book.formats.length > 0 ? book.formats : ['PDF' as BookFormatType]).map((fmt) => (
                    <Badge
                      key={fmt}
                      variant="outline"
                      className="text-sm font-medium px-3 py-1 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      {FORMAT_LABELS[fmt] ?? fmt}
                    </Badge>
                  ))}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 mb-8 text-sm">
                  {book.isbn && book.isbn !== 'N/A' && (
                    <div>
                      <dt className="text-slate-500 dark:text-slate-500 font-medium">ISBN</dt>
                      <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{book.isbn}</dd>
                    </div>
                  )}
                  {book.publisher && (
                    <div>
                      <dt className="text-slate-500 dark:text-slate-500 font-medium">Publisher</dt>
                      <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{book.publisher}</dd>
                    </div>
                  )}
                  {book.publishYear && (
                    <div>
                      <dt className="text-slate-500 dark:text-slate-500 font-medium">Published</dt>
                      <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{book.publishYear}</dd>
                    </div>
                  )}
                  {book.pages && (
                    <div>
                      <dt className="text-slate-500 dark:text-slate-500 font-medium">Pages</dt>
                      <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{book.pages}</dd>
                    </div>
                  )}
                  {book.language && (
                    <div>
                      <dt className="text-slate-500 dark:text-slate-500 font-medium">Language</dt>
                      <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{book.language}</dd>
                    </div>
                  )}
                </div>

                {/* Categories */}
                {book.genre.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-500 mb-2">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {book.genre.map((g) => (
                        <Badge key={g} variant="secondary" className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {book.description && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Description</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">{book.description}</p>
                  </div>
                )}

                {/* ── Action Buttons ───────────────────────────────────── */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {isFreeBook(book) ? (
                    <>
                      {/* FREE TIER: Direct access buttons */}
                      {book.formats.includes('EPUB') && (
                        <Button
                          size="lg"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                          onClick={() => {
                            router.push(getReaderRoute(book.id, 'EPUB'));
                          }}
                        >
                          <BookOpen className="w-5 h-5 mr-2" />
                          Read EPUB
                        </Button>
                      )}
                      {book.formats.includes('PDF') && (
                        <Button
                          size="lg"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md opacity-90"
                          onClick={() => {
                            router.push(getReaderRoute(book.id, 'PDF'));
                          }}
                        >
                          <BookOpen className="w-5 h-5 mr-2" />
                          Read PDF
                        </Button>
                      )}
                      {hasAudio(book) && (
                        <Button
                          size="lg"
                          className="bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                          onClick={() => router.push(getReaderRoute(book.id, 'AUDIOBOOK'))}
                        >
                          <Headphones className="w-5 h-5 mr-2" />
                          Listen Free
                        </Button>
                      )}
                      {hasAiEmbed(book) && (
                        <Button
                          size="lg"
                          className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-md"
                          onClick={() => router.push(getReaderRoute(book.id, 'AI_EMBED'))}
                        >
                          <MessageCircle className="w-5 h-5 mr-2" />
                          Chat with Book
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* PAID TIER: Borrow or locked state */}
                      {book.available ? (
                        <Button
                          size="lg"
                          className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white shadow-md"
                          onClick={handleBorrow}
                        >
                          <Library className="w-5 h-5 mr-2" />
                          Borrow Book
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          variant="outline"
                          className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                          disabled
                        >
                          <Lock className="w-5 h-5 mr-2" />
                          Requires {book.accessTier} Tier
                        </Button>
                      )}
                    </>
                  )}

                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => router.push('/catalog')}
                    className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Back to Library
                  </Button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}