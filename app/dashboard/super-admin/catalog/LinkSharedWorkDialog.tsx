'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, CheckCircle2, Globe, Link, Loader2, Search } from '@/components/ui/icons';
import { catalogKeys } from '@/lib/query-keys';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  createBookFromSharedWork,
  linkBookToSharedWork,
  listSharedWorks,
  type SharedWork,
} from '@/lib/api/adminApi';
import {
  LANGUAGE_OPTIONS,
  appNames,
  describeWork,
  inBookBuddy,
  isbnRelation,
  languageFromWork,
  linkBlock,
} from '@/lib/shared-library';

export interface LinkSharedWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * 'link' (default): link an existing catalogue book to a shared work.
   * 'create': make a new catalogue book from a shared work, then link it. `book` is not used.
   */
  mode?: 'link' | 'create';
  book: {
    id: string;
    title: string;
    isbn?: string | null;
    /** Set when the book already lives in the shared library. */
    spineContentItemId?: string | null;
  } | null;
  /** Called once the link job is queued (for a new book, with its new id), so the caller can show progress. */
  onLinked: (book: { id: string; title: string }) => void;
}

/**
 * Link a catalogue book to a work that is already embedded in the shared library (DigiClassroom),
 * instead of embedding the book again.
 *
 * What the screen refuses, and why:
 *  - a book that already lives in the shared library: DigiClassroom will not repoint it, so the
 *    screen says so rather than offering a choice that is guaranteed to fail;
 *  - a work whose ISBN differs from the book's: linked to the wrong work, the book would answer
 *    correctly for a different book with nothing looking wrong.
 *
 * In 'create' mode the same list makes a NEW book instead: the title, ISBN and language come from the
 * work, the author is typed (the shared library holds none), and a work Book Buddy already has a book
 * for cannot be picked again. The PDF/EPUB and cover are not copied; they are uploaded afterwards.
 *
 * The backend's own explanation is shown as it is (library not set up, secret rejected,
 * DigiClassroom unreachable); the screen never invents a reason.
 */
