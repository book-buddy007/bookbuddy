'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '@/lib/query-keys';
import { getCatalogBookUploadUrl, confirmCatalogBookUpload, triggerBookEmbedding } from '@/lib/api/adminApi';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Progress } from '@/components/ui/progress';
import {
  FileText, BookOpenCheck, Headphones, Check, Upload, Loader2, X, FileUp, Sparkles,
} from '@/components/ui/icons';

const ALL_FORMATS = [
  { key: 'PDF', icon: FileText, label: 'PDF', accept: '.pdf', mimeType: 'application/pdf', color: 'border-red-200 bg-red-50/80 dark:bg-red-950/20 dark:border-red-800/50', accentGradient: 'from-red-500 to-rose-500' },
  { key: 'EPUB', icon: BookOpenCheck, label: 'EPUB', accept: '.epub', mimeType: 'application/epub+zip', color: 'border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/20 dark:border-emerald-800/50', accentGradient: 'from-emerald-500 to-teal-500' },
  { key: 'AUDIOBOOK', icon: Headphones, label: 'Audiobook', accept: '.mp3,.m4a,.ogg,.wav', mimeType: 'audio/mpeg', color: 'border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-800/50', accentGradient: 'from-amber-500 to-orange-500' },
  { key: 'AI_EMBED', icon: Sparkles, label: 'AI Markdown', accept: '.md', mimeType: 'text/markdown', color: 'border-cyan-200 bg-cyan-50/80 dark:bg-cyan-950/20 dark:border-cyan-800/50', accentGradient: 'from-cyan-500 to-sky-500' },
] as const;

/**
 * The shared spine refuses anything larger, so stop it here rather than after a
 * full upload — the file reaches R2 first and the rejection would otherwise
 * arrive at the very end, looking like an ingest bug rather than a size limit.
 */
const MAX_MARKDOWN_BYTES = 5 * 1024 * 1024;

/**
 * The chapter number a markdown file declares about itself.
 *
 * Read from the file rather than asked for in a field: the frontmatter was
 * written and validated by a human alongside the text, and a number retyped
 * into a form is how chapter 8's text ends up filed as chapter 9 — which
 * nothing downstream can detect, because both are valid chapters.
 */
async function readChapterNumber(file: File): Promise<number | null> {
  // The frontmatter is at the top; no need to read a whole book into memory.
  const head = await file.slice(0, 8192).text();
  const m = head.match(/^chapter_number\s*:\s*"?(\d+)"?\s*$/m);
  return m ? parseInt(m[1], 10) : null;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AddFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: { id: string; title: string; bookFormats?: { type: string; partIndex?: number }[] } | null;
}

