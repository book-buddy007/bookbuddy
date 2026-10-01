"use client";
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

const panel = "rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6";
const title = "font-display text-lg font-extrabold tracking-[-0.02em]";

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-bb-surface-2">
      <div
        className="h-full rounded-full transition-[width] duration-bb-ui ease-bb"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function FormatBreakdownCard({ data, className }: FormatBreakdownCardProps) {
  const totalBytes = data.reduce((s, f) => s + f.bytes, 0);
  const sorted = [...data].sort((a, b) => b.bytes - a.bytes);

  return (
    <section className={cn(panel, className)}>
      <h3 className={title}>Storage by format</h3>
      <p className="mb-5 text-[13px] text-bb-muted">Breakdown across book &amp; personal libraries</p>
      <div className="space-y-4">
        {sorted.length === 0 && <p className="py-6 text-center text-sm text-bb-muted">No data available</p>}
        {sorted.map((f) => {
          const pct = totalBytes > 0 ? Math.round((f.bytes / totalBytes) * 100) : 0;
          const color = formatColor(f.format);
          return (
            <div key={f.format} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                  {formatLabel(f.format)}
                  <span className="font-normal text-bb-muted">
                    ({f.count} file{f.count !== 1 ? "s" : ""})
                  </span>
                </span>
                <span className="font-bold tabular-nums">{formatBytes(f.bytes)}</span>
              </div>
              <Bar pct={pct} color={color} />
            </div>
          );
        })}
      </div>
    </section>
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
    { label: "Book library", bytes: catalogBytes, color: "#FF4D00", desc: "Books & formats" },
    { label: "Personal library", bytes: personalBytes, color: "#1E3A8A", desc: "User uploads" },
    { label: "Trash", bytes: trashBytes, color: "#A7B0C8", desc: "Pending purge" },
  ];

  return (
    <section className={cn(panel, className)}>
      <h3 className={title}>Platform storage</h3>
      <p className="mb-5 text-[13px] text-bb-muted">
        {totalFiles.toLocaleString()} total files &middot; {formatBytes(totalBytes)} used
      </p>
      <div className="space-y-4">
        {sections.map((s) => {
          const pct = totalBytes > 0 ? Math.round((s.bytes / totalBytes) * 100) : 0;
          return (
            <div key={s.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.label}
                  <span className="font-normal text-bb-muted">· {s.desc}</span>
                </span>
                <span className="font-bold tabular-nums">
                  {formatBytes(s.bytes)} <span className="font-normal text-bb-muted">({pct}%)</span>
                </span>
              </div>
              <Bar pct={pct} color={s.color} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
