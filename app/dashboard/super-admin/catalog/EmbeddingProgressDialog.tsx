'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
} from '@/components/ui/icons';
import { getBookEmbeddingStatus, type EmbeddingProgress } from '@/lib/api/adminApi';

const POLL_MS = 2000;

interface EmbeddingProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string | null;
  bookTitle?: string;
}

/**
 * Watches one book's ingestion while it runs.
 *
 * Polls rather than streams: a run is seconds-to-minutes and there is no socket
 * lane to the backend, so a 2s poll is the honest cost. Polling STOPS the moment
 * the run settles or the dialog closes — an interval left running behind a
 * closed dialog is how a dashboard quietly generates requests forever.
 *
 * The bar is driven by the QUEUE's progress, not the status row. The processor
 * calls `job.updateProgress()` after setup and again after each chapter, while
 * `bookEmbeddingStatus` sits on PROCESSING for the whole run — so a bar fed by
 * the row would sit at zero and then jump, which is worse than no bar.
 */
export function EmbeddingProgressDialog({
  open,
  onOpenChange,
  bookId,
  bookTitle,
}: EmbeddingProgressDialogProps) {
  const [data, setData] = useState<EmbeddingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Survives re-renders so an in-flight poll that resolves after close cannot
  // schedule the next one.
  const activeRef = useRef(false);

  useEffect(() => {
    if (!open || !bookId) return;

    activeRef.current = true;
    setLoading(true);
    setError(null);

    const poll = async () => {
      const res = await getBookEmbeddingStatus(bookId);
      if (!activeRef.current) return;

      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Could not read indexing status.');
        return; // stop polling — a broken lane will not fix itself in 2s
      }

      const next = res.data as EmbeddingProgress;
      setData(next);

      if (next.running) {
        timerRef.current = setTimeout(poll, POLL_MS);
      }
    };

    void poll();

    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [open, bookId]);

  // A fresh open should not flash the previous book's result.
  useEffect(() => {
    if (!open) {
      setData(null);
      setError(null);
    }
  }, [open]);

  const status = (data?.status ?? '').toUpperCase();
  const isReady = status === 'READY';
  const isFailed = status === 'FAILED';
  const running = !!data?.running;

  // Null progress means there is no job to measure — finished and evicted, or
  // never started. Show a full bar for a settled run rather than an empty one,
  // which would read as "nothing happened".
  const pct =
    typeof data?.progress === 'number'
      ? Math.max(0, Math.min(100, data.progress))
      : isReady || isFailed
        ? 100
        : 0;

  const heading = running
    ? 'Indexing in progress'
    : isReady
      ? 'Indexing complete'
      : isFailed
        ? 'Indexing failed'
        : 'Indexing status';

  const queueLabel: Record<string, string> = {
    waiting: 'Waiting for a worker',
    delayed: 'Retrying shortly',
    prioritized: 'Queued',
    active: 'Sending chapters to the index',
    completed: 'Finished',
    failed: 'Stopped',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* DialogContent ships its own ✕ close control, top-right. */}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="mx-auto mb-3 relative">
            <div
              className={`absolute inset-0 rounded-full blur-xl scale-150 ${
                isFailed
                  ? 'bg-red-500/20'
                  : isReady
                    ? 'bg-emerald-500/20'
                    : 'bg-cyan-500/20 animate-pulse'
              }`}
            />
            <div
              className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm ${
                isFailed
                  ? 'bg-bb-danger-soft border-red-200 dark:border-red-800/50'
                  : isReady
                    ? 'bg-bb-success-soft border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-bb-info-soft border-transparent'
              }`}
            >
              {isFailed ? (
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              ) : isReady ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              ) : running ? (
                <Loader2 className="h-8 w-8 text-cyan-600 dark:text-cyan-400 animate-spin" />
              ) : (
                <BrainCircuit className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
              )}
            </div>
          </div>
          <DialogTitle className="text-center text-lg font-bold text-slate-900 dark:text-white">
            {heading}
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            {data?.bookTitle || bookTitle || 'This book'}
            {typeof data?.chapterCount === 'number' && data.chapterCount > 0 && (
              <> · {data.chapterCount} chapter{data.chapterCount === 1 ? '' : 's'}</>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading && !data && !error && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading status…
          </div>
        )}

        {error && (
          <div className="flex gap-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/25 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <p className="text-xs leading-relaxed text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                  {status || 'UNKNOWN'}
                </span>
                <span className="font-medium text-muted-foreground tabular-nums">
                  {typeof data.progress === 'number' ? `${pct}%` : '—'}
                </span>
              </div>
              <Progress
                value={pct}
                className={
                  isFailed
                    ? '[&>div]:bg-red-500'
                    : isReady
                      ? '[&>div]:bg-emerald-500'
                      : '[&>div]:bg-cyan-500'
                }
              />
              {data.queueState && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {queueLabel[data.queueState] ?? data.queueState}
                </p>
              )}
            </div>

            {data.totalChunks > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/40 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">
                  {data.embeddedChunks}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-foreground tabular-nums">
                  {data.totalChunks}
                </span>{' '}
                chunks indexed
              </div>
            )}

            {isFailed && data.errorMessage && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/25 p-3">
                {/* The backend's message is the useful part — DCP refuses with a
                    reason an operator can act on (not APPROVED, missing chapter
                    number, ISBN mismatch). Showing it verbatim is the point. */}
                <p className="text-xs leading-relaxed text-red-800 dark:text-red-200 whitespace-pre-wrap break-words">
                  {data.errorMessage}
                </p>
              </div>
            )}

            {running && (
              <p className="text-center text-xs text-muted-foreground">
                You can close this — indexing continues on the server.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
