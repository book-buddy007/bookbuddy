'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '@/lib/query-keys';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, Check, ChevronRight, ChevronLeft, Loader2, X, FileUp, Sparkles, Building2, BookOpenCheck, Headphones, FileText, RotateCcw, Eye, PlusCircle, PartyPopper, ImageIcon, FileType2, Tag } from '@/components/ui/icons';

import { GenreMultiSelect } from '@/components/catalog/GenreMultiSelect';
import { CoverUploadZone } from '@/components/catalog/CoverUploadZone';
import { SampleUploadZone } from '@/components/catalog/SampleUploadZone';

import {
  createGlobalCatalogBook,
  getCatalogBookUploadUrl,
  confirmCatalogBookUpload,
  getCoverUploadUrl,
  getSampleUploadUrl,
  updateCatalogBook,
  getTaxonomyTree,
  setBookTaxonomy,
} from '@/lib/api/adminApi';
import type { BookUpdatePayload } from '@/types/book-update.types';

const FORMAT_CONFIG = [
  { key: 'PDF', icon: FileText, label: 'PDF', accept: '.pdf', mimeType: 'application/pdf' },
  { key: 'EPUB', icon: BookOpenCheck, label: 'EPUB', accept: '.epub', mimeType: 'application/epub+zip' },
  { key: 'AUDIOBOOK', icon: Headphones, label: 'Audiobook', accept: '.mp3,.m4a,.ogg,.wav', mimeType: 'audio/mpeg' },
] as const;

type WizardStep = 1 | 2 | 3 | 4;
type WizardView = 'form' | 'success' | 'error';
type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

// Shared curriculum taxonomy (cross-repo, Vidyaverse-hosted) — see
// backend/src/admin/services/taxonomy-client.service.ts for the DTO this mirrors.
type TaxonomyDomainKey = 'school' | 'college' | 'competitive' | 'entrance' | 'misc';
interface TaxonomyNode {
  id: string;
  name: string;
  slug: string;
  nodeType: string;
  children?: TaxonomyNode[];
}
interface TaxonomySelection {
  nodeId: string;
  label: string; // breadcrumb, e.g. "CBSE > English > Class 10 > Mathematics"
  isPrimary: boolean;
}
const TAXONOMY_DOMAIN_OPTIONS: { value: TaxonomyDomainKey; label: string }[] = [
  { value: 'school', label: 'School Education' },
  { value: 'college', label: 'College Education' },
  { value: 'competitive', label: 'Competitive Exam Prep' },
  { value: 'entrance', label: 'Entrance Exam Prep' },
  { value: 'misc', label: 'Misc' },
];

interface ProgressEntry { pct: number; status: UploadStatus; err?: string; }

interface AddBookWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookCreated?: (bookId: string) => void;
}

