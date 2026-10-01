'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '@/lib/query-keys';
import { updateCatalogBook } from '@/lib/api/adminApi';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { BookOpen, CheckCircle, Loader2, Sparkles, X } from '@/components/ui/icons';
import type { BookUpdatePayload } from '@/types/book-update.types';

export interface EditBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: {
    id: string;
    title: string;
    author: string;
    publisher?: string | null;
    publishYear?: number | null;
    isbn?: string | null;
    language?: string | null;
    description?: string | null;
  } | null;
}

export function EditBookDialog({ open, onOpenChange, book }: EditBookDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<BookUpdatePayload>>({});

  // Initialize form when book changes
  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        publisher: book.publisher || '',
        publishYear: book.publishYear || undefined,
        isbn: book.isbn || '',
        language: book.language || 'en',
        description: book.description || '',
        licenseType: (book as any).licenseType ?? 'UNKNOWN',
        aiEmbedEnabled: (book as any).aiEmbedEnabled ?? false,
      });
    }
  }, [book]);

  const updateForm = (key: keyof BookUpdatePayload, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!book) throw new Error('No book selected');
      
      // Clean up the payload slightly to ensure empty strings are handled well if backend requires it,
      // but typical partial update passing is fine.
      const payload: Partial<BookUpdatePayload> = {
        title: formData.title,
        author: formData.author,
        publisher: formData.publisher,
        publishYear: formData.publishYear ? Number(formData.publishYear) : undefined,
        isbn: formData.isbn,
        language: formData.language,
        description: formData.description,
        licenseType: formData.licenseType,
        aiEmbedEnabled: formData.aiEmbedEnabled,
      };
      
      const res = await updateCatalogBook(book.id, payload);
      // Wait for backend response structure handling:
      // The adminApi.ts updateCatalogBook doesn't standardize {success, data} manually but returns res.data
      if (res.success === false) {
          throw new Error(res.error || 'Failed to update book');
      }
      return res;
    },
    onSuccess: () => {
      toast({ title: '✅ Book Updated', description: 'The changes have been saved successfully.' });
      queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: '❌ Update Failed', description: err.message || 'Failed to update book', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author) {
      toast({ title: 'Validation Error', description: 'Title and Author are required', variant: 'destructive' });
      return;
    }
    updateMutation.mutate();
  };

  if (!book) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[700px] p-0 border-0 shadow-2xl overflow-hidden flex flex-col"
        aria-describedby={undefined}
      >
        <div className="flex flex-col max-h-[90dvh] overflow-hidden">
          {/* Header — Indic Warm Gradient */}
          <div className="relative overflow-hidden bg-bb-navy px-6 py-5 shrink-0">
            <div className="absolute inset-0 opacity-25 pointer-events-none" style={{backgroundImage: 'radial-gradient(ellipse at 80% 20%, rgba(255,77,0,0.35) 0%, transparent 55%), radial-gradient(circle at 15% 60%, rgba(30,58,138,0.25) 0%, transparent 50%)'}} />
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-bb-accent/[0.06] rounded-full blur-3xl" />
            <div className="relative z-10">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2.5">
                  <div className="bg-bb-surface/15 backdrop-blur-sm rounded-lg p-1.5 border border-white/10"><BookOpen className="h-5 w-5" /></div>
                  Edit Book <span className="text-bb-accent">Details</span>
                </DialogTitle>
              </DialogHeader>
            </div>
            {/* Custom Close Button overriding Radix default for better aesthetics */}
            <button 
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full bg-bb-surface/10 hover:bg-bb-surface/20 text-white/80 hover:text-white transition-colors z-20 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* Body */}
            <div className="px-6 py-6 flex-1 overflow-y-auto bg-bb-bg space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-sm font-semibold">Book Title <span className="text-bb-danger-ink">*</span></Label>
                  <Input 
                    placeholder="e.g. The AI Revolution" 
                    className="rounded-xl bg-bb-surface border-bb-border/80 focus:ring-2 focus:ring-bb-cobalt/25 focus:border-bb-cobalt/50 transition-all font-medium" 
                    value={formData.title || ''} 
                    onChange={e => updateForm('title', e.target.value)} 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Author(s) <span className="text-bb-danger-ink">*</span></Label>
                  <Input 
                    placeholder="Author names" 
                    className="rounded-xl bg-bb-surface border-bb-border/80 focus:ring-2 focus:ring-bb-cobalt/25 focus:border-bb-cobalt/50 transition-all" 
                    value={formData.author || ''} 
                    onChange={e => updateForm('author', e.target.value)} 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Language</Label>
                  <Select value={formData.language || 'en'} onValueChange={v => updateForm('language', v)}>
                    <SelectTrigger className="rounded-xl bg-bb-surface border-bb-border/80 focus:ring-2 focus:ring-bb-cobalt/25">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="mr">Marathi</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="ta">Tamil</SelectItem>
                      <SelectItem value="te">Telugu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">ISBN (Optional)</Label>
                  <Input 
                    placeholder="ISBN-13 or ISBN-10" 
                    className="rounded-xl bg-bb-surface border-bb-border/80 focus:ring-2 focus:ring-bb-cobalt/25 focus:border-bb-cobalt/50 transition-all" 
                    value={formData.isbn || ''} 
                    onChange={e => updateForm('isbn', e.target.value)} 
                  />
                </div>
                
                {/* AI indexing. Two separate questions, deliberately kept apart:
                    licenceType is whether we MAY embed (a publisher agreement),
                    aiEmbedEnabled is whether we WANT to. Both had to be true for
                    indexing to start, and aiEmbedEnabled defaults to false with
                    no UI anywhere — so every new book silently refused to index
                    with an error naming a switch that could not be found. */}
                <div className="space-y-1.5 sm:col-span-2 rounded-xl border border-bb-border/80 bg-bb-surface-2/60 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="aiEmbedEnabled" className="text-sm font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-bb-info-ink" />
                        Enable AI indexing
                      </Label>
                      <p className="text-xs text-bb-muted">
                        Required before chapter markdown can be indexed for Varta and iTutor.
                      </p>
                    </div>
                    <Switch
                      id="aiEmbedEnabled"
                      checked={!!formData.aiEmbedEnabled}
                      onCheckedChange={(v) => updateForm('aiEmbedEnabled', v)}
                    />
                  </div>
                  <div className="pt-2">
                    <Label className="text-xs font-semibold text-bb-muted">Licence</Label>
                    <select
                      className="mt-1 w-full rounded-lg border border-bb-border/80 bg-bb-surface px-2.5 py-1.5 text-sm"
                      value={(formData.licenseType as string) || 'UNKNOWN'}
                      onChange={(e) => updateForm('licenseType', e.target.value)}
                    >
                      <option value="UNKNOWN">Unknown — indexing blocked</option>
                      <option value="AI_PERMITTED">AI permitted — publisher agreement verified</option>
                      <option value="AI_RESTRICTED">AI restricted — indexing blocked</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Publisher (Optional)</Label>
                  <Input 
                    placeholder="Publisher name" 
                    className="rounded-xl bg-bb-surface border-bb-border/80 focus:ring-2 focus:ring-bb-cobalt/25 focus:border-bb-cobalt/50 transition-all" 
                    value={formData.publisher || ''} 
                    onChange={e => updateForm('publisher', e.target.value)} 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Publish Year</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 2024" 
                    min={1900} max={2100}
                    className="rounded-xl bg-bb-surface border-bb-border/80 focus:ring-2 focus:ring-bb-cobalt/25 focus:border-bb-cobalt/50 transition-all"
                    value={formData.publishYear || ''} 
                    onChange={e => updateForm('publishYear', e.target.value)} 
                  />
                </div>
                
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-sm font-semibold">Description</Label>
                  <Textarea 
                    placeholder="Write a compelling summary of the book..." 
                    className="min-h-[120px] resize-none rounded-xl bg-bb-surface border-bb-border/80 focus:ring-2 focus:ring-bb-cobalt/25 focus:border-bb-cobalt/50 transition-all leading-relaxed" 
                    value={formData.description || ''} 
                    onChange={e => updateForm('description', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-4 bg-bb-surface border-t border-bb-border/60 flex items-center justify-end gap-3 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
              <EnhancedButton
                type="button"
                variant="outline"
                className="rounded-xl border-bb-border hover:bg-bb-surface-2"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </EnhancedButton>
              <EnhancedButton
                type="submit"
                className="gap-2 rounded-xl text-white shadow-md transition-all hover:shadow-lg"
                disabled={updateMutation.isPending || !formData.title || !formData.author}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Save Changes
              </EnhancedButton>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
