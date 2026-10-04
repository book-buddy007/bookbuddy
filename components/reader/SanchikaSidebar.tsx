import { useMemo,useState } from "react";
import {
X,
NotebookPen,
BookOpen,
RefreshCw,
Loader2,
Pin,
Star,
CloudOff,
Link2Off,
AlertTriangle,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSanchikaStore } from "@/store/useSanchikaStore";
import { useSanchikaNotes,type SanchikaScope } from "@/lib/hooks/useSanchikaNotes";
import { sanitizeNoteHtml } from "@/lib/sanitizeNoteHtml";
import { panelShellClass } from "./panelShell";
import { formatDistanceToNow } from "date-fns";

/* ── Sanchika is DigiClassroom's notebook, read here ───────────────────
   This panel used to read `useSanchikaStore`, which is `persist()` to
   localStorage and makes zero network calls: notes lived in one browser,
   were invisible to DCP's Sanchika, and vanished with site data.

   It reads DCP's real notes now, through `/api/proxy/sanchika/notes` →
   `backend/src/sanchika/`, which connects to DCP's database as a role
   holding SELECT on one view and nothing else. See
   `docs/context/SANCHIKA_TRIO_SHARING.md`.

   Phase 2 is READ-ONLY, so the composer is gone: writing from here needs
   the SECURITY DEFINER function that is phase 3, and a compose box that
   silently wrote to localStorage again would be a worse lie than no box.
   Anything already in the local store is still shown — see the drafts
   band below — because discarding a student's saved passages to ship a
   read path is not a trade this feature gets to make. */

interface SanchikaSidebarProps {
  bookId: string;
  isDarkMode?: boolean;
  /* Audit fix 1. Sanchika used to decide for itself whether it was open,
     from a flag on its own store, which is precisely why it could sit on
     top of the annotation sidebar and Varta at the same time — none of
     the three could see the others. The drawer owns open/closed now.
     It also gates the poll: a closed panel must not query DCP. */
  isOpen?: boolean;
  onClose?: () => void;
  /** Rendered as the body of a Study drawer tab rather than as its own
      overlay — see components/reader/panelShell.ts. */
  embedded?: boolean;
}

