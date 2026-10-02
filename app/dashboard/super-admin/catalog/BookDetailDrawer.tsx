'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGlobalCatalogBook } from '@/lib/api/adminApi';
import { DeleteFormatDialog,type FormatFileTarget } from './DeleteFormatDialog';
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
Calendar,Globe,Building2,User,Hash,Languages,FileType2,
Layers,Shield,Loader2,ExternalLink,ImageIcon
} from '@/components/ui/icons';

const TIER_COLORS: Record<string, string> = {
  FREE: 'bg-bb-surface-2 text-bb-muted border-bb-border',
  BRONZE: 'bg-bb-accent-soft text-bb-accent-ink border-bb-accent/30',
  SILVER: 'bg-bb-surface-2 text-bb-muted border-bb-border',
  GOLD: 'bg-bb-warning-soft text-bb-warning-ink border-bb-warning/30',
  DIAMOND: 'bg-bb-info-soft text-bb-info-ink border-bb-info/30',
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
            <Loader2 className="h-8 w-8 text-bb-info-ink animate-spin" />
            <p className="text-sm text-muted-foreground">Loading details...</p>
          </div>
        ) : !book ? (
          <div className="p-6 text-center">
            <SheetHeader className="sr-only"><SheetTitle>Book details</SheetTitle></SheetHeader>
            <div className="inline-flex items-center justify-center h-16 w-16 mx-auto mb-4 bg-bb-surface-2 rounded-2xl">
              <BookOpen className="h-8 w-8 text-bb-faint" />
            </div>
            <p className="text-muted-foreground">
              {error ? 'Failed to load book details.' : 'Book not found.'}
            </p>
          </div>
        ) : (
          <>
            {/* Cover Header with Gradient */}
            <div className="relative bg-bb-progress p-6 pb-8 overflow-hidden">
              {/* Radiant shine overlay */}
              <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.2) 0%, transparent 50%)'}} />
              <SheetHeader>
                <SheetTitle className="text-white text-lg font-bold relative z-10">{book.title}</SheetTitle>
              </SheetHeader>
              <div className="flex gap-4 mt-4 relative z-10">
                {/* Front Cover with hover zoom */}
                <div className="w-28 h-40 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl bg-bb-surface/10 backdrop-blur-sm flex-shrink-0 group">
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
                  <div className="w-28 h-40 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl bg-bb-surface/10 backdrop-blur-sm flex-shrink-0 group">
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
                  ? 'bg-bb-info-soft text-bb-info-ink border-bb-info/30'
                  : 'bg-bb-surface-2 text-bb-muted border-bb-border'
                }>
                  <Globe className="h-3 w-3 mr-1" />{book.catalogScope}
                </Badge>
                {book.globalPublishStatus !== 'NONE' && (
                  <Badge variant="outline" className={
                    book.globalPublishStatus === 'APPROVED'
                      ? 'bg-bb-success-soft text-bb-success-ink border-bb-success/30'
                      : book.globalPublishStatus === 'PENDING'
                        ? 'bg-bb-warning-soft text-bb-warning-ink border-bb-warning/30'
                        : 'bg-bb-danger-soft text-bb-danger-ink border-bb-danger/30'
                  }>
                    {book.globalPublishStatus}
                  </Badge>
                )}
                {book.drmProtected && <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />DRM</Badge>}
              </div>

              {/* Description */}
              {book.description && (
                <div>
                  <h4 className="text-sm font-bold text-bb-text dark:text-white mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-bb-progress" />
                    Description
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{book.description}</p>
                </div>
              )}

              <Separator className="bg-bb-surface-2/60" />

              {/* Formats Section */}
              <div>
                <h4 className="text-sm font-bold text-bb-text dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-bb-success" />
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
                  <Separator className="bg-bb-surface-2/60" />
                  <div>
                    <h4 className="text-sm font-bold text-bb-text dark:text-white mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-bb-progress" />
                      <ImageIcon className="h-4 w-4" /> Free Sample
                    </h4>
                    <a href={book.sampleFileUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-bb-info-ink hover:text-bb-info-ink transition-colors font-medium px-3 py-2 rounded-lg hover:bg-bb-info-soft">
                      <ExternalLink className="h-4 w-4" /> View Sample PDF
                    </a>
                  </div>
                </>
              )}

              {/* Categories */}
              {book.categories && book.categories.length > 0 && (
                <>
                  <Separator className="bg-bb-surface-2/60" />
                  <div>
                    <h4 className="text-sm font-bold text-bb-text dark:text-white mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-bb-progress" />
                      Genres / Categories
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {book.categories.map((c: any) => (
                        <Badge key={c.category.id} variant="outline" className="text-xs rounded-lg bg-bb-surface-2 border-bb-border">
                          {c.category.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator className="bg-bb-surface-2/60" />

              {/* Metadata Footer */}
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground bg-bb-surface-2/50 rounded-xl p-4 border border-bb-border/60">
                <div><span className="font-semibold text-bb-muted">Created:</span> {formatDate(book.createdAt)}</div>
                <div><span className="font-semibold text-bb-muted">Updated:</span> {formatDate(book.updatedAt)}</div>
                <div><span className="font-semibold text-bb-muted">AI Embed:</span> {book.embeddingStatus}</div>
                <div><span className="font-semibold text-bb-muted">License:</span> {book.licenseType}</div>
                <div className="col-span-2"><span className="font-semibold text-bb-muted">ID:</span> <span className="font-mono text-[10px]">{book.id}</span></div>
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
