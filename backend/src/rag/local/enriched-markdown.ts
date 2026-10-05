/**
 * Parser and chunker for the "enriched markdown" format the textbook-prep skill produces
 * (see docs/ENRICHED_MARKDOWN_STEM_GUIDE.md and the skill's references/block-types.md).
 *
 * A chapter is a YAML-ish frontmatter block followed by a body made of:
 *   - `<!-- PAGE N -->`            printed page markers (what citations are built from)
 *   - `<!-- SECTION: ... -->`      section markers (and `<!-- SUBSECTION: ... -->`)
 *   - typed blocks                 `[FIGURE 8.1 | Page 183 | ...] ... [/FIGURE]`
 *   - prose paragraphs
 *   - `<!-- SKIP FOR EMBEDDING ... -->` and other comments, which are never indexed
 *
 * The rules this implements, from the format's own contract:
 *   - A block is INDIVISIBLE ("a table title in one chunk and its data in another is worse than
 *     no table at all"), unless it is so large it could not be embedded in one piece.
 *   - A block's own `Page N` / `Page N-M` tag wins over the surrounding page marker.
 *   - DISCUSSION_PROMPT, ACTIVITY and an exercises section are `practice`: indexed, but kept out
 *     of answers by the search filter. Everything else is `reference`.
 *   - QR CODE blocks carry nothing readable and are not indexed.
 *
 * Pure functions, no I/O: everything here is exercised by unit tests.
 */

export type RetrievalClass = 'reference' | 'practice';

export interface Chunk {
  /** The excerpt the model is shown and a citation previews. Pure content, no breadcrumb. */
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
  /** From the frontmatter `chapter_title`. */
  chapter: string;
  /** The innermost SUBSECTION/SECTION marker in force where the chunk starts. */
  sectionTitle: string | null;
  retrievalClass: RetrievalClass;
  /** The block type for a block chunk (`FIGURE`, `TABLE`, ...), null for prose. */
  blockType: string | null;
  /** The block's printed number, e.g. `8.3`. */
  label: string | null;
}

export interface ChunkOptions {
  /** Prose is packed up to about this many characters per chunk (~450 tokens). */
  targetChars?: number;
  /** A chunk is never allowed past this; a longer paragraph is split at sentence boundaries. */
  maxChars?: number;
  /** A block longer than this is split (and each part repeats the block header). */
  maxBlockChars?: number;
  /** A short paragraph at the end of a chunk is repeated at the start of the next. */
  overlapChars?: number;
  /** When the page changes, close the chunk once it holds at least this much. */
  pageBreakChars?: number;
}

export interface SkippedItem {
  page: number | null;
  reason: string;
}

export interface ParsedChapter {
  meta: Record<string, string>;
  chunks: Chunk[];
  skipped: SkippedItem[];
  /** Problems worth showing an operator that did not stop parsing (unclosed block, ...). */
  warnings: string[];
}

const DEFAULTS: Required<ChunkOptions> = {
  targetChars: 1800,
  maxChars: 2600,
  maxBlockChars: 6000,
  overlapChars: 300,
  pageBreakChars: 900,
};

// ── Frontmatter ──────────────────────────────────────────────────────────────

export function splitFrontmatter(markdown: string): {
  meta: Record<string, string>;
  body: string;
} {
  const text = markdown.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  if (lines[0]?.trim() !== '---') return { meta: {}, body: text };

  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end === -1) return { meta: {}, body: text };

  const meta: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue; // continuation lines of a long value are not needed here
    meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: lines.slice(end + 1).join('\n') };
}

// ── Recognising the format's lines ───────────────────────────────────────────

const PAGE_MARKER = /^<!--\s*PAGE\s+(\d+)\s*-->$/;
const SECTION_MARKER = /^<!--\s*SECTION:\s*(.+?)\s*-->$/;
const SUBSECTION_MARKER = /^<!--\s*SUBSECTION:\s*(.+?)\s*-->$/;
const SKIP_MARKER = /^<!--\s*SKIP FOR EMBEDDING\b(.*?)-->$/;
// Same shape the author's own linter uses: the optional number is digits and dots only, so
// `[GLOSSARY TERM | ...]` is the type "GLOSSARY TERM", not the type "GLOSSARY" with a label.
const BLOCK_OPEN = /^\[([A-Z_][A-Z_ ]*?)(?:\s+(\d+(?:\.\d+)*))?\s*(\||\])/;
const BLOCK_CLOSE = /^\[\/([A-Z_ ]+)\]\s*$/;
const PAGE_TAG = /Page\s+(\d+)(?:\s*[-–—]\s*(\d+))?/i;

