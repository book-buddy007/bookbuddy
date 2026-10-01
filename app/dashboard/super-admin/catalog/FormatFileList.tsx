'use client';

import {
  FileText, BookOpenCheck, Headphones, BrainCircuit,
  Layers, ExternalLink, Trash2,
} from 'lucide-react';
import type { FormatFileTarget } from './DeleteFormatDialog';

const FORMAT_ICONS: Record<string, any> = {
  PDF: FileText,
  EPUB: BookOpenCheck,
  AUDIOBOOK: Headphones,
  AI_EMBED: BrainCircuit,
};

const FORMAT_COLORS: Record<string, string> = {
  PDF: 'bg-red-50 text-red-700 border-red-200/60 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/50',
  EPUB: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50',
  AUDIOBOOK: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50',
  AI_EMBED: 'bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800/50',
};

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/**
 * The stored object's own name, from its URL. Upload keys carry a timestamp
 * prefix (`1786341750855-…`) that is noise to a human, so drop it — the part
 * that identifies the file is what follows.
 */
export function filenameFromUrl(url: string | null | undefined) {
  if (!url) return '';
  try {
    const last = decodeURIComponent(new URL(url).pathname).split('/').pop() || '';
    return last.replace(/^\d{10,}-/, '');
  } catch {
    return '';
  }
}

export interface FormatFileRow {
  id?: string;
  type: string;
  partIndex?: number;
  fileUrl?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  createdAt?: string | null;
}

interface FormatFileListProps {
  formats: FormatFileRow[];
  bookId: string;
  bookTitle: string;
  onRequestDelete: (target: FormatFileTarget) => void;
}

/**
 * Every format file a book holds, one row each, each identified well enough to
 * act on: what kind it is, which chapter (markdown only), its filename, size and
 * date — plus open and delete.
 *
 * A book has ONE pdf/epub/audiobook but MANY enriched-markdown files, so a row
 * is identified by (type, partIndex) and keyed by its row id. The earlier
 * version keyed on `type` alone and printed no filename, which meant several
 * markdown rows collapsed into what looked like a single entry.
 */
export function FormatFileList({ formats, bookId, bookTitle, onRequestDelete }: FormatFileListProps) {
  if (!formats || formats.length === 0) {
    return (
      <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
        <Layers className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-sm text-muted-foreground">No format files uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {formats.map((fmt) => {
        const Icon = FORMAT_ICONS[fmt.type] || FileText;
        const color = FORMAT_COLORS[fmt.type] || FORMAT_COLORS.PDF;
        const filename = filenameFromUrl(fmt.fileUrl);
        // Only enriched markdown is per-chapter; whole-book renditions sit at
        // part 0, where a "Chapter 0" label would be a lie.
        const chapterLabel =
          fmt.type === 'AI_EMBED' && (fmt.partIndex ?? 0) > 0 ? `Ch ${fmt.partIndex}` : null;

        return (
          <div
            key={fmt.id ?? `${fmt.type}-${fmt.partIndex ?? 0}`}
            data-testid="format-file-row"
            className={`p-3.5 rounded-xl border ${color} transition-all duration-200 hover:shadow-md`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-white/60 dark:bg-white/[0.08] rounded-lg shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{fmt.type}</span>
                    {chapterLabel && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-white/[0.12]">
                        {chapterLabel}
                      </span>
                    )}
                    <span className="text-xs opacity-60">{fmt.mimeType}</span>
                  </div>
                  {/* The filename, because "AI_EMBED · 30 KB" is not enough to
                      tell two chapters apart — and telling them apart is the
                      whole prerequisite for deleting the right one. */}
                  {filename && (
                    <p className="font-mono text-[11px] mt-1 opacity-70 break-all leading-snug">
                      {filename}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs shrink-0">
                {fmt.fileUrl && (
                  <a
                    href={fmt.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open file"
                    className="hover:opacity-80 transition-opacity p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {/* Disabled without a row id: the delete endpoint addresses a
                    single format by id, and guessing one would delete a file
                    the operator did not choose. */}
                <button
                  type="button"
                  title={fmt.id ? 'Delete this file from the server' : 'This row cannot be deleted individually'}
                  aria-label={`Delete ${filename || fmt.type}`}
                  disabled={!fmt.id}
                  onClick={() =>
                    onRequestDelete({
                      id: fmt.id!,
                      type: fmt.type,
                      partIndex: fmt.partIndex,
                      filename: filename || fmt.fileUrl || fmt.type,
                      sizeLabel: formatFileSize(fmt.fileSize),
                      bookId,
                      bookTitle,
                    })
                  }
                  className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs mt-2 pl-[52px]">
              <span className="font-medium">{formatFileSize(fmt.fileSize)}</span>
              <span className="opacity-50">{formatDate(fmt.createdAt)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
