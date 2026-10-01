'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '@/lib/query-keys';
import { purgeCatalogBook } from '@/lib/api/adminApi';
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
import { AlertTriangle, Loader2, Trash2, FileX, BrainCircuit, Network } from '@/components/ui/icons';

interface PurgeBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: { id: string; title: string; author: string } | null;
}

/**
 * Permanent, irreversible delete FROM THE BIN. Flushes — scoped to this one book
 * — its Cloudflare R2 files (covers, sample, every format), its embeddings in the
 * shared trio index, and its entire concept graph, then deletes the row. Guarded
 * by a type-to-confirm gate because there is no undo.
 */
export function PurgeBookDialog({ open, onOpenChange, book }: PurgeBookDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');

  const purgeMutation = useMutation({
    mutationFn: () => purgeCatalogBook(book!.id),
    onSuccess: (res) => {
      if (res.success) {
        // The backend reports how the shared-index flush went — surface any
        // residue honestly (e.g. spine rows only DCP can remove) rather than
        // implying a clean wipe.
        const emb = res.data?.embeddings;
        const residue = emb && emb.ok === false ? ` Note: ${emb.detail}` : '';
        toast({
          title: '✅ Permanently Deleted',
          description: `"${book!.title}" and all its files, embeddings and map were removed.${residue}`,
        });
        queryClient.invalidateQueries({ queryKey: catalogKeys.all });
        onOpenChange(false);
        setConfirmText('');
      } else {
        toast({ title: 'Delete Failed', description: res.error, variant: 'destructive' });
      }
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to permanently delete book', variant: 'destructive' });
    },
  });

  if (!book) return null;

  const canConfirm = confirmText.toLowerCase() === 'delete';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!purgeMutation.isPending) { onOpenChange(v); setConfirmText(''); } }}>
      <DialogContent className="sm:max-w-[460px] border-red-200/50 dark:border-red-900/40">
        <DialogHeader>
          <div className="mx-auto mb-3 relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse scale-150" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-bb-danger-soft border border-red-200 dark:border-red-800/50 shadow-sm">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg font-bold text-slate-900 dark:text-white">Delete Permanently?</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            This permanently deletes <strong className="text-foreground">{book.title}</strong> by {book.author}. This action <strong className="text-red-600 dark:text-red-400">cannot be undone</strong> and affects only this book.
          </DialogDescription>
        </DialogHeader>

        {/* What gets flushed */}
        <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <FileX className="h-4 w-4 text-red-500 shrink-0" /> All files in storage (covers, sample, PDF/EPUB/audio/markdown)
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <BrainCircuit className="h-4 w-4 text-red-500 shrink-0" /> Its embeddings in the shared AI index
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Network className="h-4 w-4 text-red-500 shrink-0" /> Its entire concept map (graph)
          </div>
        </div>

        <div className="my-2">
          <label className="text-sm font-medium text-muted-foreground block mb-2">
            Type <span className="font-mono bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-md text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40">delete</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="delete"
            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm
 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400
              bg-white dark:bg-slate-900 transition-all duration-200
              placeholder:text-slate-400 dark:placeholder:text-slate-600"
            disabled={purgeMutation.isPending}
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <EnhancedButton
            variant="outline"
            onClick={() => { onOpenChange(false); setConfirmText(''); }}
            disabled={purgeMutation.isPending}
            className="rounded-xl"
          >
            Cancel
          </EnhancedButton>
          <EnhancedButton
            onClick={() => purgeMutation.mutate()}
            disabled={!canConfirm || purgeMutation.isPending}
            className={`gap-2 rounded-xl text-white shadow-sm transition-all duration-200
              ${canConfirm
                ? 'bg-bb-danger hover:brightness-95 shadow-red-500/20'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
              }`}
          >
            {purgeMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</>
            ) : (
              <><Trash2 className="h-4 w-4" /> Delete Forever</>
            )}
          </EnhancedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
