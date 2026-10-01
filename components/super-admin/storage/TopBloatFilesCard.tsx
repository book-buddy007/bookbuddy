"use client";
import { useState } from "react";
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle, EnhancedCardDescription } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/button";
import { formatBytes, formatLabel, formatColor } from "@/utils/storage.utils";
import { Loader2, Trash2 } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { purgeTrash } from "@/lib/api/adminApi";

const cardClass = "border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-bb-bg/70 backdrop-blur-md relative overflow-hidden shadow-sm";
const headerClass = "relative z-10 border-b border-slate-100 dark:border-slate-700/40";

interface BloatFile {
  id: string;
  title: string;
  format: string;
  fileSize: number;
  tenantId: string | null;
}

interface TopBloatFilesCardProps {
  files: BloatFile[];
  className?: string;
}

export function TopBloatFilesCard({ files, className }: TopBloatFilesCardProps) {
  return (
    <EnhancedCard className={cn(cardClass, className)}>
      <EnhancedCardHeader className={headerClass}>
        <EnhancedCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <div className="h-2 w-2 rounded-full bg-[var(--deep-saffron)] animate-pulse" />
          Top Storage Consumers
        </EnhancedCardTitle>
        <EnhancedCardDescription className="text-slate-500 dark:text-white/50">
          Largest files across book &amp; personal libraries
        </EnhancedCardDescription>
      </EnhancedCardHeader>
      <EnhancedCardContent className="relative z-10 pt-4">
        {files.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
            No files found
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {files.map((f, idx) => {
              const color = formatColor(f.format);
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-3 py-3 group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors rounded-lg px-1"
                >
                  {/* Rank badge */}
                  <span className="w-6 text-center text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                    {idx + 1}
                  </span>
                  {/* Format icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-[10px] font-bold shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                    style={{ backgroundColor: color }}
                  >
                    {formatLabel(f.format).slice(0, 3)}
                  </div>
                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {f.title}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {f.tenantId
                        ? `Tenant · ${f.tenantId.slice(0, 8)}…`
                        : "Personal Library"}
                    </p>
                  </div>
                  {/* Size */}
                  <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300 shrink-0">
                    {formatBytes(f.fileSize)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </EnhancedCardContent>
    </EnhancedCard>
  );
}

// ---------------------------------------------------------------------------
// TrashCleanupBanner
// ---------------------------------------------------------------------------
interface TrashCleanupBannerProps {
  trashBytes: number;
  onPurged?: () => void;
  tenantId?: string;
  className?: string;
}

export function TrashCleanupBanner({
  trashBytes,
  onPurged,
  tenantId,
  className,
}: TrashCleanupBannerProps) {
  const [loading, setLoading] = useState(false);

  if (trashBytes <= 0) return null;

  const handlePurge = async () => {
    setLoading(true);
    try {
      const res = await purgeTrash(tenantId);
      if (res.success) {
        toast.success(
          `Trash purged — ${res.data?.purgedCount ?? 0} file(s) permanently deleted.`
        );
        onPurged?.();
      } else {
        toast.error(res.error ?? "Failed to purge trash.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl px-5 py-4",
        "bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 backdrop-blur-md shadow-sm",
        className
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30 shrink-0">
          <Trash2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {formatBytes(trashBytes)} in Trash
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
            Soft-deleted files older than 7 days will be auto-purged. You can
            reclaim space now.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={handlePurge}
        disabled={loading}
        className="shrink-0 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0 gap-2 shadow-md shadow-amber-500/20"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Purge Now
      </Button>
    </div>
  );
}
