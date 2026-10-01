import type { Citation } from "@/hooks/useBookChat"

/* The citation contract, client side.

   The model is shown numbered sources and asked to cite with `[n]` markers. A marker is
   rewritten into a link only when it resolves to a citation we were actually served, so a
   hallucinated `[9]` — or any `[n]` in a message rehydrated from history, which carries no
   page numbers — degrades to plain text instead of becoming a control that jumps nowhere.
   (Shared by the Varta page and the reader's Varta drawer.) */

export function buildCiteMaps(citations: Citation[] = []) {
  const byIndex = new Map<number, Citation>(
    citations.filter((c) => typeof c.index === "number").map((c) => [c.index as number, c])
  )
  const byChunkId = new Map<string, Citation>(citations.filter((c) => c.chunkId).map((c) => [c.chunkId, c]))
  return { byIndex, byChunkId }
}

export const citeHref = (index: number) => `#varta-cite-${index}`
export const CITE_HREF_RE = /#varta-cite-(\d+)/

export function linkifyCitations(
  content: string,
  byIndex: Map<number, Citation>,
  byChunkId: Map<string, Citation>
): string {
  const pill = (cite: Citation | undefined) =>
    cite && cite.pageNumber != null && typeof cite.index === "number"
      ? `[Pg. ${cite.pageNumber}](${citeHref(cite.index)})`
      : null

  return (
    content
      // Retired `[cite:<chunkId>]` format: resolve to a pill where possible, else drop the bare id.
      .replace(/\[cite:([^\]]+)\]/g, (_whole, id: string) => pill(byChunkId.get(id.trim())) ?? "")
      .replace(/\[(\d+)\]/g, (whole, n: string) => pill(byIndex.get(parseInt(n, 10))) ?? whole)
      // Removing a marker can strand the space before punctuation ("intervention .").
      .replace(/ +([.,;:!?])/g, "$1")
  )
}