const PRACTICE_BLOCKS = new Set(['DISCUSSION_PROMPT', 'ACTIVITY']);
const NOT_INDEXED_BLOCKS = new Set(['QR CODE']);

// A section whose name says it is exercises. These are indexed (useful for quizzes) but
// flagged practice so the answer search never quotes a question back as if it were the answer.
const PRACTICE_SECTION =
  /^(?:chapter\s+)?(?:review\s+)?(?:questions?|exercises?|practi[sc]e|assignments?|worksheets?|test yourself|self[- ]assessment|activities|project work)\b/i;

export const isPracticeSection = (label: string | null): boolean =>
  !!label && PRACTICE_SECTION.test(label.trim());

const cleanSection = (label: string): string =>
  label.replace(/\s*\(continued\)\s*$/i, '').trim();

// ── Units: paragraphs and blocks, in reading order ───────────────────────────

interface ProseUnit {
  kind: 'prose';
  text: string;
  page: number | null;
  /** The SECTION marker (not the subsection): chunks never cross it. */
  section: string | null;
  sectionTitle: string | null;
  practice: boolean;
}

interface BlockUnit {
  kind: 'block';
  blockType: string;
  label: string | null;
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
  section: string | null;
  sectionTitle: string | null;
  practice: boolean;
}

type Unit = ProseUnit | BlockUnit;

