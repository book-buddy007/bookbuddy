'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGlobalCatalogBook } from '@/lib/api/adminApi';
import { DeleteFormatDialog, type FormatFileTarget } from './DeleteFormatDialog';
import { FormatFileList } from './FormatFileList';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  Calendar, Globe, Building2, User, Hash, Languages, FileType2,
  Layers, Shield, Loader2, ExternalLink, ImageIcon, Sparkles,
} from '@/components/ui/icons';

const TIER_COLORS: Record<string, string> = {
  FREE: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  BRONZE: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800',
  SILVER: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  GOLD: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800',
  DIAMOND: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800',
};

function fixR2Url(url: string | null | undefined) {
  if (!url) return '';
  // Fix for bad Cloudflare R2 URLs that were saved with the account ID domain instead of the correct public dev domain
  return url.replace(
    'pub-cb3fb52a644b4703e0bbf95d460bcd17.r2.dev',
    'pub-1a1b99fd80bc4295aa0b7a3823081c6f.r2.dev'
  );
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

interface BookDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string | null;
}

export function BookDetailDrawer({ open, onOpenChange, bookId }: BookDetailDrawerProps) {
  const { data: book, isLoading, error } = useQuery({
    queryKey: ['catalog', 'book-detail', bookId],
    queryFn: async () => {
      if (!bookId) return null;
      const res = await getGlobalCatalogBook(bookId);
      return res.success ? res.data : null;
    },
    enabled: !!bookId && open,
  });

  const [deleteTarget, setDeleteTarget] = useState<FormatFileTarget | null>(null);

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto p-0 border-l-slate-200/60 dark:border-l-slate-700/40">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <SheetHeader className="sr-only"><SheetTitle>Loading book details</SheetTitle></SheetHeader>
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading details...</p>
          </div>
        ) : !book ? (
          <div className="p-6 text-center">
            <SheetHeader className="sr-only"><SheetTitle>Book details</SheetTitle></SheetHeader>
            <div className="inline-flex items-center justify-center h-16 w-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-muted-foreground">
              {error ? 'Failed to load book details.' : 'Book not found.'}
            </p>
          </div>
        ) : (
          <>
            {/* Cover Header with Gradient */}
            <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-6 pb-8 overflow-hidden">
              {/* Radiant shine overlay */}
              <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.2) 0%, transparent 50%)'}} />
              <SheetHeader>
                <SheetTitle className="text-white text-lg font-bold relative z-10">{book.title}</SheetTitle>
              </SheetHeader>
              <div className="flex gap-4 mt-4 relative z-10">
                {/* Front Cover with hover zoom */}
                <div className="w-28 h-40 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl bg-white/10 backdrop-blur-sm flex-shrink-0 group">
                  {book.coverUrl ? (
                    <img
                      src={fixR2Url(book.coverUrl)}
                      alt="Front Cover"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen className="h-10 w-10 text-white/40" />
                    </div>
                  )}
                </div>
                {/* Back Cover with hover zoom */}
                {book.backCoverUrl && (
                  <div className="w-28 h-40 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl bg-white/10 backdrop-blur-sm flex-shrink-0 group">
                    <img
                      src={fixR2Url(book.backCoverUrl)}
                      alt="Back Cover"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                )}
                {/* Quick Info */}
                <div className="flex flex-col gap-2 text-white/90 text-sm min-w-0">
                  <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{book.author}</span></div>
                  {book.publisher && <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{book.publisher}</span></div>}
                  {book.isbn && <div className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 flex-shrink-0" /><span className="font-mono text-xs">{book.isbn}</span></div>}
                  {book.language && <div className="flex items-center gap-1.5"><Languages className="h-3.5 w-3.5 flex-shrink-0" /><span>{book.language}</span></div>}
                  {book.publishYear && <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 flex-shrink-0" /><span>{book.publishYear}</span></div>}
                  {book.pages && <div className="flex items-center gap-1.5"><FileType2 className="h-3.5 w-3.5 flex-shrink-0" /><span>{book.pages} pages</span></div>}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={TIER_COLORS[book.accessTier] || TIER_COLORS.FREE}>
                  {book.accessTier}
                </Badge>
                <Badge variant="outline" className={book.catalogScope === 'GLOBAL'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800'
                  : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }>
                  <Globe className="h-3 w-3 mr-1" />{book.catalogScope}
                </Badge>
                {book.globalPublishStatus !== 'NONE' && (
                  <Badge variant="outline" className={
                    book.globalPublishStatus === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                      : book.globalPublishStatus === 'PENDING'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800'
                  }>
                    {book.globalPublishStatus}
                  </Badge>
                )}
                {book.drmProtected && <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />DRM</Badge>}
              </div>

              {/* Description */}
              {book.description && (
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
                    Description
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{book.description}</p>
                </div>
              )}

              <Separator className="bg-slate-200/60 dark:bg-slate-700/40" />

              {/* Formats Section */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-gradient-to-b from-teal-500 to-emerald-500" />
                  <Layers className="h-4 w-4" /> Available Formats
                </h4>
                <FormatFileList
                  formats={book.bookFormats ?? []}
                  bookId={book.id}
                  bookTitle={book.title}
                  onRequestDelete={setDeleteTarget}
                />
              </div>

              {/* Sample Preview */}
              {book.sampleFileUrl && (
                <>
                  <Separator className="bg-slate-200/60 dark:bg-slate-700/40" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-gradient-to-b from-saffron-500 to-amber-500" style={{ background: 'linear-gradient(to bottom, #f59e0b, #d97706)' }} />
                      <ImageIcon className="h-4 w-4" /> Free Sample
                    </h4>
                    <a href={book.sampleFileUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20">
                      <ExternalLink className="h-4 w-4" /> View Sample PDF
                    </a>
                  </div>
                </>
              )}

              {/* Categories */}
              {book.categories && book.categories.length > 0 && (
                <>
                  <Separator className="bg-slate-200/60 dark:bg-slate-700/40" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-gradient-to-b from-fuchsia-500 to-pink-500" />
                      Genres / Categories
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {book.categories.map((c: any) => (
                        <Badge key={c.category.id} variant="outline" className="text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          {c.category.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator className="bg-slate-200/60 dark:bg-slate-700/40" />

              {/* Metadata Footer */}
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground bg-slate-50/50 dark:bg-slate-800/20 rounded-xl p-4 border border-slate-200/60 dark:border-slate-700/40">
                <div><span className="font-semibold text-slate-600 dark:text-slate-400">Created:</span> {formatDate(book.createdAt)}</div>
                <div><span className="font-semibold text-slate-600 dark:text-slate-400">Updated:</span> {formatDate(book.updatedAt)}</div>
                <div><span className="font-semibold text-slate-600 dark:text-slate-400">AI Embed:</span> {book.embeddingStatus}</div>
                <div><span className="font-semibold text-slate-600 dark:text-slate-400">License:</span> {book.licenseType}</div>
                <div className="col-span-2"><span className="font-semibold text-slate-600 dark:text-slate-400">ID:</span> <span className="font-mono text-[10px]">{book.id}</span></div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>

    {/* Sibling of the Sheet, not a child: two nested Radix portals fight over
        the focus trap, and the loser is the confirmation input. */}
    <DeleteFormatDialog
      open={!!deleteTarget}
      onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
      target={deleteTarget}
    />
    </>
  );
}
