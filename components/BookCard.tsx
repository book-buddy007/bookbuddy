import { Button } from "@/components/ui/button";
import { Icon, type BBIconName } from "@/components/ui/icon";
import { BookCover } from "@/components/ui/book-cover";
import { Chip } from "@/components/ui/chip";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { CatalogBook } from '@/types/catalog';
import { hasReader, hasAudio, hasAiEmbed, isFreeBook } from '@/types/catalog';

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

const FORMAT_CHIP: Record<string, { label: string; icon: BBIconName }> = {
  EBOOK: { label: 'eBook', icon: 'read' },
  EPUB: { label: 'eBook', icon: 'read' },
  PDF: { label: 'PDF', icon: 'pdf' },
  AUDIOBOOK: { label: 'Audiobook', icon: 'audiobook' },
  AI_EMBED: { label: 'Varta', icon: 'varta' },
  PHYSICAL: { label: 'Physical', icon: 'library' },
};

function Rating({ rating }: { rating?: number | null }) {
  if (rating === undefined || rating === null) {
    return <span className="text-xs font-medium text-bb-faint">No rating</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-bb-muted" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      <Icon name="star" size={14} />
      {rating.toFixed(1)}
    </span>
  );
}

/**
 * Catalog card: cover (real image or subject gradient with sheen + spine), tier + availability
 * status, format chips, and the actions this reader can take. The click-through to the detail
 * page, the free/borrow/personal-library rules and every handler are unchanged.
 */
export function BookCard({
  book,
  onRead,
  onListen,
  onBorrow,
  onView,
  onTalkToBook,
  isPersonalLibrary = false,
}: BookCardProps) {
  const isDigitalFormat = hasReader(book) || hasAudio(book);
  const showAccessButtons = isPersonalLibrary || !book.available;
  const formats = book.formats && book.formats.length > 0 ? book.formats : ['PDF'];
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <article
      className="bb-lift group relative flex h-full cursor-pointer flex-col rounded-[18px] bg-bb-surface p-4 shadow-e1 focus-visible:outline-none focus-visible:shadow-focus"
      onClick={() => onView(book)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onView(book);
      }}
      aria-label={`${book.title} by ${book.author}`}
    >
      <div className="relative flex justify-center rounded-2xl bg-bb-bg px-4 py-6">
        <BookCover title={book.title} subject={book.genre?.[0]} coverUrl={book.coverUrl} width={132} />
        {book.accessTier && (
          <Chip
            className={cn(
              "absolute left-3 top-3 h-6 text-[11px] font-bold uppercase tracking-[0.08em]",
              book.accessTier.toUpperCase() === 'FREE' ? "bg-bb-info-soft text-bb-info-ink" : "bg-bb-accent-soft text-bb-accent-ink"
            )}
          >
            {book.accessTier}
          </Chip>
        )}
        {/* Play overlay for audiobooks: pointer devices only, keyboard users get the Listen button below */}
        {hasAudio(book) && book.available && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Play ${book.title}`}
            onClick={stop(() => onListen(book))}
            className="hidden-on-touch absolute bottom-3 right-3 h-12 w-12 items-center justify-center rounded-full bg-bb-primary text-white opacity-0 shadow-gloss transition-opacity duration-bb-ui group-hover:opacity-100"
          >
            <Icon name="play" size={22} fillLayer={false} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 pt-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug">{book.title}</h3>
        <p className="text-[13px] text-bb-muted">{book.author}</p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={book.available ? 'returned' : 'reserved'} label={book.available ? 'Available' : 'Borrowed'} />
          <Rating rating={book.rating} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {formats.map((fmt, idx) => {
            const info = FORMAT_CHIP[fmt.toUpperCase()] ?? { label: fmt, icon: 'read' as BBIconName };
            return (
              <Chip key={`${fmt}-${idx}`} icon={info.icon} className="text-xs">
                {info.label}
              </Chip>
            );
          })}
          {(book.genre ?? []).slice(0, 2).map((g) => (
            <Chip key={g} className="bg-transparent text-xs ring-1 ring-inset ring-bb-border">
              {g}
            </Chip>
          ))}
        </div>

        {isDigitalFormat && book.expiresAt && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-bb-warning-ink">
            <Icon name="overdue" size={14} />
            Expires: {new Date(book.expiresAt).toLocaleDateString()}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {isFreeBook(book) ? (
            <>
              {book.formats?.includes('EPUB') && (
                <Button size="sm" className="flex-1" onClick={stop(() => onRead(book, 'EPUB'))}>
                  <Icon name="read" size={16} fillLayer={false} /> Read eBook
                </Button>
              )}
              {book.formats?.includes('PDF') && (
                <Button size="sm" variant="secondary" className="flex-1" onClick={stop(() => onRead(book, 'PDF'))}>
                  <Icon name="pdf" size={16} fillLayer={false} /> Read PDF
                </Button>
              )}
              {/* Fallback to a generic button if the reader supports it but neither format matched, so actions never vanish */}
              {hasReader(book) && !book.formats?.includes('EPUB') && !book.formats?.includes('PDF') && (
                <Button size="sm" className="flex-1" onClick={stop(() => onRead(book))}>
                  <Icon name="read" size={16} fillLayer={false} /> Read Free
                </Button>
              )}
              {hasAudio(book) && (
                <Button size="sm" variant="outline" className="flex-1" onClick={stop(() => onListen(book))}>
                  <Icon name="audiobook" size={16} /> Listen
                </Button>
              )}
              {hasAiEmbed(book) && onTalkToBook && (
                <Button size="sm" variant="ghost" className="flex-1" onClick={stop(() => onTalkToBook(book))}>
                  <Icon name="varta" size={16} /> Chat Free
                </Button>
              )}
            </>
          ) : book.available ? (
            <Button size="sm" className="flex-1" onClick={stop(() => onBorrow(book))}>
              <Icon name="library" size={16} fillLayer={false} /> Borrow
            </Button>
          ) : showAccessButtons ? (
            <>
              {hasReader(book) && (
                <Button size="sm" className="flex-1" onClick={stop(() => onRead(book))}>
                  <Icon name="read" size={16} fillLayer={false} /> Read
                </Button>
              )}
              {hasAiEmbed(book) && onTalkToBook && (
                <Button size="sm" variant="ghost" className="flex-1" onClick={stop(() => onTalkToBook(book))}>
                  <Icon name="varta" size={16} /> Ask Varta
                </Button>
              )}
              {hasAudio(book) && (
                <Button size="sm" variant="outline" className="flex-1" onClick={stop(() => onListen(book))}>
                  <Icon name="audiobook" size={16} /> Listen
                </Button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
