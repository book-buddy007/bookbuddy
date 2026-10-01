'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '@/lib/query-keys';
import { deleteGlobalCatalogBookFormat } from '@/lib/api/adminApi';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { AlertTriangle, Loader2, Trash2, BrainCircuit } from '@/components/ui/icons';

/** One format file, as the drawer knows it. */
export interface FormatFileTarget {
  id: string;
  type: string;
  partIndex?: number;
  filename: string;
  sizeLabel: string;
  bookId: string;
  bookTitle: string;
}

interface DeleteFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: FormatFileTarget | null;
}

/**
 * Two gates, not one. A book can hold several enriched-markdown files whose
 * names differ by two characters (…ch08…, …ch09…), so the realistic mistake
 * here is not "deleted something by accident" — it is "deleted the wrong
 * chapter and could not tell". The first gate makes the operator affirm which
 * file this is in words; the second is the house type-to-confirm. Typing alone
 * is muscle memory and would not catch it.
 */
export function DeleteFormatDialog({ open, onOpenChange, target }: DeleteFormatDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const reset = () => { setAcknowledged(false); setConfirmText(''); };

  // A different file selected must not inherit the previous file's confirmation.
  useEffect(() => { reset(); }, [target?.id]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteGlobalCatalogBookFormat(target!.bookId, target!.id),
    onSuccess: (res: any) => {
      if (!res.success) {
        toast({ title: 'Delete Failed', description: res.error, variant: 'destructive' });
        return;
      }
      // The markdown's embedded chunks live in the shared trio index, which this
      // app cannot delete from. Reporting a clean removal would leave the
      // operator believing the tutor can no longer quote a chapter it still can.
      const spineResidue = res.data?.spineResidue;
      toast({
        title: '🗑️ File Deleted',
        description: spineResidue
          ? `${target!.filename} is gone from the server. Its embedded text remains in the shared index until this book is re-ingested.`
          : `${target!.filename} was removed from the library and the server.`,
      });
      queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'book-detail', target!.bookId] });
      onOpenChange(false);
      reset();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to delete file', variant: 'destructive' });
    },
  });

  if (!target) return null;

  const isMarkdown = target.type === 'AI_EMBED';
  const whatItIs = isMarkdown
    ? `chapter ${target.partIndex ?? '—'}'s enriched markdown`
    : `the ${target.type.toLowerCase()} file`;
  const canConfirm = acknowledged && confirmText.trim().toLowerCase() === 'delete';

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!deleteMutation.isPending) { onOpenChange(v); reset(); } }}
    >
      <DialogContent className="sm:max-w-[460px] border-red-200/50 dark:border-red-900/40">
        <DialogHeader>
          <div className="mx-auto mb-3 relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse scale-150" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-bb-danger-soft border border-red-200 dark:border-red-800/50 shadow-sm">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg font-bold text-slate-900 dark:text-white">
            Delete This File From The Server?
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            Removes {whatItIs} from <strong className="text-foreground">{target.bookTitle}</strong> and
            deletes the stored file. The book itself stays.
            This <strong className="text-red-600 dark:text-red-400">cannot be undone</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* The file's own identity, spelled out — the whole point of gate one. */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold uppercase tracking-wider text-muted-foreground">
              {target.type}{isMarkdown && target.partIndex ? ` · Chapter ${target.partIndex}` : ''}
            </span>
            <span className="font-medium text-muted-foreground">{target.sizeLabel}</span>
          </div>
          <p className="font-mono text-[11px] leading-snug break-all text-slate-700 dark:text-slate-300">
            {target.filename}
          </p>
        </div>

        {isMarkdown && (
          <div className="flex gap-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/25 p-3">
            <BrainCircuit className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
              Already-embedded text is <strong>not</strong> removed. This chapter's chunks stay in the
              shared index — and the tutor can still quote them — until the book is re-ingested.
            </p>
          </div>
        )}

        {/* Gate 1 — affirm which file, in words. */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            disabled={deleteMutation.isPending}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 dark:border-slate-600 text-red-600 focus:ring-2 focus:ring-red-500/40 cursor-pointer"
          />
          <span className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            I mean to delete <strong className="text-foreground">{whatItIs}</strong>
            {isMarkdown ? ', not another chapter' : ''}.
          </span>
        </label>

        {/* Gate 2 — the house type-to-confirm. */}
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-2">
            Type{' '}
            <span className="font-mono bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-md text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40">
              delete
            </span>{' '}
            to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete"
            disabled={deleteMutation.isPending || !acknowledged}
            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm
 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400
              bg-white dark:bg-slate-900 transition-all duration-200 disabled:opacity-50
              placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <EnhancedButton
            variant="outline"
            onClick={() => { onOpenChange(false); reset(); }}
            disabled={deleteMutation.isPending}
            className="rounded-xl"
          >
            Cancel
          </EnhancedButton>
          <EnhancedButton
            onClick={() => deleteMutation.mutate()}
            disabled={!canConfirm || deleteMutation.isPending}
            className={`gap-2 rounded-xl text-white shadow-sm transition-all duration-200
              ${canConfirm
                ? 'bg-bb-danger hover:brightness-95 shadow-red-500/20'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
              }`}
          >
            {deleteMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</>
            ) : (
              <><Trash2 className="h-4 w-4" /> Delete File</>
            )}
          </EnhancedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