export function AddFormatDialog({ open, onOpenChange, book }: AddFormatDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  /**
   * Markdown is uploaded as a SET of chapters, not one file. A book is many
   * chapter files, and asking an operator to reopen this dialog once per
   * chapter is how chapter 9 gets forgotten — the whole set is visible here
   * so a gap is obvious before anything is sent.
   */
  const [mdQueue, setMdQueue] = useState<
    Array<{ file: File; chapter: number | null; status: 'ready' | 'uploading' | 'done' | 'failed'; detail?: string }>
  >([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  /**
   * Indexing is reported separately from the upload because they can disagree:
   * the markdown can be safely stored against the book while the ingest is
   * refused (unapproved validation_status, licence gate, a job already running).
   * Collapsing the two would tell the admin the upload failed when it did not.
   */
  const [indexState, setIndexState] = useState<'queued' | 'failed' | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);

  const existingFormats = new Set((book?.bookFormats || []).map((f: any) => f.type));

  // `AI_EMBED` is a Prisma enum member, not a phrase — show the human label
  // wherever the chosen format is named back to the admin.
  const selectedLabel =
    ALL_FORMATS.find(f => f.key === selectedFormat)?.label ?? selectedFormat;

  const resetState = () => {
    setSelectedFormat(null);
    setSelectedFile(null);
    setMdQueue([]);
    setUploadProgress(0);
    setIsUploading(false);
    setIsDone(false);
    setIndexState(null);
    setIndexError(null);
  };

  const router = useRouter();

  const handleFileSelect = (format: typeof ALL_FORMATS[number]) => {
    if (format.key === 'AUDIOBOOK') {
      onOpenChange(false);
      resetState();
      router.push(`/dashboard/super-admin/catalog/builder/${book?.id}`);
      return;
    }

    setSelectedFormat(format.key);
    setSelectedFile(null);
    setUploadProgress(0);
    setIsDone(false);
    // Trigger file picker
    if (fileInputRef.current) {
      fileInputRef.current.accept = format.accept;
      // Many chapters at once for markdown; everything else is one whole-book file.
      fileInputRef.current.multiple = format.key === 'AI_EMBED';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // so re-selecting the same file works
    if (files.length === 0) return;

    if (selectedFormat !== 'AI_EMBED') {
      setSelectedFile(files[0]);
      return;
    }

    // ── Markdown: a set of chapters ──────────────────────────────────────
    // Every check happens BEFORE anything is uploaded. Discovering a missing
    // chapter number after the bytes are in storage reads as an indexing bug
    // rather than a file problem, and a half-uploaded set is worse than none.
    const oversize = files.filter((f) => f.size > MAX_MARKDOWN_BYTES);
    if (oversize.length > 0) {
      toast({
        title: oversize.length === 1 ? 'Markdown too large' : `${oversize.length} files too large`,
        description: `${oversize.map((f) => f.name).join(', ')} — the limit is 5 MB per chapter. Split the book by chapter rather than sending it whole.`,
        variant: 'destructive',
      });
      return;
    }

    const parsed = await Promise.all(
      files.map(async (file) => ({ file, chapter: await readChapterNumber(file) })),
    );

    const missing = parsed.filter((p) => p.chapter === null || p.chapter < 1);
    if (missing.length > 0) {
      toast({
        title: missing.length === 1 ? 'No chapter number in this file' : `No chapter number in ${missing.length} files`,
        description:
          `${missing.map((m) => m.file.name).join(', ')} — each markdown needs a \`chapter_number:\` in its ` +
          'frontmatter. It decides which chapter slot the file occupies; without it, uploading another ' +
          'chapter would overwrite this one.',
        variant: 'destructive',
      });
      return;
    }

    // Two files claiming the same chapter would silently overwrite each other
    // in the same slot, leaving whichever uploaded last and no trace of the
    // other. Cheap to catch here, invisible afterwards.
    const seen = new Map<number, string>();
    const dupes = parsed.filter((p) => {
      const prev = seen.get(p.chapter!);
      if (prev) return true;
      seen.set(p.chapter!, p.file.name);
      return false;
    });
    if (dupes.length > 0) {
      toast({
        title: 'Two files claim the same chapter',
        description: dupes
          .map((d) => `chapter ${d.chapter}: ${seen.get(d.chapter!)} and ${d.file.name}`)
          .join('; ') + ' — one would overwrite the other.',
        variant: 'destructive',
      });
      return;
    }

    setMdQueue(
      parsed
        .sort((a, b) => a.chapter! - b.chapter!)
        .map((p) => ({ file: p.file, chapter: p.chapter, status: 'ready' as const })),
    );
    setSelectedFile(null);
  };

  /** Upload one file to its slot. Shared by both paths so they cannot drift. */
  const uploadOne = async (
    file: File,
    formatKey: string,
    partIndex: number | null,
    onProgress: (pct: number) => void,
  ) => {
    if (!book) throw new Error('No book selected');
    const formatDef = ALL_FORMATS.find((f) => f.key === formatKey);
    const mimeType = file.type || formatDef?.mimeType || 'application/octet-stream';

    const urlRes = await getCatalogBookUploadUrl(book.id, formatKey.toLowerCase(), file.name, mimeType);
    if (!urlRes.success || !urlRes.data) throw new Error(urlRes.error || 'Failed to get upload URL');

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', urlRes.data.uploadUrl);
      xhr.setRequestHeader('Content-Type', mimeType);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });

    const confirmRes = await confirmCatalogBookUpload(book.id, {
      format: formatKey,
      fileUrl: urlRes.data.publicUrl,
      fileSize: file.size,
      mimeType,
      s3Key: urlRes.data.key,
      // Which chapter slot this occupies. Whole-book renditions stay at part 0.
      ...(formatKey === 'AI_EMBED' && partIndex ? { partIndex } : {}),
    });
    if (confirmRes && (confirmRes as any).success === false) {
      throw new Error((confirmRes as any).error || 'Could not register the file against the book');
    }
  };

  const handleUpload = async () => {
    if (!book || !selectedFormat) return;
    const isMarkdown = selectedFormat === 'AI_EMBED';
    if (isMarkdown ? mdQueue.length === 0 : !selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setIndexState(null);
    setIndexError(null);

    const formatDef = ALL_FORMATS.find((f) => f.key === selectedFormat);

    try {
      if (!isMarkdown) {
        await uploadOne(selectedFile!, selectedFormat, null, (pct) => setUploadProgress(Math.round(pct * 0.9)));
        setUploadProgress(100);
        setIsDone(true);
        setIsUploading(false);
        toast({ title: '✅ Format Added', description: `${formatDef?.label ?? selectedFormat} uploaded for "${book.title}"` });
        queryClient.invalidateQueries({ queryKey: catalogKeys.all });
        return;
      }

      // ── Chapters, one at a time ────────────────────────────────────────
      // Sequential rather than parallel: each upload registers a slot, and a
      // burst of concurrent writes to the same book buys nothing on files this
      // size while making a partial failure harder to read.
      const total = mdQueue.length;
      let failures = 0;

      for (let i = 0; i < total; i++) {
        const item = mdQueue[i];
        setMdQueue((q) => q.map((x, idx) => (idx === i ? { ...x, status: 'uploading' } : x)));
        try {
          await uploadOne(item.file, 'AI_EMBED', item.chapter, (pct) =>
            setUploadProgress(Math.round(((i + pct / 100) / total) * 90)),
          );
          setMdQueue((q) => q.map((x, idx) => (idx === i ? { ...x, status: 'done' } : x)));
        } catch (err: any) {
          failures++;
          setMdQueue((q) =>
            q.map((x, idx) => (idx === i ? { ...x, status: 'failed', detail: err?.message || 'Upload failed' } : x)),
          );
        }
      }

      setUploadProgress(95);

      // Index ONCE, after the whole set. Triggering per chapter would queue a
      // job that re-sends every chapter already attached, so a five-chapter
      // upload would embed the first chapter five times.
      if (failures < total) {
        const embedRes = await triggerBookEmbedding(book.id);
        if (embedRes.success) {
          setIndexState('queued');
        } else {
          setIndexState('failed');
          setIndexError(embedRes.error || 'Indexing could not be started.');
        }
      }

      setUploadProgress(100);
      setIsDone(true);
      setIsUploading(false);

      toast({
        title: failures === 0 ? '✅ Chapters Uploaded' : `⚠️ ${total - failures} of ${total} chapters uploaded`,
        description:
          failures === 0
            ? `${total} chapter${total === 1 ? '' : 's'} attached to "${book.title}"`
            : 'Some chapters did not upload — see the list.',
        variant: failures === 0 ? undefined : 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    } catch (err: any) {
      setIsUploading(false);
      toast({ title: 'Upload Failed', description: err.message || 'Unknown error', variant: 'destructive' });
    }
  };

  if (!book) return null;

  // AI Markdown stays selectable even once one is uploaded: a book is many
  // chapters, and hiding the tile after the first was why there appeared to be
  // no way to add chapter 9. The whole-book renditions are still one-each.
  // Which chapters this book already has, so a missing one is visible rather
  // than something you discover when the tutor cannot answer about it.
  const attachedChapters = (book?.bookFormats || [])
    .filter((f) => f.type === 'AI_EMBED' && typeof f.partIndex === 'number' && f.partIndex > 0)
    .map((f) => f.partIndex as number)
    .sort((a, b) => a - b);

  const availableFormats = ALL_FORMATS.filter(
    (f) => f.key === 'AI_EMBED' || !existingFormats.has(f.key),
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isUploading) { onOpenChange(v); resetState(); } }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
              <FileUp className="h-4 w-4 text-white" />
            </div>
            Add Format
          </DialogTitle>
          <DialogDescription className="text-sm">
            Upload additional file formats for <strong className="text-foreground">{book.title}</strong>.
          </DialogDescription>
        </DialogHeader>

        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

        {/* Existing Formats */}
        {existingFormats.size > 0 && (
          <div className="mb-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Already Uploaded</p>
            <div className="flex gap-2">
              {ALL_FORMATS.filter(f => existingFormats.has(f.key)).map(fmt => (
                <div key={fmt.key} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm border border-slate-200/60 dark:border-slate-700/40">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <fmt.icon className="h-4 w-4" />
                  <span>{fmt.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Formats to Upload */}
        {availableFormats.length === 0 ? (
          <div className="py-10 text-center">
            <div className="relative inline-block mb-3">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl scale-150" />
              <div className="relative flex items-center justify-center h-14 w-14 mx-auto bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                <Check className="h-7 w-7 text-emerald-500" />
              </div>
            </div>
            <p className="font-bold text-slate-800 dark:text-white">All formats uploaded!</p>
            <p className="text-sm text-muted-foreground mt-1">This book has all available formats.</p>
          </div>
        ) : isDone ? (
          <div className="py-10 text-center">
            {/* Success checkmark with animation */}
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-emerald-500/15 rounded-full blur-2xl scale-150 animate-pulse" />
              <div className="relative h-16 w-16 mx-auto bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Check className="h-8 w-8 text-white" strokeWidth={3} />
              </div>
            </div>
            <p className="font-bold text-lg text-slate-900 dark:text-white">{selectedLabel} Uploaded!</p>
            <p className="text-sm text-muted-foreground mt-1">Format has been added to the book.</p>

            {indexState === 'queued' && (
              <div className="mt-4 mx-auto max-w-sm rounded-xl border border-cyan-200/70 dark:border-cyan-800/50 bg-cyan-50/70 dark:bg-cyan-950/20 p-3 text-left">
                <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Indexing queued
                </p>
                <p className="text-xs text-cyan-700/80 dark:text-cyan-400/80 mt-1">
                  The chapter is being chunked and embedded into the shared library. Varta can
                  answer from it once this finishes — it does not block the reader or the player.
                </p>
              </div>
            )}

            {indexState === 'failed' && (
              <div className="mt-4 mx-auto max-w-sm rounded-xl border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 p-3 text-left">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Uploaded, but indexing did not start
                </p>
                <p className="text-xs text-amber-700/90 dark:text-amber-400/90 mt-1">{indexError}</p>
                <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-1.5">
                  The file is saved against the book. Fix the cause and re-run indexing — nothing
                  needs re-uploading.
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-center mt-5">
              <EnhancedButton variant="outline" onClick={() => resetState()} className="rounded-xl">
                Add Another Format
              </EnhancedButton>
              <EnhancedButton onClick={() => { onOpenChange(false); resetState(); }} className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                Done
              </EnhancedButton>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {selectedFile || mdQueue.length > 0 ? 'Ready to Upload' : 'Select Format to Add'}
            </p>

            {!selectedFile && mdQueue.length === 0 ? (
              <div className="grid gap-2">
                {availableFormats.map(fmt => (
                  <button
                    key={fmt.key}
                    onClick={() => handleFileSelect(fmt)}
                    disabled={isUploading}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed ${fmt.color} hover:border-solid hover:shadow-md transition-all text-left w-full group hover:-translate-y-0.5 duration-200`}
                  >
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${fmt.accentGradient} flex items-center justify-center shadow-sm`}>
                      <fmt.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-sm text-slate-800 dark:text-white">{fmt.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmt.key === 'PDF' && 'Upload a PDF document'}
                        {fmt.key === 'EPUB' && 'Upload an EPUB e-book file'}
                        {fmt.key === 'AUDIOBOOK' && 'Open Audiobook Builder'}
                        {fmt.key === 'AI_EMBED' && 'Enriched chapter markdown — powers AI chat'}
                      </p>
                    </div>
                    <FileUp className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* File Info */}
                {mdQueue.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {mdQueue.length} chapter{mdQueue.length === 1 ? '' : 's'} selected
                      </p>
                      {!isUploading && (
                        <button
                          onClick={() => { setMdQueue([]); setSelectedFormat(null); }}
                          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
                      {mdQueue.map((item, idx) => (
                        <div
                          key={`${item.chapter}-${item.file.name}`}
                          className="flex items-center gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-700/40"
                        >
                          <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
                            Ch {item.chapter}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate text-slate-800 dark:text-white">{item.file.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatFileSize(item.file.size)}
                              {item.detail ? ` · ${item.detail}` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs">
                            {item.status === 'done' ? '✅'
                              : item.status === 'failed' ? '❌'
                              : item.status === 'uploading' ? '⏳'
                              : ''}
                          </span>
                          {!isUploading && item.status === 'ready' && (
                            <button
                              onClick={() => setMdQueue((q) => q.filter((_, i) => i !== idx))}
                              className="shrink-0 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Already attached, so a gap in the set is visible before uploading */}
                    {attachedChapters.length > 0 && (
                      <p className="text-[11px] text-muted-foreground px-0.5">
                        Already attached: {attachedChapters.map((c) => `ch ${c}`).join(', ')}
                      </p>
                    )}
                  </div>
                ) : (
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/40">
                  {(() => {
                    const fmt = ALL_FORMATS.find(f => f.key === selectedFormat);
                    const Icon = fmt?.icon || FileText;
                    return (
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${fmt?.accentGradient || 'from-indigo-500 to-purple-500'}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-slate-800 dark:text-white">{selectedFile?.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedFile ? formatFileSize(selectedFile.size) : ''} · {selectedLabel}</p>
                  </div>
                  {!isUploading && (
                    <button onClick={() => { setSelectedFile(null); setSelectedFormat(null); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

)}

                {/* Gradient Progress */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground font-medium">
                      {uploadProgress < 20 ? 'Preparing...' : uploadProgress < 80 ? `Uploading... ${uploadProgress}%` : 'Confirming...'}
                    </p>
                  </div>
                )}

                {/* Upload Button */}
                <EnhancedButton
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-600/20"
                  size="lg"
                >
                  {isUploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Uploading {selectedLabel}...</>
                  ) : (
                    <><Upload className="h-4 w-4" /> Upload {selectedLabel} File</>
                  )}
                </EnhancedButton>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
