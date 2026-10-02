import { useState,useEffect,useCallback,useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useReaderStore } from "@/store/useReaderStore";
import {
Loader2,
CheckCircle2,
XCircle,
RotateCcw,
BookOpen,
Library,
Lightbulb,
Languages,
LogOut,
ArrowRight,
Trophy,
// Aliased: the bare name resolves to the DOM `History` interface, not the icon.
History as HistoryIcon,
} from "@/components/ui/icons";

interface ChapterQuizContentProps {
  bookId: string;
  isDarkMode?: boolean;
}

interface QuizItem {
  id: string;
  type: "mcq" | "short_answer";
  prompt: string;
  choices: string[] | null;
  citedPage?: number | null;
  chapterTitle?: string;
}

interface Verdict {
  correct: boolean;
  correctAnswer: string;
  citedPage?: number | null;
}

interface Translation {
  text: string;
  label: string;
}

/* ── Quiz, rebuilt around one question at a time ───────────────────────────
   The panel used to render a whole chapter's bank as a scrolling list of
   inputs with a single Submit at the bottom. Three things were wrong with
   that: nothing could be answered until everything was, feedback arrived long
   after the thinking that earned it, and a mixed bag of short-answer items
   meant every submission spent an LLM call being graded against an unrubriced
   reference.

   Now: pick a scope, get one four-option question, tap an option and see
   immediately whether it was right, then choose to have it explained,
   translated, or to stop. Grading is a string compare server-side, so the
   green/red is instant and free.

   Scope note — "this session" is deliberately absent. The reader counts PDF
   pages from the start of the file (currentPage 1, 2, 6…) while the embedded
   content carries printed book page numbers (183–209). Those are different
   coordinate systems, so a "pages I have read" filter would either return
   nothing or quiz the wrong pages while looking like it worked. It needs a
   per-book page offset first. */

type Scope = "session" | "chapter" | "book";

interface PageMap {
  resolved: boolean;
  offset?: number;
  minPrinted?: number;
  maxPrinted?: number;
  reason?: string;
}

/** [1,2,3,7,9,10] -> "1-3, 7, 9-10". Mirrors formatPageSpec on the backend so
    the chip shows a compact range instead of thirty comma-separated numbers. */
function formatPages(pages: number[]): string {
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur !== prev + 1) {
      parts.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = cur;
    }
    prev = cur;
  }
  return parts.join(", ");
}

