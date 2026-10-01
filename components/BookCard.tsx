import { Badge } from "@/components/ui/badge";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { BookOpen, Headphones, Star, Library, Eye, Clock, Play, MessageCircle } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { CatalogBook } from '@/types/catalog';
import { getReaderRoute, hasReader, hasAudio, hasAiEmbed, isFreeBook } from '@/types/catalog';

// Re-export CatalogBook as Book for backward compatibility with any remaining imports
export type { CatalogBook as Book } from '@/types/catalog';

interface BookCardProps {
  book: CatalogBook;
  onRead: (book: CatalogBook, format?: 'EPUB' | 'PDF') => void;
  onListen: (book: CatalogBook) => void;
  onBorrow: (book: CatalogBook) => void;
  onView: (book: CatalogBook) => void;
  onTalkToBook?: (book: CatalogBook) => void;
  isPersonalLibrary?: boolean;
  priority?: boolean;
}

// Deterministic gradient based on book title for placeholder covers
const COVER_GRADIENTS = [
  "from-indigo-600 via-indigo-700 to-purple-800",
  "from-purple-600 via-purple-700 to-pink-800",
  "from-blue-600 via-indigo-700 to-indigo-800",
  "from-amber-600 via-orange-700 to-red-800",
  "from-emerald-600 via-teal-700 to-cyan-800",
  "from-rose-600 via-pink-700 to-purple-800",
  "from-cyan-600 via-blue-700 to-indigo-800",
  "from-violet-600 via-purple-700 to-indigo-800",
];

function getGradientForTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length];
}

function StarRating({ rating }: { rating?: number | null }) {
  if (rating === undefined || rating === null) {
    return (
      <div className="flex items-center gap-0.5">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">No rating</span>
      </div>
    );
  }

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.3;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
      ))}
      {hasHalfStar && (
        <div className="relative w-3.5 h-3.5">
          <Star className="absolute inset-0 w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          </div>
        </div>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{rating.toFixed(1)}</span>
    </div>
  );
}

