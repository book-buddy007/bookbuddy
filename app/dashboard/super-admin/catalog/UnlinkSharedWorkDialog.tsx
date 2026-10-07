'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, CheckCircle2, Link2Off, Loader2 } from '@/components/ui/icons';
import { catalogKeys } from '@/lib/query-keys';
import {
  getBookEmbeddingStatus,
  unlinkBookFromSharedWork,
  type EmbeddingProgress,
  type UnlinkOutcome,
} from '@/lib/api/adminApi';

const POLL_MS = 2000;

export interface UnlinkSharedWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: { id: string; title: string } | null;
}

type Phase = 'confirm' | 'working' | 'done' | 'failed';

const OUTCOMES: Array<{ value: UnlinkOutcome; label: string; detail: string }> = [
  {
    value: 'retire',
    label: 'Retire it',
    detail:
      'Unlink and move it to the Bin in one step. It can be restored from the Bin tab, but it will no longer be linked to the shared library.',
  },
  {
    value: 'keep',
    label: 'Keep it here',
    detail:
      'Unlink and keep the book. It keeps its details and cover, but has no files or index until you upload and embed them yourself. Borrowing is paused if it has no files of its own.',
  },
];

/**
 * Take a book off the shared library (PDLMS's hub).
 *
 * The admin chooses what happens to the book, because the two reasons for doing this need different
 * things: retiring a book Book Buddy no longer wants (unlink and Bin, one action, so a half-retired
 * book is never left behind), or keeping the book to give it files of its own.
 *
 * The work is done by a background job (tell PDLMS, then detach the book), so this dialog follows the
 * job the way the link and embed dialogs do and shows its real result. A failure leaves the book
 * exactly as it was, still linked, and says why; "Try again" is safe because every step can be repeated.
 */
