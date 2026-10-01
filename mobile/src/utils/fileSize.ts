const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Human-readable byte size.
 *
 * Uses 1024-based units with the conventional labels, matching what a file
 * manager on the device would show for the same file.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const value = bytes / 1024 ** exponent;

  // Whole numbers read better without a trailing .0 — "4 MB", not "4.0 MB".
  const rounded = value >= 100 || Number.isInteger(value) ? Math.round(value) : Number(value.toFixed(decimals));

  return `${rounded} ${UNITS[exponent]}`;
}

/** Fraction of the quota used, clamped to 0–1. */
export function quotaFraction(usedBytes: number, maxBytes: number): number {
  if (maxBytes <= 0) return 0;
  return Math.min(1, Math.max(0, usedBytes / maxBytes));
}
