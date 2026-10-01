import { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2, Lightbulb } from "@/components/ui/icons";

interface SimplifyContentProps {
  bookId: string;
  isDarkMode?: boolean;
}

interface AdaptiveFlag {
  paragraphId: string;
  pageNumber: number | null;
  textPreview: string;
  needsSimplification: boolean;
  weakConceptLabels: string[];
}

/* Why there is nothing to simplify — see AdaptiveCoverage in
   backend/src/text-adaptation/text-adaptation.service.ts. Four distinct states
   used to render as one sentence claiming the reader had mastered the chapter,
   which was false whenever the concept graph simply didn't exist. */
type AdaptiveCoverage =
  | "chapter_not_ingested"
  | "no_concept_graph"
  | "no_mastery_data"
  | "ready";

interface AdaptiveFlagsResult {
  coverage: AdaptiveCoverage;
  flags: AdaptiveFlag[];
}

/* Each message states what is actually true and, where the reader can do
   something about it, what that is. "Take a quiz" is real advice; "you've
   mastered this" was not. */
const COVERAGE_MESSAGE: Record<Exclude<AdaptiveCoverage, "ready">, string> = {
  chapter_not_ingested:
    "This chapter hasn't been prepared for AI study tools yet, so there's nothing to check.",
  no_concept_graph:
    "This book hasn't been analysed for key concepts yet, so Varta can't tell which passages you'd find hard.",
  no_mastery_data:
    "Take a chapter quiz first — Varta uses your quiz answers to work out which passages to simplify for you.",
};

const TARGET_LEVEL = "grade_6";

/**
 * §10 concept-aware adaptive text rewriting. Deviates from the spec's
 * "swap the paragraph inline" UI: the reader renders PDFs via a canvas
 * (@react-pdf-viewer/pdf.js), not addressable per-paragraph DOM, so there's
 * nothing to swap inline into. This surfaces the same underlying value —
 * only flagged paragraphs, only for concepts *this* reader hasn't
 * mastered — as a standalone panel instead, same scope call as the
 * playback-clock (§5) and visual-grounding (§9) frontend pieces.
 *
 * Embedded as the "Simplify" tab inside VartaSidebar (was a standalone
 * top-toolbar panel — folded in as part of the reader consolidation).
 */
export function SimplifyContent({ bookId, isDarkMode = false }: SimplifyContentProps) {
  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [flags, setFlags] = useState<AdaptiveFlag[]>([]);
  const [coverage, setCoverage] = useState<AdaptiveCoverage | null>(null);
  const [simplified, setSimplified] = useState<Record<string, string>>({});
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [simplifyingId, setSimplifyingId] = useState<string | null>(null);
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

  const loadFlags = useCallback(
    (chapterTitle: string) => {
      setSelectedChapter(chapterTitle);
      setFlags([]);
      setCoverage(null);
      setSimplified({});
      setError(null);
      setLoadingFlags(true);
      fetch(`/api/books/${bookId}/chapters/${encodeURIComponent(chapterTitle)}/adaptive-flags`, {
        credentials: "include",
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data: AdaptiveFlagsResult) => {
          setCoverage(data?.coverage ?? null);
          setFlags(
            Array.isArray(data?.flags) ? data.flags.filter((f) => f.needsSimplification) : [],
          );
        })
        .catch(() => setError("Could not check this chapter for simplifiable passages."))
        .finally(() => setLoadingFlags(false));
    },
    [bookId],
  );

  const handleSimplify = (paragraphId: string) => {
    setSimplifyingId(paragraphId);
    fetch(`/api/books/${bookId}/paragraphs/${paragraphId}/simplify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLevel: TARGET_LEVEL }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { content: string }) =>
        setSimplified((prev) => ({ ...prev, [paragraphId]: data.content })),
      )
      .catch(() => setError("Could not simplify this passage. Please try again."))
      .finally(() => setSimplifyingId(null));
  };

  return (
    <div className="flex flex-col h-full">
      <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-medium px-4 pt-3 pb-1 shrink-0">
        Passages touching concepts you haven't mastered yet — rewritten in simpler language.
      </p>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {loadingChapters && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {!loadingChapters && chapters.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
              This book hasn&apos;t been split into chapters yet.
            </p>
          )}

          {!loadingChapters && chapters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chapters.map((ch) => (
                <button
                  key={ch}
                  onClick={() => loadFlags(ch)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    selectedChapter === ch
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          )}

          {loadingFlags && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">Checking this chapter…</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-900 text-center">
              {error}
            </div>
          )}

          {selectedChapter && !loadingFlags && !error && flags.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
              {coverage && coverage !== "ready"
                ? COVERAGE_MESSAGE[coverage]
                : "Nothing to simplify here — this chapter only touches concepts you've already mastered."}
            </p>
          )}

          {flags.map((flag) => (
            <div
              key={flag.paragraphId}
              className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10 space-y-2"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                <Lightbulb className="w-3 h-3" />
                {flag.weakConceptLabels.join(", ")}
                {flag.pageNumber && <span className="text-slate-400 font-normal normal-case ml-auto">Pg. {flag.pageNumber}</span>}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-3">
                {flag.textPreview}
              </p>

              {simplified[flag.paragraphId] ? (
                <div className="text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-slate-200 dark:border-slate-700">
                  {simplified[flag.paragraphId]}
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400"
                  disabled={simplifyingId === flag.paragraphId}
                  onClick={() => handleSimplify(flag.paragraphId)}
                >
                  {simplifyingId === flag.paragraphId ? (
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-1.5" />
                  )}
                  Simplify this passage
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
