// ---------------------------------------------------------------------------
// Storage Utilities – Book Buddy by VPD Super Admin
// ---------------------------------------------------------------------------

/** Raw byte thresholds */
export const STORAGE_THRESHOLDS = {
  WARNING_PCT: 70, // % of quota → yellow
  CRITICAL_PCT: 85, // % of quota → orange
  FULL_PCT: 95, // % of quota → red
} as const;

/** Default personal-library quota per user (500 MB) */
export const DEFAULT_USER_QUOTA_BYTES = 500 * 1024 * 1024;

/** Format a raw byte count into a human-readable string */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/** Return 0-100 percentage, capped at 100 */
export function usagePct(used: number, quota: number): number {
  if (!quota || quota <= 0) return 0;
  return Math.min(100, Math.round((used / quota) * 100));
}

/** Map a usage percentage to a Tailwind / CSS colour token */
export function riskColor(pct: number): {
  bar: string;
  text: string;
  badge: string;
} {
  if (pct >= STORAGE_THRESHOLDS.FULL_PCT) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
  }
  if (pct >= STORAGE_THRESHOLDS.CRITICAL_PCT) {
    return {
      bar: 'bg-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
      badge:
        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
  }
  if (pct >= STORAGE_THRESHOLDS.WARNING_PCT) {
    return {
      bar: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-500',
      badge:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
  }
  return {
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };
}

/** Map a file format string to a display label */
export function formatLabel(format: string): string {
  const map: Record<string, string> = {
    pdf: 'PDF',
    epub: 'EPUB',
    mp3: 'MP3',
    mp4: 'MP4',
    mobi: 'MOBI',
    azw3: 'AZW3',
    djvu: 'DjVu',
    cbz: 'CBZ',
    txt: 'TXT',
    docx: 'DOCX',
  };
  return map[format.toLowerCase()] ?? format.toUpperCase();
}

/** Colour palette for format breakdown chart slices */
export const FORMAT_PALETTE: Record<string, string> = {
  pdf: '#E8682A',    // saffron-ish
  epub: '#2563EB',
  mp3: '#7C3AED',
  mp4: '#0891B2',
  mobi: '#D97706',
  azw3: '#059669',
  djvu: '#DB2777',
  cbz: '#65A30D',
  txt: '#6B7280',
  docx: '#9333EA',
  default: '#94A3B8',
};

export function formatColor(format: string): string {
  return FORMAT_PALETTE[format.toLowerCase()] ?? FORMAT_PALETTE.default;
}
