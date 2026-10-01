"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatBytes, formatLabel, formatColor } from "@/utils/storage.utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { purgeTrash } from "@/lib/api/adminApi";

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
    <section className={cn("rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6", className)}>
      <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">Top storage consumers</h3>
      <p className="mb-4 text-[13px] text-bb-muted">Largest files across book &amp; personal libraries</p>
      {files.length === 0 ? (
        <p className="py-8 text-center text-sm text-bb-muted">No files found</p>
      ) : (
        <ul className="divide-y divide-bb-border">
          {files.map((f, idx) => (
            <li key={f.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-bb-muted">{idx + 1}</span>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold text-white"
                style={{ backgroundColor: formatColor(f.format) }}
              >
                {formatLabel(f.format).slice(0, 3)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-bb-muted">
                  {f.tenantId ? `Tenant · ${f.tenantId.slice(0, 8)}…` : "Personal library"}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums">{formatBytes(f.fileSize)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
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
        "flex flex-col gap-4 rounded-[18px] bg-bb-warning-soft px-5 py-4 sm:flex-row sm:items-center",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bb-warning text-bb-ink">
          <Icon name="trash" size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-bb-warning-ink">{formatBytes(trashBytes)} in trash</p>
          <p className="mt-0.5 text-xs text-bb-warning-ink/80">
            Soft-deleted files older than 7 days will be auto-purged. You can reclaim space now.
          </p>
        </div>
      </div>
      <Button size="sm" variant="secondary" onClick={handlePurge} disabled={loading} className="shrink-0">
        {loading ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="trash" size={16} />}
        Purge now
      </Button>
    </div>
  );
}
