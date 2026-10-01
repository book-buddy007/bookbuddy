"use client";
import { cn } from "@/lib/utils";
import { riskColor } from "@/utils/storage.utils";

interface StorageBarProps {
  used: number;        // bytes used
  total: number;       // bytes total (quota)
  label?: string;
  showPercent?: boolean;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
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
  const risk = riskColor(pct);

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-semibold">{label}</span>}
          {showPercent && <span className={cn("font-bold tabular-nums", risk.text)}>{pct}%</span>}
        </div>
      )}
      <div
        className={cn("w-full overflow-hidden rounded-full bg-bb-surface-2", heightMap[size])}
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-bb-ui ease-bb", risk.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabels && (
        <div className="flex items-center justify-between text-[11px] tabular-nums text-bb-muted">
          <span>{formatBytes(used)} used</span>
          <span>{formatBytes(total)} total</span>
        </div>
      )}
    </div>
  );
}
