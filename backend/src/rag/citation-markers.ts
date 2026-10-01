/**
 * The citation marker contract.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE FILES MUST AGREE ON THIS FORMAT. They previously did not.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `dialogue-policy.service.ts` instructed the model to emit `[cite:CHUNK_ID]`.
 * `book-chat.controller.ts` labelled its excerpts `[chunk:<id>]`. The reader
 * (`components/reader/VartaSidebar.tsx`) parsed neither — it matched markdown
 * links pointing at `#page-N`, a format nothing in the system produced.
 *
 * Net effect in production: the page-jump pills never rendered at all, and the
 * model's raw `[cite:...]` markers leaked into the answer text as prose. The
 * citations array shipped on the terminal SSE frame described *what retrieval
 * returned*, not what the answer used, so any UI built on it would have
 * attributed claims to passages the model may never have read.
 *
 * The format is now a 1-based integer in square brackets — `[1]`, `[2]` —
 * matching the numbering the controller applies to the excerpts it serves.
 * Small integers are cheap for a model to reproduce byte-exactly (unlike a
 * long opaque id it has every incentive to truncate or paraphrase) and
 * trivial to validate against the served set.
 *
 * Validation is the point. A model that cites `[9]` when five excerpts were
 * served has hallucinated provenance, and that must not reach the reader as a
 * clickable control. `filterCitedOnly` drops unreferenced citations; the
 * reader independently refuses to linkify a marker it cannot resolve. Both
 * halves fail toward plain text.
 *
 * The reader reimplements this regex rather than importing it — it is a Next
 * frontend and cannot import from the Nest backend. Keep the two in step; the
 * spec beside this file is the reference.
 */

/** Matches a citation marker and captures its 1-based index. */
export const CITATION_MARKER_RE = /\[(\d+)\]/g;

/**
 * Every distinct citation index referenced in an answer.
 *
 * A fresh RegExp per call, not the shared `CITATION_MARKER_RE`: a global regex
 * carries mutable `lastIndex`, so reusing the exported constant across calls
 * would make results depend on call order — the kind of bug that shows up as
 * "citations sometimes go missing" and is close to undiagnosable after the fact.
 */
export function parseCitedIndexes(answer: string): Set<number> {
  if (!answer) return new Set();
  const re = new RegExp(CITATION_MARKER_RE.source, 'g');
  return new Set(Array.from(answer.matchAll(re), (m) => parseInt(m[1], 10)));
}

/**
 * Narrow the served citations to those the answer actually referenced.
 *
 * An answer citing nothing yields an empty array, deliberately: retrieval
 * having found a passage is not evidence the answer came from it, and a
 * confident page reference beside an unsupported sentence is worse than no
 * reference at all — the student clicks through, reads the page, and it does
 * not say that.
 */
export function filterCitedOnly<T extends { index: number; chunkId?: string }>(
  served: T[],
  answer: string,
): T[] {
  const cited = parseCitedIndexes(answer);
  const citedIds = parseCitedChunkIds(answer);
  return served.filter((c) => cited.has(c.index) || (c.chunkId != null && citedIds.has(c.chunkId)));
}

/**
 * The retired `[cite:<chunkId>]` form, still recognised on the read side.
 *
 * Models do not always follow a format change, and this one has an observed
 * habit of emitting the long id: production answers written under the previous
 * prompt are full of it. Recognising both means a lapse costs nothing — the
 * citation still resolves to a page — instead of silently shipping an answer
 * with zero citations, which is indistinguishable from an ungrounded one.
 *
 * Only ids we actually served can match, so this widens what counts as a
 * reference without widening what can be cited.
 */
export function parseCitedChunkIds(answer: string): Set<string> {
  if (!answer) return new Set();
  return new Set(Array.from(answer.matchAll(/\[cite:([^\]]+)\]/g), (m) => m[1].trim()));
}