export function ChapterQuizContent({ bookId }: ChapterQuizContentProps) {
  const sessionPages = useReaderStore((s) => s.sessionPages);
  const totalPages = useReaderStore((s) => s.totalPages);

  const [scope, setScope] = useState<Scope | null>(null);
  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  const [items, setItems] = useState<QuizItem[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [finished, setFinished] = useState(false);

  const [explanation, setExplanation] = useState<string | null>(null);
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const [pageMap, setPageMap] = useState<PageMap | null>(null);
  const [pageSpec, setPageSpec] = useState("");

  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [grading, setGrading] = useState(false);
  const [assisting, setAssisting] = useState<"explain" | "translate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    setLoadingChapters(true);
    fetch(`/api/books/${bookId}/chapters`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setChapters(Array.isArray(data) ? data : []))
      .catch(() => setError("Could not load chapters for this book."))
      .finally(() => setLoadingChapters(false));
  }, [bookId]);

  /* Ask the backend whether the reader's page numbers can be mapped onto the
     book's printed ones. It only resolves when the PDF's page count equals the
     ingested printed span, which proves the file covers exactly the ingested
     range; otherwise the session scope stays unavailable rather than quizzing
     on pages the student never opened. */
  useEffect(() => {
    if (!bookId) return;
    // pdfPages is optional now: without it the response still carries the
    // printed range, which is all the page-range card needs. Only the
    // read-this-session pre-fill depends on a resolved offset.
    fetch(`/api/books/${bookId}/page-map?pdfPages=${totalPages ?? ''}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPageMap(data))
      .catch(() => setPageMap(null));
  }, [bookId, totalPages]);

  /** Reader pages read this sitting, converted to the printed numbers the
      questions are tagged with. */
  const sessionPrintedPages = useMemo(() => {
    if (!pageMap?.resolved || pageMap.offset == null) return [];
    return sessionPages
      .map((p) => p + (pageMap.offset as number))
      .filter((p) => p >= (pageMap.minPrinted ?? -Infinity) && p <= (pageMap.maxPrinted ?? Infinity));
  }, [sessionPages, pageMap]);

  /* The printed page range this book actually has questions for, straight
     from the chunk metadata. Shown as a hint so a student types numbers that
     can match rather than guessing. */
  const availableRange =
    pageMap?.minPrinted != null && pageMap?.maxPrinted != null
      ? `${pageMap.minPrinted}-${pageMap.maxPrinted}`
      : "";
  const examplePages =
    pageMap?.minPrinted != null
      ? `${pageMap.minPrinted}-${Math.min(pageMap.minPrinted + 4, pageMap.maxPrinted ?? pageMap.minPrinted + 4)}`
      : "183-190, 195";

  const current = items[index];

  const resetRun = () => {
    setItems([]);
    setIndex(0);
    setPicked(null);
    setVerdict(null);
    setScore({ right: 0, total: 0 });
    setFinished(false);
    setExplanation(null);
    setTranslation(null);
    setShowTranslation(false);
    setError(null);
  };

  /* Shuffled so a repeat run is not the same sequence, which is what makes
     "ask me again" worth tapping. Fisher-Yates on a copy — sorting by
     Math.random() is biased and, on a short bank, visibly so. */
  const startQuiz = useCallback(
    async (nextScope: Scope, chapterTitle?: string, pagesArg?: string) => {
      resetRun();
      setScope(nextScope);
      setSelectedChapter(chapterTitle ?? null);
      setLoadingQuiz(true);

      // The session scope is the whole-book bank narrowed to specific printed
      // pages — the questions are the same, only the selection differs.
      const url =
        nextScope === "session"
          ? `/api/books/${bookId}/quiz?pages=${encodeURIComponent(pagesArg ?? "")}`
          : nextScope === "book"
          ? `/api/books/${bookId}/quiz`
          : `/api/books/${bookId}/chapters/${encodeURIComponent(chapterTitle!)}/quiz`;

      /* A bounded wait. This had no timeout, so the first quiz on a cold
         chapter sat on "Writing your questions…" indefinitely — past the point
         the browser or a proxy gives up — with no way to tell a slow answer
         from a dead one. */
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 45_000);

      try {
        const res = await fetch(url, { credentials: "include", signal: ctl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // The page-filtered route returns a envelope so "no questions" and "no
        // questions on those pages" stay distinguishable.
        const list: QuizItem[] = Array.isArray(data) ? data : data?.items ?? [];
        /* Belt and braces against a question with nothing to tap. The backend
           already filters legacy short-answer rows, whose `choices` is null,
           but an item that reached here without four options would render a
           prompt and no buttons — and since Next only appears after a verdict,
           the student could neither answer it nor move past it. */
        const pool = list.filter((i) => Array.isArray(i.choices) && i.choices.length >= 2);
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        setItems(pool);
        if (pool.length === 0) {
          setError(
            nextScope === "session"
              ? "No questions cover those pages yet. Try a wider range, or quiz on the whole chapter."
              : "No questions could be generated for this selection yet.",
          );
        }
      } catch (e: any) {
        setError(
          e?.name === "AbortError"
            ? "Still writing this chapter's questions — they're being prepared in the background. Try again in a moment."
            : "Could not start the quiz. Please try again.",
        );
      } finally {
        clearTimeout(timer);
        setLoadingQuiz(false);
      }
    },
    [bookId],
  );

  const choose = async (choice: string) => {
    if (verdict || grading || !current) return;
    setPicked(choice);
    setGrading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/quiz/items/${current.id}/answer`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: choice }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Verdict = await res.json();
      setVerdict(data);
      setScore((s) => ({ right: s.right + (data.correct ? 1 : 0), total: s.total + 1 }));
    } catch {
      // Roll the selection back rather than leaving an option looking chosen
      // but ungraded, which reads as the app having silently accepted it.
      setPicked(null);
      setError("Could not check that answer. Tap it again.");
    } finally {
      setGrading(false);
    }
  };

  const next = () => {
    if (index + 1 >= items.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setVerdict(null);
    setExplanation(null);
    setTranslation(null);
    setShowTranslation(false);
    setError(null);
  };

  const handleExplain = async () => {
    if (!current || explanation || assisting) return;
    setAssisting("explain");
    try {
      const res = await fetch(`/api/books/${bookId}/quiz/items/${current.id}/explain`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setExplanation(data.explanation);
    } catch {
      setError("Could not explain this one right now.");
    } finally {
      setAssisting(null);
    }
  };

  /* Toggles once fetched rather than re-requesting, the same way
     DigiClassroom's translate button behaves — a second tap should hide, not
     spend another call. */
  const handleTranslate = async () => {
    if (!current || assisting) return;
    if (translation) {
      setShowTranslation((v) => !v);
      return;
    }
    setAssisting("translate");
    const body = [
      current.prompt,
      ...(current.choices ?? []),
      verdict ? `Correct answer: ${verdict.correctAnswer}` : "",
      explanation ?? "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      const res = await fetch(`/api/books/${bookId}/quiz/items/${current.id}/translate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTranslation({ text: data.text, label: data.label });
      setShowTranslation(true);
    } catch {
      setError("Could not translate this one right now.");
    } finally {
      setAssisting(null);
    }
  };

  const scopeLabel = useMemo(() => {
    if (scope === "book") return "Whole book";
    if (scope === "session") return `Pages ${pageSpec || formatPages(sessionPrintedPages)}`;
    return selectedChapter ?? "";
  }, [scope, selectedChapter, pageSpec, sessionPrintedPages]);

  // ── Scope picker ────────────────────────────────────────────────────────
  if (!scope) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
          What should I quiz you on?
        </p>
        <div className="flex flex-col gap-2">
          {/* PAGE NUMBERS COME FROM THE CHUNK METADATA, NOT THE PDF.

              This card used to appear only when the reader's PDF page numbering
              could be mapped onto the book's printed one, which requires the
              file's page count to equal the ingested span exactly. When it
              could not — and it often cannot — the option vanished entirely,
              which is what you were seeing.

              Asking for printed pages directly removes that dependency.
              `citedPage` on every question already holds the printed number,
              and the printed number is what the student can read at the top of
              the page in front of them, so what they type and what is matched
              are the same coordinate system by construction. No offset, no PDF
              page count, nothing to resolve or get wrong.

              Pages read this session still offer themselves as a one-tap fill
              when that mapping happens to resolve — a convenience when it
              works, no longer a precondition for the feature existing. */}
          <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-soft)]/40 dark:border-[var(--bb-amber)]/15 dark:bg-[var(--bb-amber)]/[0.04] px-3 py-2.5">
            <div className="flex items-start gap-3">
              <HistoryIcon className="w-4 h-4 mt-0.5 shrink-0 text-[var(--accent-strong)] dark:text-[var(--accent-primary-dark)]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  From specific pages
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {availableRange
                    ? `Use the page numbers printed in the book — this one covers ${availableRange}`
                    : "Use the page numbers printed in the book"}
                </p>
              </div>
            </div>
            <input
              value={pageSpec}
              onChange={(e) => setPageSpec(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && pageSpec.trim()) startQuiz("session", undefined, pageSpec.trim());
              }}
              placeholder={`e.g. ${examplePages}`}
              className="mt-2 w-full text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            />
            {sessionPrintedPages.length > 0 && (
              <button
                onClick={() => setPageSpec(formatPages(sessionPrintedPages))}
                className="mt-1.5 text-[11px] text-[var(--accent-strong)] dark:text-[var(--accent-primary-dark)] underline"
              >
                Use what I just read ({formatPages(sessionPrintedPages)})
              </button>
            )}
            <Button
              disabled={!pageSpec.trim()}
              onClick={() => startQuiz("session", undefined, pageSpec.trim())}
              className="w-full mt-2 h-8 text-xs bg-[var(--accent-strong)] hover:bg-[var(--accent-contrast)] text-white disabled:opacity-50"
            >
              Quiz me on these pages
            </Button>
          </div>

          <button
            type="button"
            disabled={loadingChapters || chapters.length === 0}
            onClick={() => setScope("chapter")}
            className="flex items-start gap-3 w-full text-left px-3 py-2.5 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-soft)]/40 hover:bg-[var(--accent-soft)] hover:border-[var(--accent-primary)]/40 active:scale-[0.99] transition-all disabled:opacity-50 dark:border-[var(--bb-amber)]/15 dark:bg-[var(--bb-amber)]/[0.04]"
          >
            <BookOpen className="w-4 h-4 mt-0.5 shrink-0 text-[var(--accent-strong)] dark:text-[var(--accent-primary-dark)]" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                From a chapter
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {chapters.length > 0
                  ? `Pick one of ${chapters.length} chapters`
                  : "This book has no chapters yet"}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => startQuiz("book")}
            className="flex items-start gap-3 w-full text-left px-3 py-2.5 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-soft)]/40 hover:bg-[var(--accent-soft)] hover:border-[var(--accent-primary)]/40 active:scale-[0.99] transition-all dark:border-[var(--bb-amber)]/15 dark:bg-[var(--bb-amber)]/[0.04]"
          >
            <Library className="w-4 h-4 mt-0.5 shrink-0 text-[var(--accent-strong)] dark:text-[var(--accent-primary-dark)]" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Whole book
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Questions from any chapter, mixed
              </span>
            </span>
          </button>
        </div>
        {loadingChapters && (
          <div className="flex justify-center pt-6">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        )}
      </div>
    );
  }

  // ── Chapter picker ──────────────────────────────────────────────────────
  if (scope === "chapter" && !selectedChapter) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <button
          onClick={() => setScope(null)}
          className="text-xs text-slate-500 hover:text-[var(--accent-strong)] mb-3"
        >
          ← Back
        </button>
        <div className="flex flex-col gap-2">
          {chapters.map((ch) => (
            <button
              key={ch}
              onClick={() => startQuiz("chapter", ch)}
              className="text-left text-sm font-medium px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)]/50 transition-colors text-slate-700 dark:text-slate-300"
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const restart = () => {
    if (scope === "book") startQuiz("book");
    else if (scope === "session") {
      startQuiz("session", undefined, pageSpec || formatPages(sessionPrintedPages));
    } else if (selectedChapter) startQuiz("chapter", selectedChapter);
  };

  // ── Results ─────────────────────────────────────────────────────────────
  if (finished) {
    const pct = score.total > 0 ? Math.round((score.right / score.total) * 100) : 0;
    return (
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] dark:bg-[var(--bb-amber)]/10 flex items-center justify-center mb-3 border border-[var(--accent-primary)]/25">
          <Trophy className="h-7 w-7 text-[var(--accent-strong)] dark:text-[var(--accent-primary-dark)]" />
        </div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 tabular-nums">
          {score.right} / {score.total}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {pct >= 80 ? "Strong round." : pct >= 50 ? "Solid — worth another go." : "Worth re-reading this one."}
        </p>
        <div className="flex flex-col gap-2 mt-5 w-full max-w-[15rem]">
          <Button onClick={restart} className="bg-[var(--accent-strong)] hover:bg-[var(--accent-contrast)] text-white">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Ask me again
          </Button>
          <Button variant="ghost" onClick={() => { resetRun(); setScope(null); }} className="text-slate-500">
            Change topic
          </Button>
        </div>
      </div>
    );
  }

  // ── Question ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
          {scopeLabel}
        </span>
        {items.length > 0 && (
          <span className="text-[10px] font-semibold text-slate-400 tabular-nums shrink-0">
            {index + 1} / {items.length}
          </span>
        )}
      </div>

      {loadingQuiz && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-xs">Writing your questions…</span>
        </div>
      )}

      {error && (
        <div className="p-2.5 mb-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-xs border border-red-200 dark:border-red-900 text-center">
          {error}
        </div>
      )}

      {!loadingQuiz && current && (
        <>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed mb-3">
            {current.prompt}
          </p>

          <div className="flex flex-col gap-2">
            {(current.choices ?? []).map((choice) => {
              const isPicked = picked === choice;
              const isAnswer = verdict?.correctAnswer === choice;
              /* After grading: the correct option is always green, and a wrong
                 pick is red. Showing the right answer even when they missed it
                 is the point — being marked wrong without being told what was
                 right teaches nothing. */
              const state = !verdict
                ? isPicked
                  ? "picked"
                  : "idle"
                : isAnswer
                ? "correct"
                : isPicked
                ? "wrong"
                : "idle";

              return (
                <button
                  key={choice}
                  disabled={!!verdict || grading}
                  onClick={() => choose(choice)}
                  className={`w-full text-left text-sm px-3 py-2.5 rounded-xl border transition-colors flex items-start gap-2.5 ${
                    state === "correct"
                      ? "bg-green-50 dark:bg-green-950/30 border-green-400 text-green-800 dark:text-green-300"
                      : state === "wrong"
                      ? "bg-red-50 dark:bg-red-950/30 border-red-400 text-red-800 dark:text-red-300"
                      : state === "picked"
                      ? "bg-[var(--accent-soft)] border-[var(--accent-strong)] text-slate-800 dark:text-slate-200"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  } ${verdict ? "cursor-default" : "hover:border-[var(--accent-strong)] active:scale-[0.99]"}`}
                >
                  {verdict && (state === "correct" || state === "wrong") && (
                    <span className="mt-0.5 shrink-0">
                      {state === "correct" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 whitespace-normal break-words">{choice}</span>
                </button>
              );
            })}
          </div>

          {grading && (
            <div className="flex justify-center pt-3">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          )}

          {verdict && (
            <>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <button
                  onClick={handleExplain}
                  disabled={assisting !== null}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-primary)]/30 px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-contrast)] dark:text-[var(--accent-primary-dark)] hover:border-[var(--accent-strong)] disabled:opacity-50"
                >
                  {assisting === "explain" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Lightbulb className="w-3 h-3" />
                  )}
                  Explain
                </button>
                <button
                  onClick={handleTranslate}
                  disabled={assisting !== null}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-primary)]/30 px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-contrast)] dark:text-[var(--accent-primary-dark)] hover:border-[var(--accent-strong)] disabled:opacity-50"
                >
                  {assisting === "translate" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Languages className="w-3 h-3" />
                  )}
                  {translation && showTranslation ? "Hide translation" : "Translate"}
                </button>
                <button
                  onClick={() => setFinished(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:border-slate-400"
                >
                  <LogOut className="w-3 h-3" />
                  End quiz
                </button>
              </div>

              {explanation && (
                <div className="mt-3 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">
                    Why
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-normal break-words">
                    {explanation}
                  </p>
                </div>
              )}

              {translation && showTranslation && (
                <div className="mt-2 p-3 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/60 dark:bg-sky-950/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400 mb-1">
                    {translation.label}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words">
                    {translation.text}
                  </p>
                </div>
              )}

              <Button
                onClick={next}
                className="w-full mt-3 bg-[var(--accent-strong)] hover:bg-[var(--accent-contrast)] text-white"
              >
                {index + 1 >= items.length ? "See result" : "Next question"}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
