"use client";
import { cn } from "@/lib/utils";

interface StorageBarProps {
  used: number;        // bytes used
  total: number;       // bytes total (quota)
  label?: string;
  showPercent?: boolean;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function colorFromPct(pct: number) {
  if (pct >= 95) return "bg-red-500";
  if (pct >= 85) return "bg-orange-500";
  if (pct >= 70) return "bg-yellow-500";
  return "bg-gradient-to-r from-[var(--deep-saffron)] to-[var(--peacock-teal)]";
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const heightMap = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };

export function StorageBar({
  used,
  total,
  label,
  showPercent = true,
  showLabels = false,
  size = "md",
  className,
}: StorageBarProps) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const barColor = colorFromPct(pct);

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs">
          {label && (
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {label}
            </span>
          )}
          {showPercent && (
            <span
              className={cn(
                "font-semibold tabular-nums",
                pct >= 95
                  ? "text-red-600 dark:text-red-400"
                  : pct >= 85
                  ? "text-orange-600 dark:text-orange-400"
                  : pct >= 70
                  ? "text-yellow-600 dark:text-yellow-500"
                  : "text-[var(--deep-saffron)]"
              )}
            >
              {pct}%
            </span>
          )}
        </div>
      )}
      {/* Track */}
      <div
        className={cn(
          "w-full rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden",
          heightMap[size]
        )}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            barColor
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabels && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          <span>{formatBytes(used)} used</span>
          <span>{formatBytes(total)} total</span>
        </div>
      )}
    </div>
  );
}