function toUnits(
  body: string,
  skipped: SkippedItem[],
  warnings: string[],
): Unit[] {
  const lines = body.split('\n');
  const units: Unit[] = [];

  let page: number | null = null;
  let section: string | null = null;
  let subsection: string | null = null;
  let practiceSection = false;
  let paragraph: string[] = [];
  let paragraphPage: number | null = null;

  const sectionTitle = () => subsection ?? section;

  const flushParagraph = () => {
    const text = paragraph.join('\n').trim();
    paragraph = [];
    if (!text) return;
    units.push({
      kind: 'prose',
      text,
      page: paragraphPage,
      section,
      sectionTitle: sectionTitle(),
      practice: practiceSection,
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // Comments: markers carry structure, everything else is ignored.
    if (line.startsWith('<!--')) {
      // A comment that runs over several lines is skipped as a whole.
      if (!line.includes('-->')) {
        while (i + 1 < lines.length && !lines[i].includes('-->')) i++;
        continue;
      }
      const pageMatch = line.match(PAGE_MARKER);
      if (pageMatch) {
        flushParagraph();
        page = Number(pageMatch[1]);
        continue;
      }
      const sectionMatch = line.match(SECTION_MARKER);
      if (sectionMatch) {
        flushParagraph();
        section = cleanSection(sectionMatch[1]);
        subsection = null;
        practiceSection = isPracticeSection(section);
        continue;
      }
      const subMatch = line.match(SUBSECTION_MARKER);
      if (subMatch) {
        flushParagraph();
        subsection = cleanSection(subMatch[1]);
        continue;
      }
      const skipMatch = line.match(SKIP_MARKER);
      if (skipMatch) {
        flushParagraph();
        const tag = skipMatch[1].match(PAGE_TAG);
        skipped.push({
          page: tag ? Number(tag[1]) : page,
          reason:
            skipMatch[1].match(/Reason:\s*(.+?)\s*$/i)?.[1] ?? 'not indexed',
        });
      }
      continue; // SKIP, ASSET MISSING, "Columns were:" and any other comment
    }

    // A typed block, read through to its closing tag.
    const open = line.match(BLOCK_OPEN);
    if (open && !BLOCK_CLOSE.test(line)) {
      flushParagraph();
      const blockType = open[1].trim();
      const label = open[2] ?? null;
      const blockLines: string[] = [line];
      let closed = false;

      while (i + 1 < lines.length) {
        i++;
        const inner = lines[i];
        const close = inner.trim().match(BLOCK_CLOSE);
        if (close && close[1].trim() === blockType) {
          closed = true;
          break;
        }
        // An unclosed block must not swallow the rest of the chapter: stop at the next
        // block opening or structural marker and say so.
        const t = inner.trim();
        if (
          (BLOCK_OPEN.test(t) && !BLOCK_CLOSE.test(t)) ||
          PAGE_MARKER.test(t) ||
          SECTION_MARKER.test(t)
        ) {
          i--;
          break;
        }
        blockLines.push(inner);
      }
      if (!closed) {
        warnings.push(
          `Block [${blockType}${label ? ` ${label}` : ''}] near page ${page ?? '?'} has no closing tag; ended at the next marker.`,
        );
      }

      if (!NOT_INDEXED_BLOCKS.has(blockType)) {
        const tag = line.match(PAGE_TAG);
        const start = tag ? Number(tag[1]) : page;
        const end = tag?.[2] ? Number(tag[2]) : start;
        units.push({
          kind: 'block',
          blockType,
          label,
          text: blockLines.join('\n').trim(),
          pageStart: start,
          pageEnd: end,
          section,
          sectionTitle: sectionTitle(),
          practice: practiceSection || PRACTICE_BLOCKS.has(blockType),
        });
      }
      continue;
    }

    // Prose. A markdown table stays one paragraph even across stray blank lines.
    if (line === '') {
      const next = lines[i + 1]?.trim() ?? '';
      const inTable = paragraph.length > 0 && paragraph[0].trim().startsWith('|');
      if (inTable && next.startsWith('|')) {
        paragraph.push('');
        continue;
      }
      flushParagraph();
      continue;
    }
    if (paragraph.length === 0) paragraphPage = page;
    paragraph.push(raw.replace(/\s+$/, ''));
  }
  flushParagraph();
  return units;
}

// ── Packing units into chunks ────────────────────────────────────────────────

/** "**Choices and Limited Resources**" and similar: a title that must stay with what follows. */
const isHeadingLike = (text: string): boolean =>
  text.length <= 120 &&
  !text.includes('\n\n') &&
  (/^\*\*[^*]+\*\*$/.test(text.trim()) ||
    /^#{1,6}\s/.test(text.trim()) ||
    (!/[.!?:;,]$/.test(text.trim()) && text.trim().split(/\s+/).length <= 10 && /^\*\*/.test(text.trim())));

/**
 * Splits one over-long paragraph into pieces no longer than `limit`, preferring sentence ends
 * and line breaks. Nothing is ever dropped: the pieces joined back together are the original.
 */
export function splitLongText(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];

  // Alternating [segment, separator, segment, ...]; the separator is a line break or the
  // whitespace that follows sentence-ending punctuation.
  const tokens = text.split(/(\n+|(?<=[.!?]["')\]]*)[ \t]+)/);
  const parts: string[] = [];
  let current = '';

  const push = () => {
    if (current.trim()) parts.push(current.trim());
    current = '';
  };

  for (let i = 0; i < tokens.length; i += 2) {
    const segment = tokens[i] ?? '';
    const separator = tokens[i + 1] ?? '';
    if (current && current.length + segment.length > limit) push();
    // One segment still over the limit (a run-on, a long URL) is cut hard.
    if (segment.length > limit) {
      push();
      for (let j = 0; j < segment.length; j += limit) {
        parts.push(segment.slice(j, j + limit).trim());
      }
      continue;
    }
    current += segment + separator;
  }
  push();
  return parts.filter(Boolean);
}

interface Pending {
  texts: { text: string; page: number | null }[];
  section: string | null;
  sectionTitle: string | null;
  practice: boolean;
}

export function packUnits(
  units: Unit[],
  chapter: string,
  options: ChunkOptions = {},
): Chunk[] {
  const o = { ...DEFAULTS, ...options };
  const chunks: Chunk[] = [];
  let buf: Pending | null = null;

  const size = (p: Pending) =>
    p.texts.reduce((n, t) => n + t.text.length + 2, 0);

  const emit = (p: Pending) => {
    const pages = p.texts
      .map((t) => t.page)
      .filter((n): n is number => n != null);
    const text = p.texts.map((t) => t.text).join('\n\n').trim();
    if (text.replace(/[^\p{L}\p{N}]/gu, '').length < 12) return; // nothing worth indexing
    // A title on its own (a chapter opener, a heading before a figure) holds nothing to answer
    // from; the section title is already stored with every chunk.
    if (p.texts.every((t) => isHeadingLike(t.text))) return;
    chunks.push({
      text,
      pageStart: pages.length ? Math.min(...pages) : null,
      pageEnd: pages.length ? Math.max(...pages) : null,
      chapter,
      sectionTitle: p.sectionTitle,
      retrievalClass: p.practice ? 'practice' : 'reference',
      blockType: null,
      label: null,
    });
  };

  /** Closes the current chunk, carrying a trailing title or short paragraph into the next. */
  const flush = (carry: boolean): Pending['texts'] => {
    if (!buf || buf.texts.length === 0) {
      buf = null;
      return [];
    }
    const carried: Pending['texts'] = [];
    // A heading left dangling at the end belongs to what comes next.
    while (
      carry &&
      buf.texts.length > 1 &&
      isHeadingLike(buf.texts[buf.texts.length - 1].text)
    ) {
      carried.unshift(buf.texts.pop()!);
    }
    emit(buf);
    // Short trailing paragraph repeated for continuity across the boundary.
    if (carry && carried.length === 0 && o.overlapChars > 0) {
      const last = buf.texts[buf.texts.length - 1];
      if (last && last.text.length <= o.overlapChars && buf.texts.length > 1) {
        carried.push(last);
      }
    }
    buf = null;
    return carried;
  };

  for (const unit of units) {
    if (unit.kind === 'block') {
      flush(false);
      const header = unit.text.split('\n')[0];
      const parts =
        unit.text.length <= o.maxBlockChars
          ? [unit.text]
          : splitLongText(unit.text, Math.floor(o.maxBlockChars * 0.8));
      parts.forEach((part, index) => {
        const text =
          index === 0 || parts.length === 1
            ? part
            : `${header} (continued, part ${index + 1} of ${parts.length})\n${part}`;
        chunks.push({
          text,
          pageStart: unit.pageStart,
          pageEnd: unit.pageEnd,
          chapter,
          sectionTitle: unit.sectionTitle,
          retrievalClass: unit.practice ? 'practice' : 'reference',
          blockType: unit.blockType,
          label: unit.label,
        });
      });
      continue;
    }

    const pieces = splitLongText(unit.text, o.maxChars);
    for (const piece of pieces) {
      let carried: Pending['texts'] = [];

      if (buf) {
        const sectionChanged = buf.section !== unit.section;
        const classChanged = buf.practice !== unit.practice;
        const lastPage = buf.texts[buf.texts.length - 1]?.page ?? null;
        const pageChanged =
          unit.page != null && lastPage != null && unit.page !== lastPage;
        const bufSize = size(buf);

        if (sectionChanged || classChanged) {
          flush(false);
        } else if (bufSize + piece.length > o.maxChars) {
          carried = flush(true);
        } else if (bufSize >= o.targetChars) {
          carried = flush(true);
        } else if (pageChanged && bufSize >= o.pageBreakChars) {
          carried = flush(true);
        }
      }

      if (!buf) {
        buf = {
          texts: [...carried],
          section: unit.section,
          sectionTitle: unit.sectionTitle,
          practice: unit.practice,
        };
      }
      buf.texts.push({ text: piece, page: unit.page });
    }
  }
  flush(false);
  return chunks;
}

// ── Entry point ──────────────────────────────────────────────────────────────

export function parseEnrichedMarkdown(
  markdown: string,
  options: ChunkOptions = {},
): ParsedChapter {
  const { meta, body } = splitFrontmatter(markdown);
  const skipped: SkippedItem[] = [];
  const warnings: string[] = [];

  if (Object.keys(meta).length === 0) {
    warnings.push(
      'No frontmatter found: chapter title, page range and validation status are unknown.',
    );
  }
  const chapter = meta.chapter_title || meta.book_title || 'Chapter';
  const units = toUnits(body, skipped, warnings);
  const chunks = packUnits(units, chapter, options);
  return { meta, chunks, skipped, warnings };
}
