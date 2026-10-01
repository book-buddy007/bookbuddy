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

/** Map a usage percentage to the design-system semantic tokens */
export function riskColor(pct: number): {
  bar: string;
  text: string;
  badge: string;
} {
  if (pct >= STORAGE_THRESHOLDS.FULL_PCT) {
    return { bar: 'bg-bb-danger', text: 'text-bb-danger-ink', badge: 'bg-bb-danger-soft text-bb-danger-ink' };
  }
  if (pct >= STORAGE_THRESHOLDS.CRITICAL_PCT) {
    return { bar: 'bg-bb-accent', text: 'text-bb-accent-ink', badge: 'bg-bb-accent-soft text-bb-accent-ink' };
  }
  if (pct >= STORAGE_THRESHOLDS.WARNING_PCT) {
    return { bar: 'bg-bb-warning', text: 'text-bb-warning-ink', badge: 'bg-bb-warning-soft text-bb-warning-ink' };
  }
  return { bar: 'bg-bb-success', text: 'text-bb-success-ink', badge: 'bg-bb-success-soft text-bb-success-ink' };
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

/** Colour ramp for format breakdown bars: navy/cobalt series, orange as the highlight (no rainbow). */
export const FORMAT_PALETTE: Record<string, string> = {
  pdf: '#FF4D00',
  epub: '#1E3A8A',
  mp3: '#3B5BDB',
  mp4: '#5B7CFF',
  mobi: '#FF9A55',
  azw3: '#0F1F5C',
  djvu: '#C23400',
  cbz: '#7A8BB8',
  txt: '#A7B0C8',
  docx: '#2B4FD0',
  default: '#C5CCDD',
};

export function formatColor(format: string): string {
  return FORMAT_PALETTE[format.toLowerCase()] ?? FORMAT_PALETTE.default;
}
