import { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Mic2,
  FileText,
} from "lucide-react";

interface RecapContentProps {
  bookId: string;
  isDarkMode?: boolean;
}

interface DigestLine {
  speaker: string;
  line: string;
}

type DigestStatus = "SCRIPT_READY" | "AUDIO_READY" | "AUDIO_FAILED";

interface Digest {
  scriptJson: DigestLine[];
  status: DigestStatus;
  audioUri?: string | null;
}

/* Embedded as the "Recap" tab inside VartaSidebar (was a standalone
   top-toolbar panel — folded in as part of the reader consolidation). */
export function RecapContent({ bookId, isDarkMode = false }: RecapContentProps) {
  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingDigest, setLoadingDigest] = useState(false);
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

  const loadDigest = useCallback(
    (chapterTitle: string) => {
      setSelectedChapter(chapterTitle);
      setDigest(null);
      setError(null);
      setLoadingDigest(true);
      fetch(`/api/books/${bookId}/chapters/${encodeURIComponent(chapterTitle)}/digest`, {
        method: "POST",
        credentials: "include",
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data: Digest) => setDigest(data))
        .catch(() => setError("Could not generate a recap for this chapter."))
        .finally(() => setLoadingDigest(false));
    },
    [bookId],
  );

  return (
    <div className="flex flex-col h-full">
      <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-medium px-4 pt-3 pb-1 shrink-0">
        A two-voice conversation recapping a chapter — auto-generated from the text.
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
                  onClick={() => loadDigest(ch)}
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

          {loadingDigest && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">Writing the recap…</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-900 text-center">
              {error}
            </div>
          )}

          {digest && !loadingDigest && (
            <>
              {/* Honest status note — no TTS vendor is wired up yet, so this
                  is always a script today. Telling the student that plainly
                  beats a play button that silently does nothing. */}
              {digest.status === "AUDIO_READY" && digest.audioUri ? (
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-3">
                  <audio controls src={digest.audioUri} className="w-full h-9" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-full px-3 py-1.5 w-fit">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Script only — spoken narration isn&apos;t connected yet</span>
                </div>
              )}

              <div className="space-y-3">
                {digest.scriptJson.map((line, idx) => {
                  const isHost = line.speaker.toLowerCase() === "host";
                  return (
                    <div key={idx} className={`flex gap-3 ${isHost ? "flex-row" : "flex-row-reverse"}`}>
                      <div
                        className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center ${
                          isHost ? "bg-gradient-to-br from-indigo-500 to-purple-500" : "bg-slate-200 dark:bg-slate-800"
                        }`}
                      >
                        <Mic2 className={`w-4 h-4 ${isHost ? "text-white" : "text-slate-600 dark:text-slate-300"}`} />
                      </div>
                      <div className="flex flex-col gap-1 max-w-[80%]">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {line.speaker}
                        </span>
                        <div
                          className={`p-3 rounded-2xl text-sm ${
                            isHost
                              ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-slate-800 dark:text-slate-200 rounded-tl-sm"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tr-sm"
                          }`}
                        >
                          {line.line}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
