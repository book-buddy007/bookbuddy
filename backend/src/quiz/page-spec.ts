/**
 * Parser for a page selection: "183", "183-190", "2,3,8,10", or any mix.
 *
 * Used by the session-scoped quiz, where the pages are normally filled in
 * automatically from what the student actually read and only edited by hand
 * when they want something narrower.
 *
 * Everything here works in PRINTED page numbers — the ones the chunks carry.
 * Converting from the reader's own page numbering happens before this, using
 * the offset from `GET /books/:id/page-map`, which refuses to resolve unless
 * it can prove the mapping. Nothing in this file can tell the two coordinate
 * systems apart, so it must never be handed reader pages directly.
 */

/** Guards against `1-100000` turning into a hundred thousand element array. */
const MAX_PAGES = 500;

export interface PageSpecResult {
  pages: number[];
  /** Fragments that could not be understood, echoed back so the UI can say
      which part of what the student typed was ignored rather than silently
      dropping it. */
  invalid: string[];
}

export function parsePageSpec(spec: string): PageSpecResult {
  const pages = new Set<number>();
  const invalid: string[] = [];

  if (!spec?.trim()) return { pages: [], invalid: [] };

  for (const rawPart of spec.split(',')) {
    const part = rawPart.trim();
    if (!part) continue;

    // Hyphen, en dash and em dash: a student typing a range on a phone
    // keyboard, or pasting from a document, can produce any of them.
    const range = part.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (range) {
      let from = Number.parseInt(range[1], 10);
      let to = Number.parseInt(range[2], 10);
      // "195-183" is a legible intent, not an error.
      if (from > to) [from, to] = [to, from];
      if (to - from + 1 > MAX_PAGES) {
        invalid.push(part);
        continue;
      }
      for (let p = from; p <= to; p++) pages.add(p);
      continue;
    }

    if (/^\d+$/.test(part)) {
      pages.add(Number.parseInt(part, 10));
      continue;
    }

    invalid.push(part);
  }

  return {
    pages: Array.from(pages).sort((a, b) => a - b).slice(0, MAX_PAGES),
    invalid,
  };
}

/**
 * Compact a page list back into a readable spec: [1,2,3,7,9,10] -> "1-3, 7, 9-10".
 * The session scope fills its input from the pages actually read, and a student
 * who has read thirty pages should see "183-212", not thirty comma-separated
 * numbers they then have to edit.
 */
export function formatPageSpec(pages: number[]): string {
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);
  if (sorted.length === 0) return '';

  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current !== prev + 1) {
      parts.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = current;
    }
    prev = current;
  }
  return parts.join(', ');
}