export function SanchikaSidebar({
  bookId,
  isOpen = false,
  onClose,
  embedded = false,
}: SanchikaSidebarProps) {
  const [scope, setScope] = useState<SanchikaScope>("book");

  const { notes, status, refresh } = useSanchikaNotes({
    bookId,
    scope,
    enabled: isOpen,
  });

  /* Local leftovers from before the bridge existed. Read-only and clearly
     labelled: they are not in DCP, and phase 3's one-time import is what
     will move them. */
  const localNotes = useSanchikaStore((s) => s.notes);
  const localForBook = useMemo(
    () => (scope === "book" ? localNotes.filter((n) => n.bookId === bookId) : localNotes),
    [localNotes, bookId, scope],
  );

  const isRefreshing = status === "loading";

  return (
    <div
      className={panelShellClass({
        isOpen,
        embedded,
        surface:
          "bg-[var(--bb-surface)]/97 dark:bg-[var(--bb-ink)]/97 border-[#3B5BDB]/20 dark:border-[#7D97FF]/12",
      })}
    >
      {/* Embedded in the Study drawer, the drawer draws the title and the
          close button — a second header inside a tab is just noise. */}
      {!embedded && (
        <div className="p-4 border-b border-[#3B5BDB]/15 dark:border-[#7D97FF]/10 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight text-[var(--bb-info-ink)] dark:text-[#7D97FF] flex items-center gap-2">
              <NotebookPen className="h-5 w-5 text-[#3B5BDB] dark:text-[#7D97FF]" />
              Sanchika Notes
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close Sanchika notes"
              className="rounded-full hit-target"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Scope + freshness ──────────────────────────────────────── */}
      <div className="px-3 py-2.5 border-b border-[#3B5BDB]/15 dark:border-[#7D97FF]/10 flex items-center gap-2 shrink-0">
        <div
          role="tablist"
          aria-label="Which notes to show"
          className="flex items-center gap-1 rounded-full bg-bb-surface-2 p-0.5"
        >
          <ScopeTab
            active={scope === "book"}
            onClick={() => setScope("book")}
            label="This book"
          />
          <ScopeTab active={scope === "all"} onClick={() => setScope("all")} label="All notes" />
        </div>

        <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          from your notebook
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          aria-label="Refresh notes"
          className="h-7 w-7 rounded-full shrink-0"
        >
          {isRefreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {localForBook.length > 0 && (
            <div className="rounded-lg border border-dashed border-amber-300/70 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <CloudOff className="w-3.5 h-3.5" />
                Saved on this device only
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-500/80 leading-relaxed">
                These were saved before Sanchika connected to your notebook. They stay in this
                browser until Book Buddy can write notes back.
              </p>
              {localForBook.map((n) => (
                <p
                  key={n.id}
                  className="text-xs whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 border-t border-amber-200/60 dark:border-amber-800/40 pt-2"
                >
                  {n.content}
                </p>
              ))}
            </div>
          )}

          {status === "loading" && notes.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your notes…
            </div>
          )}

          {status === "error" && (
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" />}
              tone="red"
              title="Couldn't reach your notes"
              body="The notebook service didn't answer. Your notes are safe there — try again in a moment."
              action={
                <Button variant="outline" size="sm" onClick={() => void refresh()} className="mt-3">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try again
                </Button>
              }
            />
          )}

          {status === "unconfigured" && (
            <EmptyState
              icon={<CloudOff className="h-8 w-8 text-slate-400" />}
              tone="slate"
              title="Notes aren't connected here"
              body="This copy of Book Buddy isn't linked to a notebook yet."
            />
          )}

          {status === "unlinked" && (
            <EmptyState
              icon={<Link2Off className="h-8 w-8 text-slate-400" />}
              tone="slate"
              title="No notebook account matched"
              body="Sign in to Book Buddy with your institution account, or verify the email address you use in your notebook, and your notes will appear here."
            />
          )}

          {status === "ready" && notes.length === 0 && (
            <EmptyState
              icon={<NotebookPen className="h-8 w-8 text-amber-500 dark:text-amber-400" />}
              tone="amber"
              title={scope === "book" ? "No notes for this book yet" : "Your notebook is empty"}
              body={
                scope === "book"
                  ? "Notes you attach to this book in your notebook show up here. Switch to All notes to see the rest of your notebook."
                  : "Write a note in Sanchika and it will appear here."
              }
            />
          )}

          {notes.map((note) => (
            <article
              key={note.id}
              className="p-3 rounded-[22px] border border-bb-border bg-bb-surface shadow-e1"
            >
              <header className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-amber-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-500 flex items-center gap-1.5 min-w-0">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{note.title}</span>
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {note.isPinned && (
                    <Pin className="w-3 h-3 text-amber-500" aria-label="Pinned" />
                  )}
                  {note.isFavorite && (
                    <Star className="w-3 h-3 text-amber-500" aria-label="Favourite" />
                  )}
                  {note.updatedAt && (
                    <span className="text-[10px] text-slate-400">
                      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </header>

              {(note.subject || note.chapter) && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2 truncate">
                  {[note.subject, note.chapter].filter(Boolean).join(" · ")}
                </p>
              )}

              <NoteBody content={note.content} />

              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100/70 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/* Tiptap HTML from another application, so it is sanitised here rather than
   trusted — see lib/sanitizeNoteHtml.ts.

   `content_format` is NOT the switch, even though it looks like one: every row
   in DCP says `markdown` while the bodies are Tiptap HTML (`<p>…</p>`) or bare
   text. Routing on it would print raw tags at the student. The presence of a
   tag is the only honest signal, so that is what this branches on. */
function NoteBody({ content }: { content: string }) {
  const looksLikeMarkup = /<[a-z!/]/i.test(content);
  const clean = useMemo(
    () => (looksLikeMarkup ? sanitizeNoteHtml(content) : ""),
    [content, looksLikeMarkup],
  );

  if (!looksLikeMarkup) {
    return (
      <p className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-200">
        {content}
      </p>
    );
  }

  /* Sanitising to nothing is a real case, not a failure: DCP stores handwriting
     as a base64 SVG inside an HTML comment (`<!-- sanchika-ink: … -->`), and
     comments do not survive sanitisation. Saying so beats an empty card that
     looks like the bridge lost the note. */
  if (!clean.replace(/<[^>]*>/g, "").trim()) {
    return (
      <p className="text-xs italic text-slate-400 dark:text-slate-500">
        {/sanchika-ink:/.test(content)
          ? "This note is handwritten — open it in your notebook app to see the drawing."
          : "This note has no text to show here."}
      </p>
    );
  }

  return (
    <div
      className="sanchika-note-body text-sm leading-relaxed text-slate-700 dark:text-slate-200 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_a]:text-amber-700 [&_a]:underline dark:[&_a]:text-amber-400 [&_img]:max-w-full [&_img]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-amber-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_pre]:bg-slate-100 dark:[&_pre]:bg-slate-800 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_table]:w-full [&_td]:border [&_td]:border-slate-200 [&_td]:px-1.5 [&_th]:border [&_th]:border-slate-200 [&_th]:px-1.5"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

function ScopeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
        active
          ? "bg-bb-surface text-bb-text shadow-[0_1px_0_var(--bb-border),0_6px_14px_-8px_rgba(10,15,36,.4)]"
          : "text-bb-muted hover:text-bb-text"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  /** Kept for existing call sites; every empty state shares the halo look. */
  tone?: "amber" | "slate" | "red";
}) {


  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="mb-3 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(59,91,219,.16),transparent_70%)]">
        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-bb-surface shadow-e1">
          {icon}
        </div>
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[36ch] leading-relaxed">
        {body}
      </p>
      {action}
    </div>
  );
}