export function UnlinkSharedWorkDialog({ open, onOpenChange, book }: UnlinkSharedWorkDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [outcome, setOutcome] = useState<UnlinkOutcome>('retire');
  const [phase, setPhase] = useState<Phase>('confirm');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<EmbeddingProgress | null>(null);
  // The outcome the queued job was started with, so the result text matches it even if the radio moves.
  const [started, setStarted] = useState<UnlinkOutcome>('retire');
  const activeRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The polling effect below must restart only when the dialog opens, the phase changes or the book
  // does. `toast` and the book object change identity on renders, and each poll sets state and so
  // renders: listing them as dependencies restarted the effect on every poll, in a loop. They are read
  // through refs instead.
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const titleRef = useRef(book?.title ?? '');
  titleRef.current = book?.title ?? '';
  const bookId = book?.id ?? null;

  // Every open starts fresh, on "Retire it": the common reason for unlinking is a book Book Buddy no longer wants.
  useEffect(() => {
    if (open) {
      setOutcome('retire');
      setPhase('confirm');
      setError(null);
      setProgress(null);
    }
  }, [open, book?.id]);

  const unlink = useMutation({
    mutationFn: async () => {
      const res = await unlinkBookFromSharedWork(book!.id, outcome);
      if (!res.success) throw new Error(res.error || 'Could not start unlinking.');
      return res.data!;
    },
    onSuccess: (data) => {
      setStarted(data.outcome);
      setError(null);
      setPhase('working');
    },
    onError: (err: Error) => setError(err.message),
  });

  // Follow the job. Stops the moment it settles or the dialog closes: an interval left running behind
  // a closed dialog is how a dashboard quietly generates requests forever.
  useEffect(() => {
    if (!open || phase !== 'working' || !bookId) return;
    activeRef.current = true;

    const poll = async () => {
      const res = await getBookEmbeddingStatus(bookId);
      if (!activeRef.current) return;
      if (!res.success) {
        setError(res.error || 'Could not read the progress of unlinking.');
        setPhase('failed');
        return;
      }
      const next = res.data as EmbeddingProgress;
      setProgress(next);

      if (next.queueState === 'completed') return finish();
      if (next.queueState === 'failed') {
        setError(next.errorMessage || 'Unlinking failed.');
        setPhase('failed');
        void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
        return;
      }
      // No job left to measure (finished and cleared) and the book is no longer "ready": it worked.
      if (next.queueState === null && String(next.status).toUpperCase() === 'NONE') return finish();
      timerRef.current = setTimeout(poll, POLL_MS);
    };

    const finish = () => {
      setPhase('done');
      void queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      toastRef.current({
        title: 'Taken off the shared library',
        description: `"${titleRef.current}" is no longer linked to the shared library.`,
      });
    };

    void poll();
    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [open, phase, bookId, queryClient]);

  if (!book) return null;

  const busy = unlink.isPending || phase === 'working';
  const pct = typeof progress?.progress === 'number' ? Math.max(0, Math.min(100, progress.progress)) : 0;
  const queueLabel: Record<string, string> = {
    waiting: 'Waiting for a worker',
    prioritized: 'Queued',
    delayed: 'Retrying shortly',
    active: 'Telling PDLMS, then detaching the book',
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-bb-warning-soft">
            {phase === 'done' ? (
              <CheckCircle2 className="h-7 w-7 text-bb-success-ink" />
            ) : phase === 'failed' ? (
              <AlertTriangle className="h-7 w-7 text-bb-danger-ink" />
            ) : phase === 'working' ? (
              <Loader2 className="h-7 w-7 animate-spin text-bb-info-ink" />
            ) : (
              <Link2Off className="h-7 w-7 text-bb-warning-ink" />
            )}
          </div>
          <DialogTitle className="text-center text-lg font-bold text-bb-text dark:text-white">
            {phase === 'done'
              ? 'Taken off the shared library'
              : phase === 'failed'
                ? 'Could not unlink'
                : phase === 'working'
                  ? 'Unlinking…'
                  : 'Unlink from the shared library?'}
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            <strong className="text-foreground">{book.title}</strong>
          </DialogDescription>
        </DialogHeader>

        {phase === 'confirm' && (
          <div className="space-y-4">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-bb-muted">
              <li>PDLMS stops counting Book Buddy as a user of this book. Nothing at PDLMS is changed or deleted.</li>
              <li>Readers lose the PDF and EPUB streamed from PDLMS, and Varta can no longer answer from this book.</li>
              <li>Annotations, reading progress and chat history are kept.</li>
              <li>Anyone reading it right now loses access within about five minutes.</li>
            </ul>

            <RadioGroup value={outcome} onValueChange={(v) => setOutcome(v as UnlinkOutcome)} className="gap-2.5">
              {OUTCOMES.map((o) => (
                <label
                  key={o.value}
                  htmlFor={`unlink-outcome-${o.value}`}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${
                    outcome === o.value ? 'border-bb-info/50 bg-bb-info-soft/40' : 'border-bb-border bg-bb-surface-2/50'
                  }`}
                >
                  <RadioGroupItem id={`unlink-outcome-${o.value}`} value={o.value} className="mt-0.5 shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold text-bb-text">{o.label}</span>
                    <span className="block text-xs leading-relaxed text-bb-muted">{o.detail}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>

            {error && (
              <div role="alert" className="flex gap-2.5 rounded-xl border border-bb-danger/30 bg-bb-danger-soft/70 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bb-danger-ink" />
                <p className="text-xs leading-relaxed text-bb-danger-ink">{error}</p>
              </div>
            )}
          </div>
        )}

        {phase === 'working' && (
          <div className="space-y-3" aria-live="polite">
            <Progress value={pct} className="h-2" />
            <p className="text-center text-xs text-bb-muted">
              {queueLabel[progress?.queueState ?? 'waiting'] ?? 'Working'}
              {pct ? ` · ${pct}%` : ''}
            </p>
          </div>
        )}

        {phase === 'done' && (
          <p className="text-center text-sm leading-relaxed text-bb-muted" aria-live="polite">
            {started === 'retire'
              ? 'The book is in the Bin and no longer linked. Annotations, progress and chat history were kept.'
              : 'The book is now Book Buddy’s own. Upload its PDF/EPUB and chapter markdown, then embed it, to bring it back into use.'}
          </p>
        )}

        {phase === 'failed' && (
          <div role="alert" className="space-y-2">
            <div className="flex gap-2.5 rounded-xl border border-bb-danger/30 bg-bb-danger-soft/70 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bb-danger-ink" />
              <p className="text-xs leading-relaxed text-bb-danger-ink">{error}</p>
            </div>
            <p className="text-center text-xs text-bb-muted">The book was not changed. It is safe to try again.</p>
          </div>
        )}

        <DialogFooter className="mt-2 gap-2 sm:gap-0">
          {phase === 'confirm' && (
            <>
              <EnhancedButton variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="rounded-xl">
                Cancel
              </EnhancedButton>
              <EnhancedButton onClick={() => unlink.mutate()} disabled={busy} className="gap-2 rounded-xl text-white shadow-sm">
                {unlink.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Starting…
                  </>
                ) : outcome === 'retire' ? (
                  'Unlink and move to Bin'
                ) : (
                  'Unlink and keep'
                )}
              </EnhancedButton>
            </>
          )}
          {phase === 'failed' && (
            <>
              <EnhancedButton variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Close
              </EnhancedButton>
              <EnhancedButton onClick={() => { setError(null); setProgress(null); setPhase('confirm'); }} className="rounded-xl text-white shadow-sm">
                Try again
              </EnhancedButton>
            </>
          )}
          {phase === 'done' && (
            <EnhancedButton onClick={() => onOpenChange(false)} className="rounded-xl text-white shadow-sm">
              Done
            </EnhancedButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
