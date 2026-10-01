'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '@/lib/query-keys';
import { deleteGlobalCatalogBook } from '@/lib/api/adminApi';
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
import { Loader2, Trash2 } from '@/components/ui/icons';

interface DeleteBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: { id: string; title: string; author: string } | null;
}

/**
 * "Delete" is now a SOFT delete — it moves the book to the Bin, where it is
 * hidden from the library but fully recoverable. Nothing in storage, the
 * shared index or the graph is touched here; that only happens on an explicit
 * purge from the Bin (see PurgeBookDialog). Because it is reversible, this needs
 * only a simple confirm, not a type-to-confirm gate.
 */
export function DeleteBookDialog({ open, onOpenChange, book }: DeleteBookDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteGlobalCatalogBook(book!.id),
    onSuccess: (res) => {
      if (res.success) {
        toast({ title: '🗑️ Moved to Bin', description: `"${book!.title}" is in the Bin. You can restore it or delete it permanently there.` });
        queryClient.invalidateQueries({ queryKey: catalogKeys.all });
        onOpenChange(false);
      } else {
        toast({ title: 'Could not move to Bin', description: res.error, variant: 'destructive' });
      }
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to move book to Bin', variant: 'destructive' });
    },
  });

  if (!book) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!deleteMutation.isPending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[440px] border-bb-warning/50">
        <DialogHeader>
          <div className="mx-auto mb-3 relative">
            <div className="absolute inset-0 bg-bb-warning/20 rounded-full blur-xl animate-pulse scale-150" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-bb-progress border border-bb-warning/30 shadow-sm">
              <Trash2 className="h-8 w-8 text-bb-warning-ink" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg font-bold text-bb-text dark:text-white">Move to Bin?</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            <strong className="text-foreground">{book.title}</strong> by {book.author} will be moved to the Bin and hidden from the library. It stays fully recoverable — files, embeddings and its map are only deleted when you permanently delete it from the Bin.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <EnhancedButton
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
            className="rounded-xl"
          >
            Cancel
          </EnhancedButton>
          <EnhancedButton
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="gap-2 rounded-xl text-white shadow-sm"
          >
            {deleteMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Moving...</>
            ) : (
              <><Trash2 className="h-4 w-4" /> Move to Bin</>
            )}
          </EnhancedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
