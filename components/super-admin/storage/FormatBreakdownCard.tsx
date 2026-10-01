"use client";
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle, EnhancedCardDescription } from "@/components/ui/enhanced-card";
import { formatBytes, formatLabel, formatColor } from "@/utils/storage.utils";
import { cn } from "@/lib/utils";

interface FormatBreakdown {
  format: string;
  bytes: number;
  count: number;
}

interface FormatBreakdownCardProps {
  data: FormatBreakdown[];
  className?: string;
}

const cardClass = "border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-bb-bg/70 backdrop-blur-md relative overflow-hidden shadow-sm";
const headerClass = "relative z-10 border-b border-slate-100 dark:border-slate-700/40";

export function FormatBreakdownCard({ data, className }: FormatBreakdownCardProps) {
  const totalBytes = data.reduce((s, f) => s + f.bytes, 0);
  const sorted = [...data].sort((a, b) => b.bytes - a.bytes);

  return (
    <EnhancedCard className={cn(cardClass, className)}>
      <EnhancedCardHeader className={headerClass}>
        <EnhancedCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <div className="h-2 w-2 rounded-full bg-[var(--peacock-teal)] animate-pulse" />
          Storage by Format
        </EnhancedCardTitle>
        <EnhancedCardDescription className="text-slate-500 dark:text-white/50">
          Breakdown across book &amp; personal libraries
        </EnhancedCardDescription>
      </EnhancedCardHeader>
      <EnhancedCardContent className="relative z-10 pt-4 space-y-4">
        {sorted.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
            No data available
          </p>
        )}
        {sorted.map((f) => {
          const pct = totalBytes > 0 ? Math.round((f.bytes / totalBytes) * 100) : 0;
          const color = formatColor(f.format);
          return (
            <div key={f.format} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {formatLabel(f.format)}
                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                    ({f.count} file{f.count !== 1 ? "s" : ""})
                  </span>
                </span>
                <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                  {formatBytes(f.bytes)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </EnhancedCardContent>
    </EnhancedCard>
  );
}

// ---------------------------------------------------------------------------
// StorageSummaryStats
// ---------------------------------------------------------------------------
interface StorageSummaryStatsProps {
  totalBytes: number;
  catalogBytes: number;
  personalBytes: number;
  trashBytes: number;
  totalFiles: number;
  className?: string;
}

export function StorageSummaryStats({
  totalBytes,
  catalogBytes,
  personalBytes,
  trashBytes,
  totalFiles,
  className,
}: StorageSummaryStatsProps) {
  const sections = [
    { label: "Book Library", bytes: catalogBytes, color: "#E8682A", desc: "Books & formats" },
    { label: "Personal Library", bytes: personalBytes, color: "#2563EB", desc: "User uploads" },
    { label: "Trash", bytes: trashBytes, color: "#94A3B8", desc: "Pending purge" },
  ];

  return (
    <EnhancedCard className={cn(cardClass, className)}>
      <EnhancedCardHeader className={headerClass}>
        <EnhancedCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <div className="h-2 w-2 rounded-full bg-[var(--deep-saffron)] animate-pulse" />
          Platform Storage
        </EnhancedCardTitle>
        <EnhancedCardDescription className="text-slate-500 dark:text-white/50">
          {totalFiles.toLocaleString()} total files &middot;{" "}
          {formatBytes(totalBytes)} used
        </EnhancedCardDescription>
      </EnhancedCardHeader>
      <EnhancedCardContent className="relative z-10 pt-4 space-y-4">
        {sections.map((s) => {
          const pct = totalBytes > 0 ? Math.round((s.bytes / totalBytes) * 100) : 0;
          return (
            <div key={s.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                    — {s.desc}
                  </span>
                </span>
                <span className="tabular-nums font-semibold text-slate-600 dark:text-slate-300">
                  {formatBytes(s.bytes)}{" "}
                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                    ({pct}%)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: s.color }}
                />
              </div>
            </div>
          );
        })}
      </EnhancedCardContent>
    </EnhancedCard>
  );
}
