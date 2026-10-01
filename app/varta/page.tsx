'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { BookListCard } from '@/components/ui/book-list-card';
import { VartaOrb } from '@/components/ui/varta';
import { VartaChat, type ActiveCitation } from '@/components/varta/varta-chat';
import type { DialogueMode } from '@/hooks/useBookChat';
import { VartaHistory } from '@/components/varta/varta-history';
import { VartaSourcePanel } from '@/components/varta/varta-source-panel';
import { VartaActivityView } from '@/components/varta/varta-activity';
import { useVartaActivity, useVartaBooks } from '@/components/varta/use-varta-data';
import { buildCiteMaps } from '@/lib/varta-citations';
import { useBookChat } from '@/hooks/useBookChat';

/* Varta — full-screen workspace (opens over the app shell, like the player and reader).

   Chat view: history rail · conversation · source panel (desktop); the history becomes a
   sheet on tablet/phone and the cited excerpt shows inline inside the answer.
   Activity view: the student's Varta chat + quiz stats, scoped to one book (?bookId=) or all.

   Data comes from the same endpoints as before: /api/students/me/varta-activity,
   /api/v1/books and the per-book chat stream (hooks/useBookChat). */

type View = 'chat' | 'activity';

function VartaWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const bookId = params.get('bookId') || params.get('id') || undefined;
  const view: View = params.get('view') === 'activity' ? 'activity' : 'chat';

  const { books, loading: booksLoading } = useVartaBooks();
  const { data: activity, loading: activityLoading, error: activityError } = useVartaActivity(view === 'activity' ? bookId : undefined);
  const { data: history, loading: historyLoading } = useVartaActivity(undefined);

  const [historyOpen, setHistoryOpen] = useState(false);

  const book = useMemo(() => books.find((b) => b.id === bookId), [books, bookId]);

  const go = useCallback(
    (next: { bookId?: string; view?: View }) => {
      const q = new URLSearchParams();
      const b = 'bookId' in next ? next.bookId : bookId;
      if (b) q.set('bookId', b);
      if (next.view === 'activity') q.set('view', 'activity');
      router.replace(`/varta${q.toString() ? `?${q}` : ''}`);
      setHistoryOpen(false);
    },
    [router, bookId],
  );

  const historyRail = (
    <VartaHistory
      chats={history?.recentChats ?? []}
      loading={historyLoading}
      activeBookId={bookId}
      onSelect={(id) => go({ bookId: id, view: 'chat' })}
      onNew={() => go({ bookId: undefined, view: 'chat' })}
    />
  );

  return (
    <div className="grid h-dvh grid-cols-1 bg-bb-bg text-bb-text lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 lg:block">{historyRail}</aside>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-sm border-0 bg-bb-navy p-0 lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Chat history</SheetTitle>
          </SheetHeader>
          {historyRail}
        </SheetContent>
      </Sheet>

      <main className="flex min-h-0 min-w-0 flex-col">
        {/* View switch — kept inside the conversation column so the rails stay clean */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-bb-border bg-bb-surface px-4 py-2 pt-[calc(0.5rem+var(--bb-safe-top))] sm:px-6">
          <Segmented<View>
            size="sm"
            aria-label="Varta view"
            value={view}
            onValueChange={(v) => go({ view: v })}
            options={[
              { value: 'chat', label: 'Chat' },
              { value: 'activity', label: 'Activity' },
            ]}
          />
          <Link href="/dashboard/student" className="text-[13px] font-semibold text-bb-accent-ink hover:underline">
            Dashboard
          </Link>
        </div>

        {view === 'activity' ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            <div className="mx-auto max-w-5xl">
              <header className="mb-8">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">Varta</p>
                <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">Your activity</h1>
                <p className="mt-2 text-[15px] text-bb-muted">
                  {activity?.scope === 'book' && activity.book ? <>Chats and quizzes in <b className="text-bb-text">{activity.book.title}</b></> : 'Your chats and quizzes across every book'}
                </p>
              </header>
              <VartaActivityView data={activity} loading={activityLoading} error={activityError} bookId={bookId} />
            </div>
          </div>
        ) : bookId ? (
          <ChatSession
            key={bookId}
            bookId={bookId}
            book={book}
            books={books}
            onSelectBook={(id) => go({ bookId: id, view: 'chat' })}
            onOpenHistory={() => setHistoryOpen(true)}
            backHref={`/reader?bookId=${bookId}`}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-10 sm:px-8">
            <div className="mx-auto max-w-3xl">
              <div className="mb-8 flex flex-col items-center gap-3 text-center">
                <VartaOrb size={64} />
                <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-[-0.03em]">Ask Varta</h1>
                <p className="max-w-md text-[15px] text-bb-muted">Pick a textbook. Varta answers only from its pages and shows you where.</p>
              </div>
              {booksLoading ? (
                <p className="text-center text-sm text-bb-muted">Loading your books…</p>
              ) : books.length === 0 ? (
                <EmptyState icon="varta" title="No Varta-enabled books yet" description="Books with Varta turned on will appear here." />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {books.map((b) => (
                    <button key={b.id} type="button" onClick={() => go({ bookId: b.id, view: 'chat' })} className="text-left focus-visible:outline-none">
                      <BookListCard interactive title={b.title} publisher={b.author} coverUrl={b.coverUrl} formats={[{ label: 'Varta', icon: 'varta' }]} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

    </div>
  );
}

/** One chat session: owns the conversation hook so the thread and the source column read the same live messages. */
function ChatSession({ bookId, ...rest }: Omit<React.ComponentProps<typeof VartaChat>, 'chat' | 'mode' | 'onModeChange' | 'active' | 'onActiveChange'>) {
  const [mode, setMode] = useState<DialogueMode>('explain');
  const chat = useBookChat(bookId, mode);
  const [active, setActive] = useState<ActiveCitation | null>(null);

  const message = chat.messages.find((m) => m.id === active?.messageId);
  const { byIndex } = buildCiteMaps(message?.citations);
  const citation = active ? byIndex.get(active.index) ?? null : null;
  const others = (message?.citations ?? []).filter((c) => typeof c.index === 'number' && c.pageNumber != null && c.index !== active?.index);

  return (
    <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_340px]">
      <VartaChat {...rest} bookId={bookId} chat={chat} mode={mode} onModeChange={setMode} active={active} onActiveChange={setActive} />
      <aside className="hidden min-h-0 border-l border-bb-border bg-bb-surface xl:block">
        <VartaSourcePanel
          citation={citation}
          others={others}
          bookId={bookId}
          onSelect={(index) => active && setActive({ messageId: active.messageId, index })}
        />
      </aside>
    </div>
  );
}

export default function VartaPage() {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center bg-bb-bg"><Icon name="loader" size={32} className="animate-spin" /></div>}>
      <VartaWorkspace />
    </Suspense>
  );
}