export function BookCard({
  book,
  onRead,
  onListen,
  onBorrow,
  onView,
  onTalkToBook,
  isPersonalLibrary = false,
  priority = false,
}: BookCardProps) {
  const [imgError, setImgError] = useState(false);

  const getFormatLabel = (format: string) => {
    switch (format.toUpperCase()) {
      case 'EBOOK':
      case 'EPUB':
        return { label: 'eBook', icon: BookOpen, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' };
      case 'PDF':
        return { label: 'PDF', icon: BookOpen, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
      case 'AUDIOBOOK':
        return { label: 'Audiobook', icon: Headphones, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' };
      case 'AI_EMBED':
        return { label: 'Varta Enabled', icon: MessageCircle, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' };
      case 'PHYSICAL':
        return { label: 'Physical', icon: Library, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
      default:
        return { label: format, icon: BookOpen, color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300' };
    }
  };

  const isDigitalFormat = hasReader(book) || hasAudio(book);

  const showAccessButtons = isPersonalLibrary || !book.available;
  const hasValidCover = book.coverUrl && !book.coverUrl.includes('placeholder') && !imgError;
  const gradient = getGradientForTitle(book.title);

  return (
    <div
      className="group relative flex flex-col h-full rounded-xl border border-indigo-200/40 dark:border-indigo-900/30 bg-white dark:bg-slate-900 shadow-sm hover-lift active:scale-[0.98] active:transition-none transition-colors duration-200 overflow-hidden cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2"
      onClick={() => onView(book)}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onView(book); }}
      aria-label={`${book.title} by ${book.author}`}
    >
      {/* Tier Badge */}
      <div className="absolute top-2.5 left-2.5 z-20">
        {book.accessTier && (
          <Badge className={cn(
            "text-[10px] font-extrabold shadow-md backdrop-blur-md uppercase tracking-widest border-transparent px-2.5 py-0.5",
            book.accessTier.toUpperCase() === 'FREE' 
              ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white" 
              : "bg-gradient-to-r from-amber-400 to-yellow-600 text-white"
          )}>
            {book.accessTier}
          </Badge>
        )}
      </div>

      {/* Cover Image Area */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {hasValidCover ? (
          <Image
            src={book.coverUrl as string}
            alt={`Book cover of ${book.title} by ${book.author}`}
            fill
            priority={priority}
            loading={priority ? undefined : "lazy"}
            onError={() => setImgError(true)}
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          /* Gradient Placeholder Cover */
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br flex flex-col items-center justify-center p-6 text-center",
            gradient
          )}>
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl" />
              <BookOpen className="relative h-12 w-12 text-white/90 drop-shadow-lg" />
            </div>
            <p className="text-white/95 font-bold text-sm leading-tight line-clamp-3 drop-shadow-md">{book.title}</p>
            <p className="text-white/70 text-xs mt-1.5 font-medium">{book.author}</p>
          </div>
        )}

        {/* Availability Badge */}
        <div className="absolute top-2.5 right-2.5">
          <Badge className={cn(
            "text-xs font-semibold shadow-md backdrop-blur-sm",
            book.available
              ? "bg-emerald-500/90 text-white hover:bg-emerald-600/90"
              : "bg-amber-500/90 text-white hover:bg-amber-600/90"
          )}>
            {book.available ? "Available" : "Borrowed"}
          </Badge>
        </div>

        {/* Quick View — Desktop hover overlay (hidden on touch/stylus devices) */}
        <div className="hidden-on-touch absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 items-end justify-center pb-4 z-10">
          <EnhancedButton
            size="sm"
            className="!bg-white/90 !text-indigo-700 hover:!bg-white shadow-lg backdrop-blur-sm border-transparent"
            onClick={(e) => { e.stopPropagation(); onView(book); }}
          >
            <Eye className="h-4 w-4 mr-1.5" /> Quick View
          </EnhancedButton>
        </div>

        {/* Quick View — Touch fallback: always-visible icon button (visible on touch/stylus) */}
        <button
          className="visible-on-touch absolute bottom-3 left-3 z-10 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm items-center justify-center transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label={`Quick view: ${book.title}`}
          onClick={(e) => { e.stopPropagation(); onView(book); }}
        >
          <Eye className="h-4 w-4 text-white" />
        </button>

        {/* Play Button Overlay (For Audiobooks) */}
        {hasAudio(book) && book.available && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none">
            <button
              className="h-16 w-16 rounded-full bg-indigo-600/90 hover:bg-indigo-600 backdrop-blur-md text-white flex items-center justify-center shadow-xl shadow-indigo-900/50 hover:scale-110 transition-all cursor-pointer pointer-events-auto border-2 border-white/20 ring-4 ring-black/10 group/play"
              onClick={(e) => { e.stopPropagation(); onListen(book); }}
              aria-label={`Play ${book.title}`}
            >
              <Play className="h-7 w-7 ml-1 drop-shadow-md group-hover/play:scale-110 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex flex-col flex-grow p-4 space-y-2.5">
        {/* Title */}
        <h3 className="font-bold text-sm leading-tight line-clamp-2 text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-300">
          {book.title}
        </h3>

        {/* Author */}
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{book.author}</p>

        {/* Rating */}
        <StarRating rating={book.rating} />

        {/* Format + Genre Badges */}
        <div className="flex flex-wrap gap-1.5">
          {(book.formats && book.formats.length > 0 ? book.formats : ['PDF']).map((fmt, idx) => {
            const fmtInfo = getFormatLabel(fmt);
            return (
              <Badge key={`${fmt}-${idx}`} className={cn("text-[10px] font-semibold", fmtInfo.color)}>
                {fmtInfo.label}
              </Badge>
            );
          })}
          {(book.genre ?? []).slice(0, 2).map((g) => (
            <Badge key={g} variant="outline" className="text-[10px] border-indigo-200/60 dark:border-indigo-800/60 text-slate-600 dark:text-slate-400">
              {g}
            </Badge>
          ))}
        </div>

        {/* Expiry Info */}
        {isDigitalFormat && book.expiresAt && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            <Clock className="h-3 w-3" />
            Expires: {new Date(book.expiresAt).toLocaleDateString()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
          {isFreeBook(book) ? (
            <>
              {book.formats?.includes('EPUB') && (
                <EnhancedButton
                  size="sm"
                  className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 text-xs shadow-sm px-2"
                  onClick={(e) => { e.stopPropagation(); onRead(book, 'EPUB'); }}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1" />
                  Read eBook
                </EnhancedButton>
              )}
              {book.formats?.includes('PDF') && (
                <EnhancedButton
                  size="sm"
                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 text-xs shadow-sm px-2"
                  onClick={(e) => { e.stopPropagation(); onRead(book, 'PDF'); }}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1" />
                  Read
                </EnhancedButton>
              )}
              {/* Fallback to generic Read Free if hasReader but neither explicitly matched to avoid vanishing buttons */}
              {hasReader(book) && !book.formats?.includes('EPUB') && !book.formats?.includes('PDF') && (
                <EnhancedButton
                  size="sm"
                  className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 text-xs shadow-sm px-2"
                  onClick={(e) => { e.stopPropagation(); onRead(book); }}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1" />
                  Read Free
                </EnhancedButton>
              )}
              {hasAudio(book) && (
                <EnhancedButton
                  size="sm"
                  className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 text-xs shadow-sm px-2"
                  onClick={(e) => { e.stopPropagation(); onListen(book); }}
                >
                  <Headphones className="w-3.5 h-3.5 mr-1" />
                  Listen
                </EnhancedButton>
              )}
              {hasAiEmbed(book) && onTalkToBook && (
                <EnhancedButton
                  size="sm"
                  className="flex-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200 text-xs shadow-sm"
                  onClick={(e) => { e.stopPropagation(); onTalkToBook(book); }}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  Chat Free
                </EnhancedButton>
              )}
            </>
          ) : book.available ? (
            <EnhancedButton
              size="sm"
              className="flex-1 !bg-gradient-to-r !from-indigo-600 !to-indigo-500 hover:!from-indigo-700 hover:!to-indigo-600 !text-white border-transparent text-xs"
              onClick={(e) => { e.stopPropagation(); onBorrow(book); }}
            >
              <Library className="w-3.5 h-3.5 mr-1.5" />
              Borrow
            </EnhancedButton>
          ) : showAccessButtons ? (
            <>
              {hasReader(book) && (
                <EnhancedButton
                  size="sm"
                  className="flex-1 bg-white/50 hover:bg-white/80 text-indigo-700 border-indigo-200 text-xs"
                  onClick={(e) => { e.stopPropagation(); onRead(book); }}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  Read
                </EnhancedButton>
              )}
              {hasAiEmbed(book) && onTalkToBook && (
                <EnhancedButton
                  size="sm"
                  className="flex-1 bg-white/50 hover:bg-emerald-50 text-emerald-700 border-emerald-200 text-xs shadow-sm shadow-emerald-500/10"
                  onClick={(e) => { e.stopPropagation(); onTalkToBook(book); }}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Ask AI
                </EnhancedButton>
              )}
              {hasAudio(book) && (
                <EnhancedButton
                  size="sm"
                  className="flex-1 bg-white/50 hover:bg-white/80 text-purple-700 border-purple-200 text-xs"
                  onClick={(e) => { e.stopPropagation(); onListen(book); }}
                >
                  <Headphones className="w-3.5 h-3.5 mr-1.5" />
                  Listen
                </EnhancedButton>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}