import {
  parseCitedIndexes,
  parseCitedChunkIds,
  filterCitedOnly,
  CITATION_MARKER_RE,
} from './citation-markers';

/**
 * These tests pin the behaviour the previous implementation got wrong: it
 * shipped every retrieved chunk as a citation regardless of whether the answer
 * referenced it. `filterCitedOnly` with an uncited answer returning `[]` is the
 * assertion that would have failed before this change.
 */
describe('citation markers', () => {
  const served = [
    { index: 1, chunkId: 'a', pageNumber: 41 },
    { index: 2, chunkId: 'b', pageNumber: 44 },
    { index: 3, chunkId: 'c', pageNumber: 52 },
  ];

  describe('parseCitedIndexes', () => {
    it('collects every distinct marker', () => {
      expect(parseCitedIndexes('Photosynthesis [1] needs light [3].')).toEqual(new Set([1, 3]));
    });

    it('deduplicates a repeated marker', () => {
      expect(parseCitedIndexes('First [2]. Also [2]. Again [2].')).toEqual(new Set([2]));
    });

    it('returns empty for an answer with no markers', () => {
      expect(parseCitedIndexes('I could not find this in the book.')).toEqual(new Set());
    });

    it('returns empty for empty input', () => {
      expect(parseCitedIndexes('')).toEqual(new Set());
    });

    it('ignores the retired [cite:ID] format', () => {
      expect(parseCitedIndexes('Old style [cite:abc123] marker.')).toEqual(new Set());
    });

    it('is not order-dependent across calls', () => {
      // Guards the shared-global-regex lastIndex trap. Same input twice must
      // give the same answer, and must not disturb a subsequent different call.
      expect(parseCitedIndexes('a [1] b [2]')).toEqual(new Set([1, 2]));
      expect(parseCitedIndexes('a [1] b [2]')).toEqual(new Set([1, 2]));
      expect(parseCitedIndexes('only [3]')).toEqual(new Set([3]));
      expect(CITATION_MARKER_RE.lastIndex).toBe(0);
    });
  });

  describe('filterCitedOnly', () => {
    it('keeps only referenced citations, in served order', () => {
      const result = filterCitedOnly(served, 'Claim [3] and claim [1].');
      expect(result.map((c) => c.index)).toEqual([1, 3]);
    });

    it('returns nothing when the answer cites nothing', () => {
      // The regression this whole change exists to prevent: retrieval found
      // three passages, the answer used none of them, so nothing is cited.
      expect(filterCitedOnly(served, 'A confident but unsourced answer.')).toEqual([]);
    });

    it('drops a hallucinated index outside the served set', () => {
      const result = filterCitedOnly(served, 'Real [2], invented [9].');
      expect(result.map((c) => c.index)).toEqual([2]);
    });

    it('handles an empty served set', () => {
      expect(filterCitedOnly([], 'Cites [1] that was never served.')).toEqual([]);
    });

    /* Observed in production: answers written under the previous prompt cite
       the long chunk id rather than the number. Recognising it means a model
       that ignores the format change still produces resolvable citations
       instead of an answer that reports none. */
    it('also matches the retired [cite:<chunkId>] form', () => {
      const result = filterCitedOnly(served, 'Grounded in the text [cite:b].');
      expect(result.map((c) => c.index)).toEqual([2]);
    });

    it('matches a mix of both forms without duplicating', () => {
      const result = filterCitedOnly(served, 'One [1], two [cite:b], one again [cite:a].');
      expect(result.map((c) => c.index)).toEqual([1, 2]);
    });

    it('ignores a [cite:<id>] that was never served', () => {
      expect(filterCitedOnly(served, 'Invented [cite:zzz].')).toEqual([]);
    });
  });

  describe('parseCitedChunkIds', () => {
    it('extracts and trims ids', () => {
      expect(parseCitedChunkIds('a [cite:item:asset:38] b [cite: spaced ]')).toEqual(
        new Set(['item:asset:38', 'spaced']),
      );
    });

    it('returns empty when only numeric markers are present', () => {
      expect(parseCitedChunkIds('Just [1] and [2].')).toEqual(new Set());
    });
  });
});