export function AddBookWizard({ open, onOpenChange, onBookCreated }: AddBookWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Navigation
  const [step, setStep] = useState<WizardStep>(1);
  const [view, setView] = useState<WizardView>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '', author: '', isbn: '', publisher: '', description: '',
    publishYear: '', language: 'en',
    accessTier: 'FREE', licenseType: 'UNKNOWN', categoryIds: [] as string[],
  });

  // Media State
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [backCoverFile, setBackCoverFile] = useState<File | null>(null);
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  
  // Format State
  const [mainFormat, setMainFormat] = useState('NONE');
  const [mainContentFile, setMainContentFile] = useState<File | null>(null);

  // Upload Progress Tracking
  const [progress, setProgress] = useState<Record<string, ProgressEntry>>({});
  const [globalStatus, setGlobalStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [createdBookId, setCreatedBookId] = useState<string | null>(null);

  // Shared curriculum taxonomy (cross-repo, Vidyaverse-hosted) — distinct from the
  // genre categoryIds above. Drill-down picker state: `taxonomyPath` is the chain of
  // nodes chosen so far at the current in-progress selection (root to wherever the
  // admin has drilled to); `taxonomySelections` is the set of completed leaf picks,
  // supporting cross-listing (multiple paths per book).
  const [taxonomyDomain, setTaxonomyDomain] = useState<TaxonomyDomainKey>('school');
  const [taxonomyTree, setTaxonomyTree] = useState<TaxonomyNode[]>([]);
  const [taxonomyTreeLoading, setTaxonomyTreeLoading] = useState(false);
  const [taxonomyPath, setTaxonomyPath] = useState<TaxonomyNode[]>([]);
  const [taxonomySelections, setTaxonomySelections] = useState<TaxonomySelection[]>([]);

  // Success summary data
  const [successSummary, setSuccessSummary] = useState<{
    title: string; author: string; accessTier: string; genreCount: number;
    hasCover: boolean; hasBackCover: boolean; hasSample: boolean;
    format: string; fileSize?: string;
  } | null>(null);

  const initProgress = (key: string) => setProgress(prev => ({ ...prev, [key]: { pct: 0, status: 'idle' } }));
  const setProg = (key: string, pct: number, status: UploadStatus, err?: string) => {
    setProgress(prev => ({ ...prev, [key]: { pct, status, err } }));
  };

  const updateForm = (key: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  // Refetch the drill-down tree whenever the domain changes (only while the dialog
  // is open, so a background tab doesn't poll the hub for nothing).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setTaxonomyTreeLoading(true);
    setTaxonomyPath([]);
    getTaxonomyTree(taxonomyDomain).then((res) => {
      if (cancelled) return;
      setTaxonomyTree(res.success ? (res.data as TaxonomyNode[]) : []);
      setTaxonomyTreeLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, taxonomyDomain]);

  /** Children of wherever the drill-down has reached — the tree roots if nothing
   *  picked yet, else the last chosen node's children. */
  const taxonomyOptionsAtCurrentLevel: TaxonomyNode[] =
    taxonomyPath.length === 0 ? taxonomyTree : (taxonomyPath[taxonomyPath.length - 1].children ?? []);

  const pickTaxonomyNode = (node: TaxonomyNode) => {
    const nextPath = [...taxonomyPath, node];
    if (node.children && node.children.length > 0) {
      setTaxonomyPath(nextPath);
      return;
    }
    // Leaf reached — commit as a selection and reset the drill-down for the next pick.
    setTaxonomySelections((prev) => {
      if (prev.some((s) => s.nodeId === node.id)) return prev;
      return [
        ...prev,
        {
          nodeId: node.id,
          label: nextPath.map((n) => n.name).join(' › '),
          isPrimary: prev.length === 0,
        },
      ];
    });
    setTaxonomyPath([]);
    setIsDirty(true);
  };

  const removeTaxonomySelection = (nodeId: string) => {
    setTaxonomySelections((prev) => {
      const filtered = prev.filter((s) => s.nodeId !== nodeId);
      // Losing the primary pick promotes the next one, so a book is never left
      // tagged with no primary shelf path as long as it has any tags at all.
      if (filtered.length > 0 && !filtered.some((s) => s.isPrimary)) {
        filtered[0] = { ...filtered[0], isPrimary: true };
      }
      return filtered;
    });
  };

  const setPrimaryTaxonomySelection = (nodeId: string) => {
    setTaxonomySelections((prev) => prev.map((s) => ({ ...s, isPrimary: s.nodeId === nodeId })));
  };

  const handleCloseAttempt = (newOpen: boolean) => {
    if (newOpen) {
      onOpenChange(true);
      return;
    }
    if (isSubmitting) return;
    if (view === 'success') {
      resetAndClose();
      return;
    }
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      resetAndClose();
    }
  };

  const resetAll = useCallback(() => {
    setStep(1);
    setView('form');
    setIsDirty(false);
    setShowDiscardConfirm(false);
    setIsSubmitting(false);
    setGlobalStatus('');
    setErrorMessage('');
    setCreatedBookId(null);
    setSuccessSummary(null);
    setProgress({});
    setFormData({
      title: '', author: '', isbn: '', publisher: '', description: '', publishYear: '', language: 'en',
      accessTier: 'FREE', licenseType: 'UNKNOWN', categoryIds: [],
    });
    setCoverFile(null);
    setBackCoverFile(null);
    setSampleFile(null);
    setMainContentFile(null);
    setMainFormat('NONE');
    setTaxonomyDomain('school');
    setTaxonomyPath([]);
    setTaxonomySelections([]);
  }, []);

  const resetAndClose = () => {
    resetAll();
    onOpenChange(false);
  };

  const nextStep = () => {
    if (step === 1 && (!formData.title || !formData.author)) {
      toast({ title: 'Validation Required', description: 'Title and Author are required.' });
      return;
    }
    setStep(s => Math.min(s + 1, 4) as WizardStep);
  };

  const prevStep = () => {
    if (isSubmitting) return;
    setStep((s) => Math.max(s - 1, 1) as WizardStep);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const performS3Upload = async (file: File, url: string, mimeType: string, progKey: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', mimeType);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProg(progKey, pct, 'uploading');
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProg(progKey, 100, 'done');
          resolve(true);
        } else {
          setProg(progKey, 100, 'error', `HTTP ${xhr.status}`);
          reject(new Error(`HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => {
        setProg(progKey, 0, 'error', 'Network error');
        reject(new Error('Network error'));
      };
      xhr.send(file);
    });
  };

  const handleSubmit = async () => {
    if (mainFormat !== 'NONE' && !mainContentFile) {
      toast({ title: 'Validation Error', description: 'Please select the main book file to upload.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    setView('form');
    setErrorMessage('');
    setGlobalStatus('Creating book record...');
    
    try {
      let bookId = createdBookId;

      // 1. Create Base Book (skip if retrying and book already created)
      if (!bookId) {
        const res = await createGlobalCatalogBook({
          title: formData.title,
          author: formData.author,
          isbn: formData.isbn,
          publisher: formData.publisher,
          description: formData.description,
          publishYear: formData.publishYear ? parseInt(formData.publishYear) : undefined,
          language: formData.language,
          accessTier: formData.accessTier,
          licenseType: formData.licenseType,
          categoryIds: formData.categoryIds
        });

        if (!res.success || !res.data?.id) {
          throw new Error(res.error || 'Failed to create base book record');
        }
        bookId = res.data.id;
        setCreatedBookId(bookId);
      }

      if (!bookId) {
        throw new Error('Failed to obtain a valid book ID');
      }

      // Tag the shared curriculum taxonomy — best-effort: a hub hiccup here shouldn't
      // fail the whole book creation over a classification the admin can always add
      // later from the catalog editor, so this warns rather than throws.
      if (taxonomySelections.length > 0) {
        const res = await setBookTaxonomy(
          bookId,
          taxonomySelections.map((s) => ({ nodeId: s.nodeId, isPrimary: s.isPrimary })),
        );
        if (!res.success) {
          toast({
            title: 'Taxonomy tagging failed',
            description: `Book was created, but curriculum tagging didn't save: ${res.error}. You can retag it from the library editor.`,
          });
        }
      }

      const dbUpdates: Partial<BookUpdatePayload> = {};

      // 2. Upload Front Cover (skip if already done)
      if (coverFile && progress['front-cover']?.status !== 'done') {
        setGlobalStatus('Uploading front cover...');
        initProgress('front-cover');
        const urlRes = await getCoverUploadUrl(bookId, 'front', coverFile.name, coverFile.type || 'image/jpeg');
        if (urlRes.success && urlRes.data) {
          await performS3Upload(coverFile, urlRes.data.uploadUrl, coverFile.type || 'image/jpeg', 'front-cover');
          dbUpdates.coverKey = urlRes.data.key;
          dbUpdates.coverUrl = urlRes.data.publicUrl;
        }
      }

      // 3. Upload Back Cover (skip if already done)
      if (backCoverFile && progress['back-cover']?.status !== 'done') {
        setGlobalStatus('Uploading back cover...');
        initProgress('back-cover');
        const urlRes = await getCoverUploadUrl(bookId, 'back', backCoverFile.name, backCoverFile.type || 'image/jpeg');
        if (urlRes.success && urlRes.data) {
          await performS3Upload(backCoverFile, urlRes.data.uploadUrl, backCoverFile.type || 'image/jpeg', 'back-cover');
          dbUpdates.backCoverKey = urlRes.data.key;
          dbUpdates.backCoverUrl = urlRes.data.publicUrl;
        }
      }

      // 4. Upload Free Sample (skip if already done)
      if (sampleFile && progress['sample']?.status !== 'done') {
        setGlobalStatus('Uploading free sample...');
        initProgress('sample');
        const urlRes = await getSampleUploadUrl(bookId, sampleFile.name, sampleFile.type || 'application/pdf');
        if (urlRes.success && urlRes.data) {
          await performS3Upload(sampleFile, urlRes.data.uploadUrl, sampleFile.type || 'application/pdf', 'sample');
          dbUpdates.sampleFileKey = urlRes.data.key;
          dbUpdates.sampleFileUrl = urlRes.data.publicUrl;
        }
      }

      // 5. Update Book with Media Keys
      if (Object.keys(dbUpdates).length > 0) {
        setGlobalStatus('Saving media metadata...');
        try {
          await updateCatalogBook(bookId, dbUpdates);
        } catch (err: any) {
          const message = err?.message ?? 'Failed to save metadata. S3 upload succeeded but database was not updated.';
          setErrorMessage(message);
          setView('error');
          toast({ title: 'Update Failed', description: message, variant: 'destructive' });
          return; // DO NOT advance to success screen
        }
      }

      // 6. Upload Main Format Book File (skip if already done)
      if (mainFormat !== 'NONE' && mainContentFile && progress['main']?.status !== 'done') {
        setGlobalStatus(`Uploading main ${mainFormat} file...`);
        initProgress('main');
        const mimeType = mainContentFile.type || FORMAT_CONFIG.find(f => f.key === mainFormat)?.mimeType || 'application/octet-stream';
        const urlRes = await getCatalogBookUploadUrl(bookId, mainFormat.toLowerCase(), mainContentFile.name, mimeType);
        
        if (urlRes.success && urlRes.data) {
          await performS3Upload(mainContentFile, urlRes.data.uploadUrl, mimeType, 'main');
          
          setGlobalStatus('Confirming book format...');
          await confirmCatalogBookUpload(bookId, {
            format: mainFormat,
            fileUrl: urlRes.data.publicUrl,
            fileSize: mainContentFile.size,
            mimeType: mimeType,
            s3Key: urlRes.data.key,
          });
        }
      }

      // Success!
      setGlobalStatus('');
      setIsSubmitting(false);

      // Build summary for celebration screen
      setSuccessSummary({
        title: formData.title,
        author: formData.author,
        accessTier: formData.accessTier,
        genreCount: formData.categoryIds.length,
        hasCover: !!coverFile,
        hasBackCover: !!backCoverFile,
        hasSample: !!sampleFile,
        format: mainFormat,
        fileSize: mainContentFile ? formatFileSize(mainContentFile.size) : undefined,
      });

      // Invalidate queries for real-time update
      queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      if (onBookCreated) {
        onBookCreated(bookId);
      }

      // Transition to success celebration
      setView('success');

    } catch (err: any) {
      setIsSubmitting(false);
      setGlobalStatus('');
      setErrorMessage(err.message || 'An error occurred during upload');
      setView('error');
    }
  };

  const handleRetry = () => {
    setView('form');
    setErrorMessage('');
    handleSubmit();
  };

  const handleAddAnother = () => {
    resetAll();
  };

  const handleViewInCatalog = () => {
    queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    resetAndClose();
  };


  // ─── RENDER ──────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleCloseAttempt}>
      <DialogContent 
        className="sm:max-w-[800px] p-0 border-0 shadow-2xl overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        {/* ── DISCARD CONFIRMATION ── */}
        {showDiscardConfirm ? (
          <div className="p-10 text-center space-y-6 bg-white dark:bg-slate-900">
            <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <X className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold">Discard Draft?</h2>
            <p className="text-slate-500">You have unsaved changes. All files and data entered will be lost. Are you sure you want to discard this book?</p>
            <div className="flex justify-center gap-4 mt-8">
              <EnhancedButton variant="outline" onClick={() => setShowDiscardConfirm(false)}>
                Continue Editing
              </EnhancedButton>
              <EnhancedButton onClick={resetAndClose} className="bg-red-600 hover:bg-red-700 text-white">
                Yes, Discard
              </EnhancedButton>
            </div>
          </div>

        /* ── SUCCESS CELEBRATION ── */
        ) : view === 'success' && successSummary ? (
          <div className="relative overflow-hidden">
            {/* Confetti-like background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-fuchsia-400/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative z-10 p-10 text-center space-y-6">
              {/* Animated Checkmark */}
              <div className="mx-auto w-20 h-20 rounded-full bg-bb-success flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in-50 duration-500">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                  <PartyPopper className="w-6 h-6 text-amber-500" />
                  Book Published!
                </h2>
                <p className="text-slate-500 mt-1">Your book is now live in the Global Library</p>
              </div>

              {/* Summary Card */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-left mx-auto max-w-md shadow-sm" style={{ animationDelay: '400ms' }}>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4 truncate">{successSummary.title}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Author</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate ml-4">{successSummary.author}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Genres</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{successSummary.genreCount} selected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Access</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{successSummary.accessTier}</span>
                  </div>
                  {successSummary.format !== 'NONE' && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5"><FileType2 className="w-3.5 h-3.5" /> Format</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{successSummary.format} ({successSummary.fileSize})</span>
                    </div>
                  )}
                  <div className="border-t pt-3 mt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1 ${successSummary.hasCover ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <ImageIcon className="w-3.5 h-3.5" />
                        Cover {successSummary.hasCover ? '✓' : '—'}
                      </span>
                      <span className={`flex items-center gap-1 ${successSummary.hasBackCover ? 'text-emerald-600' : 'text-slate-400'}`}>
                        Back {successSummary.hasBackCover ? '✓' : '—'}
                      </span>
                      <span className={`flex items-center gap-1 ${successSummary.hasSample ? 'text-emerald-600' : 'text-slate-400'}`}>
                        Sample {successSummary.hasSample ? '✓' : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 pt-2 animate-in fade-in duration-500" style={{ animationDelay: '600ms' }}>
                <EnhancedButton variant="outline" onClick={handleAddAnother} className="gap-2">
                  <PlusCircle className="w-4 h-4" /> Add Another Book
                </EnhancedButton>
                <EnhancedButton onClick={handleViewInCatalog} className=" text-white gap-2 shadow-md shadow-bb-cobalt/20">
                  <Eye className="w-4 h-4" /> View in Library
                </EnhancedButton>
              </div>
            </div>
          </div>

        /* ── ERROR / RETRY SCREEN ── */
        ) : view === 'error' ? (
          <div className="p-10 text-center space-y-6 bg-white dark:bg-slate-900">
            <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <X className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Failed</h2>
            <p className="text-slate-500 max-w-sm mx-auto">
              {errorMessage || 'An error occurred during the publishing process.'}
            </p>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 max-w-sm mx-auto">
              <p className="font-semibold mb-1">💡 Your book details were saved</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">Only the file upload needs retrying. Your form data is preserved.</p>
            </div>
            <div className="flex justify-center gap-4 pt-2">
              <EnhancedButton variant="outline" onClick={() => { setView('form'); setStep(4); }} className="text-slate-600">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back to Form
              </EnhancedButton>
              <EnhancedButton onClick={handleRetry} className=" text-white gap-2 shadow-md">
                <RotateCcw className="w-4 h-4" /> Retry Upload
              </EnhancedButton>
            </div>
          </div>

        /* ── MAIN WIZARD FORM ── */
        ) : (
          <div className="flex flex-col max-h-[90dvh] overflow-hidden">
            {/* Header */}
            {/* Header — Indic Warm Gradient */}
            <div className="relative overflow-hidden px-6 pt-5 pb-7 shrink-0" style={{background: 'linear-gradient(135deg, #0A0F24 0%, #0F1F5C 30%, #1E3A8A 60%, #FF4D00 100%)'}}>
              <div className="absolute inset-0 opacity-25 pointer-events-none" style={{backgroundImage: 'radial-gradient(ellipse at 80% 20%, rgba(255,77,0,0.35) 0%, transparent 55%), radial-gradient(circle at 15% 60%, rgba(30,58,138,0.25) 0%, transparent 50%)'}} />
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-bb-accent/[0.06] rounded-full blur-3xl" />
              <div className="relative z-10">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-xl font-bold text-white flex items-center gap-2.5">
                    <div className="bg-white/15 backdrop-blur-sm rounded-lg p-1.5 border border-white/10"><Sparkles className="h-5 w-5" /></div>
                    Premium Publishing <span className="text-bb-accent">Studio</span>
                  </DialogTitle>
                </DialogHeader>
                {/* Indic step indicators */}
                <div className="flex items-center gap-2 mt-6">
                  {[1, 2, 3, 4].map(num => (
                    <div key={num} className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold transition-all duration-300
                          ${step > num ? 'bg-bb-accent text-bb-text scale-100' : step === num ? 'bg-white text-bb-text ring-2 ring-bb-accent/50 ring-offset-1 ring-offset-transparent' : 'bg-white/15 text-white/50'}`}>
                          {step > num ? '✓' : num}
                        </div>
                      </div>
                      <div className={`h-1 rounded-full transition-all duration-300 ${step >= num ? 'bg-bb-progress' : 'bg-white/10'}`} />
                      <span className={`text-[10px] font-semibold uppercase mt-1 block transition-colors ${step >= num ? 'text-white' : 'text-white/35'}`}>
                        {num === 1 ? 'Details' : num === 2 ? 'Classification' : num === 3 ? 'Media' : 'Review'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Body Steps */}
            <div className="px-6 py-6 flex-1 overflow-y-auto bg-bb-bg dark:bg-slate-900">
              
              {/* STEP 1: Details */}
              <div className={step === 1 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-3 mb-4 flex items-center gap-2.5 border-b border-slate-200/60 dark:border-slate-700/40">
                  <div className="w-1 h-5 rounded-full bg-bb-progress" />
                  <BookOpen className="h-5 w-5 text-bb-text" /> Book Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-sm font-semibold">Book Title <span className="text-red-500">*</span></Label>
                    <Input placeholder="e.g. The AI Revolution" className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/50 focus:ring-2 focus:ring-bb-cobalt/25 focus:border-bb-cobalt/50 transition-all" value={formData.title} onChange={e => updateForm('title', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Author(s) <span className="text-red-500">*</span></Label>
                    <Input placeholder="Author names" className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/50 focus:ring-2 focus:ring-bb-cobalt/25 focus:border-bb-cobalt/50 transition-all" value={formData.author} onChange={e => updateForm('author', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Language</Label>
                    <Select value={formData.language} onValueChange={v => updateForm('language', v)}>
                      <SelectTrigger className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/50 focus:ring-2 focus:ring-bb-cobalt/25"><SelectValue /></SelectTrigger>
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
                    <Input placeholder="ISBN-13 or ISBN-10" className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/50 focus:ring-2 focus:ring-bb-cobalt/25 focus:border-bb-cobalt/50 transition-all" value={formData.isbn} onChange={e => updateForm('isbn', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Publisher (Optional)</Label>
                    <Input placeholder="Publisher name" className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/50 focus:ring-2 focus:ring-bb-cobalt/25 focus:border-bb-cobalt/50 transition-all" value={formData.publisher} onChange={e => updateForm('publisher', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Publish Year</Label>
                    <Input 
                      type="number" 
                      placeholder="e.g. 2024" 
                      min={1900} max={2100}
                      className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/50 focus:ring-2 focus:ring-bb-cobalt/25 focus:border-bb-cobalt/50 transition-all"
                      value={formData.publishYear} 
                      onChange={e => updateForm('publishYear', e.target.value)} 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-sm font-semibold">Description</Label>
                    <Textarea placeholder="Write a compelling summary of the book..." className="min-h-[100px] resize-none rounded-xl bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/50 focus:ring-2 focus:ring-bb-cobalt/25 focus:border-bb-cobalt/50 transition-all" value={formData.description} onChange={e => updateForm('description', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* STEP 2: Classification */}
              <div className={step === 2 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-3 mb-4 flex items-center gap-2.5 border-b border-slate-200/60 dark:border-slate-700/40">
                  <div className="w-1 h-5 rounded-full bg-bb-success" />
                  <Building2 className="h-5 w-5 text-teal-500" /> Library Classification
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2 py-2">
                    <Label className="text-sm font-semibold">Genres / Subject Areas</Label>
                    <p className="text-xs text-slate-500 mb-2">Tag the book with relevant categories to improve discovery.</p>
                    <GenreMultiSelect selectedIds={formData.categoryIds} onChange={(ids) => updateForm('categoryIds', ids)} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-200/60 dark:border-slate-700/40">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">Access Tier</Label>
                      <Select value={formData.accessTier} onValueChange={v => updateForm('accessTier', v)}>
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/50 focus:ring-2 focus:ring-bb-cobalt/25"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FREE">Free</SelectItem>
                          <SelectItem value="BRONZE">Bronze</SelectItem>
                          <SelectItem value="SILVER">Silver</SelectItem>
                          <SelectItem value="GOLD">Gold</SelectItem>
                          <SelectItem value="DIAMOND">Diamond</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-slate-500 mt-1">Which subscription tier is required to read this?</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold">AI Embed License</Label>
                      <Select value={formData.licenseType} onValueChange={v => updateForm('licenseType', v)}>
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/50 focus:ring-2 focus:ring-bb-cobalt/25"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNKNOWN">Unknown / Implicit</SelectItem>
                          <SelectItem value="AI_PERMITTED">AI Context Sync Permitted</SelectItem>
                          <SelectItem value="AI_RESTRICTED">Strictly Prohibited</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-slate-500 mt-1">Can our Sarvagya AI ingest this text as RAG context?</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: Media */}
              <div className={step === 3 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-3 mb-4 flex items-center gap-2.5 border-b border-slate-200/60 dark:border-slate-700/40">
                  <div className="w-1 h-5 rounded-full bg-bb-progress" />
                  <FileUp className="h-5 w-5 text-amber-500" /> Book Artwork & Previews
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Covers */}
                  <div className="space-y-4">
                    <CoverUploadZone 
                      label="Front Cover (Required)" 
                      side="front" 
                      file={coverFile} 
                      onFileSelect={(f) => { setCoverFile(f); setIsDirty(true); }}
                      progress={progress['front-cover']?.pct || 0}
                      status={progress['front-cover']?.status || 'idle'}
                      error={progress['front-cover']?.err}
                    />
                  </div>
                  <div className="space-y-4">
                    <CoverUploadZone 
                      label="Back Cover (Optional)" 
                      side="back" 
                      file={backCoverFile} 
                      onFileSelect={(f) => { setBackCoverFile(f); setIsDirty(true); }}
                      progress={progress['back-cover']?.pct || 0}
                      status={progress['back-cover']?.status || 'idle'}
                      error={progress['back-cover']?.err}
                    />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t">
                  <SampleUploadZone 
                    label='&quot;Look Inside&quot; Free Sample (Optional)'
                    file={sampleFile}
                    onFileSelect={(f) => { setSampleFile(f); setIsDirty(true); }}
                    progress={progress['sample']?.pct || 0}
                    status={progress['sample']?.status || 'idle'}
                    error={progress['sample']?.err}
                  />
                  <p className="text-xs text-slate-500 mt-2">Upload the first few chapters as a PDF for non-premium users to preview the quality.</p>
                </div>
              </div>

              {/* STEP 4: Review & Main file */}
              <div className={step === 4 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-3 mb-4 flex items-center gap-2.5 border-b border-slate-200/60 dark:border-slate-700/40">
                  <div className="w-1 h-5 rounded-full bg-bb-success" />
                  <Check className="h-5 w-5 text-emerald-500" /> Finalize & Book Format
                </h3>
                
                <div className="bg-bb-progress border border-bb-cobalt/15 dark:border-bb-cobalt/25 rounded-2xl p-5 mb-6">
                  <h4 className="font-bold text-bb-text dark:text-teal-200 mb-3 flex items-center gap-2"><Eye className="w-4 h-4 text-bb-text" /> Publishing Summary</h4>
                  <ul className="text-sm space-y-2 text-slate-700 dark:text-slate-300">
                    <li className="flex items-start gap-2"><span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">Title:</span> <span className="truncate">{formData.title || '(Missing)'}</span></li>
                    <li className="flex items-start gap-2"><span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">Author:</span> <span className="truncate">{formData.author || '(Missing)'}</span></li>
                    {formData.publishYear && <li className="flex items-start gap-2"><span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">Year:</span> {formData.publishYear}</li>}
                    <li className="flex items-start gap-2"><span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">Access:</span> <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-bb-accent/10 text-bb-accent border border-bb-accent/20">{formData.accessTier}</span></li>
                    <li className="flex items-start gap-2"><span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">Genres:</span> {formData.categoryIds.length} selected</li>
                    <li className="flex items-start gap-2"><span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">Artwork:</span> {coverFile ? '✅ Front' : '❌ Front'}, {backCoverFile ? '✅ Back' : '—  Back'}</li>
                    <li className="flex items-start gap-2"><span className="font-semibold text-slate-900 dark:text-slate-100 shrink-0">Preview:</span> {sampleFile ? '✅ Sample attached' : '—  No sample'}</li>
                  </ul>
                </div>

                {/* Shared Curriculum Taxonomy — distinct from Genres (Step 2): board/
                    class/subject/degree/exam classification used to scope RAG
                    retrieval to a student's institute curriculum. Optional. */}
                <div className="space-y-3 mb-6">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Tag className="w-4 h-4 text-bb-text" /> Curriculum Taxonomy <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </Label>

                  {taxonomySelections.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {taxonomySelections.map((sel) => (
                        <div key={sel.nodeId} className={`flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium border ${sel.isPrimary ? 'bg-bb-cobalt/10 border-bb-cobalt/30 text-bb-text' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                          <span className="truncate max-w-[220px]">{sel.label}</span>
                          {!sel.isPrimary && (
                            <button type="button" onClick={() => setPrimaryTaxonomySelection(sel.nodeId)} className="text-[10px] uppercase font-bold text-slate-400 hover:text-bb-text">
                              Set primary
                            </button>
                          )}
                          <button type="button" onClick={() => removeTaxonomySelection(sel.nodeId)} className="p-0.5 rounded-full hover:bg-black/10">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={taxonomyDomain} onValueChange={(v) => setTaxonomyDomain(v as TaxonomyDomainKey)} disabled={isSubmitting}>
                      <SelectTrigger className="w-auto min-w-[180px] rounded-xl bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TAXONOMY_DOMAIN_OPTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    {taxonomyPath.map((n, i) => (
                      <div key={n.id} className="flex items-center gap-1 text-xs text-slate-500">
                        <ChevronRight className="w-3 h-3" />
                        <button type="button" onClick={() => setTaxonomyPath(taxonomyPath.slice(0, i))} className="hover:text-bb-text font-medium">
                          {n.name}
                        </button>
                      </div>
                    ))}

                    {taxonomyTreeLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : taxonomyOptionsAtCurrentLevel.length > 0 ? (
                      <Select value="" onValueChange={(id) => {
                        const node = taxonomyOptionsAtCurrentLevel.find((n) => n.id === id);
                        if (node) pickTaxonomyNode(node);
                      }} disabled={isSubmitting}>
                        <SelectTrigger className="w-auto min-w-[160px] rounded-xl bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/50">
                          <SelectValue placeholder={taxonomyPath.length === 0 ? 'Select…' : 'Drill down…'} />
                        </SelectTrigger>
                        <SelectContent>
                          {taxonomyOptionsAtCurrentLevel.map((n) => (
                            <SelectItem key={n.id} value={n.id}>{n.name}{n.children?.length ? ' →' : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : taxonomyPath.length > 0 ? (
                      <span className="text-xs text-slate-400">No further options here.</span>
                    ) : (
                      <span className="text-xs text-slate-400">Taxonomy service unavailable — you can tag this book later.</span>
                    )}
                  </div>
                </div>

                {/* Main Content Upload Container */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <Label className="text-base font-semibold">Attach Full Book File</Label>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Select Format Type</Label>
                      <Select value={mainFormat} onValueChange={v => setMainFormat(v)} disabled={isSubmitting}>
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/50 focus:ring-2 focus:ring-bb-cobalt/25"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None (Metadata Only)</SelectItem>
                          {FORMAT_CONFIG.map(f => (
                            <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {mainFormat !== 'NONE' && (
                     <div className="relative group">
                      <input
                        id="main-file"
                        type="file"
                        className="hidden"
                        accept={FORMAT_CONFIG.find(f => f.key === mainFormat)?.accept}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setMainContentFile(e.target.files[0]);
                          }
                          e.target.value = '';
                        }}
                        disabled={isSubmitting}
                      />
                      <label 
                        htmlFor="main-file"
                        className={`w-full flex flex-col items-center justify-center p-8 rounded-xl border-2 transition-all duration-200
                          ${progress['main']?.status === 'uploading' ? 'cursor-default opacity-80 border-indigo-300 bg-slate-50' : 
                           mainContentFile 
                             ? 'border-solid border-emerald-400 bg-emerald-50/30 cursor-pointer hover:bg-emerald-50/50' 
                             : 'border-dashed border-slate-300 cursor-pointer hover:border-indigo-400 bg-white hover:bg-slate-50'}
                        `}
                      >
                         {progress['main']?.status === 'uploading' ? (
                            <div className="flex flex-col items-center w-full max-w-sm">
                              <Loader2 className="w-8 h-8 text-bb-text animate-spin mb-3" />
                              <div className="w-full flex justify-between text-xs font-bold text-slate-600 mb-2">
                                <span className="truncate pr-4">{mainContentFile?.name}</span>
                                <span>{progress['main'].pct}%</span>
                              </div>
                              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-bb-progress rounded-full transition-all duration-300" style={{ width: `${progress['main'].pct}%` }} />
                              </div>
                            </div>
                         ) : progress['main']?.status === 'done' ? (
                            <div className="flex flex-col items-center text-emerald-600">
                              <Check className="w-10 h-10 mb-2" />
                              <span className="font-bold">Book Successfully Uploaded!</span>
                            </div>
                         ) : mainContentFile ? (
                           <div className="flex flex-col items-center">
                             <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full mb-3 shadow-sm">
                               {(() => {
                                 const match = FORMAT_CONFIG.find(f => f.key === mainFormat);
                                 return match ? <match.icon className="w-6 h-6" /> : null;
                               })()}
                             </div>
                             <span className="font-bold text-slate-800 break-all text-center max-w-[280px]">{mainContentFile.name}</span>
                             <span className="text-sm font-medium text-emerald-600 mt-1">Ready to upload · {formatFileSize(mainContentFile.size)}</span>
                           </div>
                         ) : (
                           <div className="flex flex-col items-center text-slate-500">
                             <div className="p-3 bg-slate-100 rounded-full mb-3 shadow-sm">
                                <FileUp className="w-6 h-6" />
                             </div>
                             <span className="font-semibold">Click to select {FORMAT_CONFIG.find(f => f.key === mainFormat)?.label} file</span>
                             <span className="text-xs mt-1">Accepts {FORMAT_CONFIG.find(f => f.key === mainFormat)?.accept}</span>
                           </div>
                         )}
                      </label>
                      {mainContentFile && !isSubmitting && progress['main']?.status !== 'done' && (
                        <button onClick={(e) => { e.preventDefault(); setMainContentFile(null); }} className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 drop-shadow-md">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                     </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer with Global Status Output — always pinned */}
            <div className="shrink-0 px-6 py-4 bg-white dark:bg-slate-950 border-t border-slate-200/60 dark:border-slate-700/40 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex-1 flex items-center min-w-0">
                {isSubmitting && globalStatus && (
                  <div className="flex items-center text-bb-text dark:text-teal-400 font-semibold text-sm animate-pulse w-full">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
                    <span className="truncate">{globalStatus}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 shrink-0 ml-auto">
                <EnhancedButton variant="ghost" onClick={() => handleCloseAttempt(false)} disabled={isSubmitting} className="text-slate-500">
                  Cancel
                </EnhancedButton>

                {step > 1 && (
                  <EnhancedButton variant="outline" onClick={prevStep} disabled={isSubmitting}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </EnhancedButton>
                )}

                {step < 4 ? (
                  <EnhancedButton onClick={nextStep} className=" text-white font-semibold shadow-md shadow-bb-cobalt/15 rounded-xl transition-all">
                    Next Step <ChevronRight className="w-4 h-4 ml-1" />
                  </EnhancedButton>
                ) : (
                  <EnhancedButton 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || (mainFormat !== 'NONE' && !mainContentFile) || progress['main']?.status === 'done'} 
                    className="bg-bb-success hover:brightness-95 text-white font-bold shadow-lg shadow-emerald-600/25 rounded-xl transition-all duration-200"
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish Book'} <Check className="w-4 h-4 ml-1.5" />
                  </EnhancedButton>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