export function LinkSharedWorkDialog({ open, onOpenChange, mode = 'link', book, onLinked }: LinkSharedWorkDialogProps) {
  const creating = mode === 'create';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  // Create mode only: the new book's details, prefilled from the picked work.
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [language, setLanguage] = useState('en');
  const debounced = useDebounce(query, 350);

  // Every open starts fresh, searching for the book's own title: the usual case is that the work has
  // the same name, and an empty list would make the admin type what is already on screen.
  useEffect(() => {
    if (open) {
      setQuery(creating ? '' : (book?.title ?? ''));
      setSelectedId(null);
      setLinkError(null);
      setTitle('');
      setAuthor('');
      setLanguage('en');
    }
  }, [open, creating, book?.id, book?.title]);

  const alreadyLinked = !creating && !!book?.spineContentItemId;

  const works = useQuery({
    queryKey: ['shared-library', 'works', debounced.trim()],
    queryFn: async (): Promise<SharedWork[]> => {
      const res = await listSharedWorks(debounced);
      if (!res.success) throw new Error(res.error || 'Could not load the shared library.');
      return res.data as SharedWork[];
    },
    enabled: open && (creating || !!book) && !alreadyLinked,
    retry: false,
    staleTime: 30_000,
  });

  const linkMutation = useMutation({
    mutationFn: async (work: SharedWork): Promise<{ id: string; title: string }> => {
      if (creating) {
        const res = await createBookFromSharedWork({
          contentItemId: work.contentItemId,
          author: author.trim(),
          // Only what the admin changed: the work's own title is the default.
          ...(title.trim() && title.trim() !== work.title ? { title: title.trim() } : {}),
          language,
        });
        if (!res.success || !res.data) throw new Error(res.error || 'Could not create the book.');
        return { id: res.data.bookId, title: res.data.title };
      }
      const res = await linkBookToSharedWork(book!.id, work.contentItemId);
      if (!res.success) throw new Error(res.error || 'Could not queue the link.');
      return { id: book!.id, title: book!.title };
    },
    onSuccess: (done) => {
      toast({
        title: creating ? 'Book created' : 'Linking queued',
        description: creating
          ? `"${done.title}" was added and is being linked to the shared library. Upload its PDF/EPUB and cover next.`
          : `"${done.title}" is being linked to the shared library.`,
      });
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      onLinked(done);
      onOpenChange(false);
    },
    onError: (err: Error) => setLinkError(err.message),
  });

  const list = works.data ?? [];
  const selected = list.find((w) => w.contentItemId === selectedId) ?? null;
  // A new book cannot be made from a work Book Buddy already has a book for.
  const blocked = creating
    ? selected && inBookBuddy(selected) ? ('already-used' as const) : null
    : book && selected ? linkBlock(book, selected) : null;
  const canLink = creating
    ? !!selected && !blocked && !!author.trim() && !linkMutation.isPending
    : !!book && !!selected && !blocked && !linkMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !linkMutation.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[600px] max-h-[88dvh] flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-bb-info-soft">
            <Globe className="h-7 w-7 text-bb-info-ink" />
          </div>
          <DialogTitle className="text-center text-lg font-bold text-bb-text dark:text-white">
            {creating ? 'Add a book from the shared library' : 'Link to the shared library'}
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            {creating ? (
              <>Create a Book Buddy book from a work already embedded in DigiClassroom. Nothing is embedded again.</>
            ) : book ? (
              <>Use a book already embedded in DigiClassroom for “{book.title}”. Nothing is embedded again.</>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {alreadyLinked ? (
          <div className="px-6 pb-6">
            <div className="flex gap-2.5 rounded-xl border border-bb-success/30 bg-bb-success-soft/70 p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-bb-success-ink" />
              <p className="text-xs leading-relaxed text-bb-success-ink">
                This book already uses a work in the shared library, so it cannot be linked to a different one
                from here: the link is never changed silently, because every student of the book would be
                answered from something else.
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <EnhancedButton variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                Close
              </EnhancedButton>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 pb-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-faint" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedId(null);
                  }}
                  placeholder="Search the shared library by title"
                  aria-label="Search the shared library by title"
                  className="rounded-xl bg-bb-surface border-bb-border/80 pl-9"
                />
              </div>
            </div>

            <div className="min-h-[96px] flex-1 overflow-y-auto px-6 pb-3">
              {works.isLoading && (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading the shared library…
                </div>
              )}

              {works.isError && (
                <div role="alert" className="flex gap-2.5 rounded-xl border border-bb-danger/30 bg-bb-danger-soft/70 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-bb-danger-ink" />
                  <p className="text-xs leading-relaxed text-bb-danger-ink whitespace-pre-wrap break-words">
                    {(works.error as Error).message}
                  </p>
                </div>
              )}

              {works.isSuccess && list.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No public works match. Books are added to the shared library by uploading and embedding them in
                  DigiClassroom.
                </p>
              )}

              {works.isSuccess && list.length > 0 && (
                <ul role="radiogroup" aria-label="Works in the shared library" className="space-y-2">
                  {list.map((w) => {
                    const relation = !creating && book ? isbnRelation(book.isbn, w.isbn) : 'unknown';
                    const taken = creating && inBookBuddy(w);
                    const isSelected = w.contentItemId === selectedId;
                    const usedBy = appNames(w.linkedApps ?? []);
                    return (
                      <li key={w.contentItemId}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => {
                            setSelectedId(w.contentItemId);
                            setLinkError(null);
                            if (creating) {
                              setTitle(w.title);
                              setLanguage(languageFromWork(w.lang));
                            }
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition-all ${
                            isSelected
                              ? 'border-bb-info/50 bg-bb-info-soft/60 ring-1 ring-bb-info/30'
                              : 'border-bb-border bg-bb-surface hover:bg-bb-surface-2'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-bb-text">{w.title}</p>
                              <p className="mt-0.5 text-xs text-bb-muted">{describeWork(w)}</p>
                              {usedBy.length > 0 && (
                                <p className="mt-1 text-[11px] text-bb-faint">Also used by {usedBy.join(', ')}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {relation === 'match' && <Badge variant="success">ISBN matches</Badge>}
                              {relation === 'mismatch' && <Badge variant="destructive">ISBN differs</Badge>}
                              {taken && <Badge variant="warning">Already in Book Buddy</Badge>}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {blocked === 'isbn-mismatch' && selected && (
              <div role="alert" className="mx-6 mb-3 flex gap-2.5 rounded-xl border border-bb-danger/30 bg-bb-danger-soft/70 p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-bb-danger-ink" />
                <p className="text-xs leading-relaxed text-bb-danger-ink">
                  This book&apos;s ISBN ({book?.isbn}) is not the work&apos;s ({selected.isbn}). Linking them would
                  answer questions about this book from a different one. Pick the right work, or correct the ISBN
                  in Edit Metadata.
                </p>
              </div>
            )}

            {blocked === 'already-used' && selected && (
              <div role="alert" className="mx-6 mb-3 flex gap-2.5 rounded-xl border border-bb-warning/30 bg-bb-warning-soft/70 p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-bb-warning-ink" />
                <p className="text-xs leading-relaxed text-bb-warning-ink">
                  Book Buddy already has a book for “{selected.title}”. A second record would split its readers, notes and chat
                  history, so open the existing book and use Link to shared library there instead.
                </p>
              </div>
            )}

            {creating && selected && !blocked && (
              <div className="mx-6 mb-3 space-y-3 rounded-xl border border-bb-border bg-bb-surface-2/70 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-bb-text">Title</span>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} className="rounded-xl bg-bb-surface border-bb-border/80" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-bb-text">Author <span className="text-bb-danger-ink">*</span></span>
                    <Input
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      maxLength={200}
                      placeholder="The shared library holds no author"
                      aria-required="true"
                      className="rounded-xl bg-bb-surface border-bb-border/80"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-bb-text">Language</span>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="h-10 w-full rounded-xl border border-bb-border/80 bg-bb-surface px-3 text-sm"
                    >
                      {LANGUAGE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="text-xs leading-relaxed text-bb-muted">
                  A new book is added to the global catalogue with this work&apos;s ISBN{selected.isbn ? ` (${selected.isbn})` : ''} and
                  linked to it, so Varta answers from the shared passages. The PDF/EPUB and cover are not copied from the
                  other app: upload them to the new book afterwards.
                </p>
              </div>
            )}

            {!creating && selected && !blocked && (
              <p className="mx-6 mb-3 rounded-xl border border-bb-border bg-bb-surface-2/70 p-3 text-xs leading-relaxed text-bb-muted">
                Varta for this book will answer from “{selected.title}”. Any copy of the book already indexed in Book
                Buddy&apos;s own index is removed. The shared library is not changed.
              </p>
            )}

            {linkError && (
              <div role="alert" className="mx-6 mb-3 flex gap-2.5 rounded-xl border border-bb-danger/30 bg-bb-danger-soft/70 p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-bb-danger-ink" />
                <p className="text-xs leading-relaxed text-bb-danger-ink whitespace-pre-wrap break-words">{linkError}</p>
              </div>
            )}

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-bb-border/60 bg-bb-surface px-6 py-4">
              <EnhancedButton
                type="button"
                variant="outline"
                className="rounded-xl border-bb-border hover:bg-bb-surface-2"
                onClick={() => onOpenChange(false)}
                disabled={linkMutation.isPending}
              >
                Cancel
              </EnhancedButton>
              <EnhancedButton
                type="button"
                className="gap-2 rounded-xl text-white shadow-md"
                disabled={!canLink}
                onClick={() => selected && linkMutation.mutate(selected)}
              >
                {linkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                {creating ? 'Create and link' : 'Link this book'}
              </EnhancedButton>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
