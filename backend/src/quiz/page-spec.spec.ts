import { parsePageSpec, formatPageSpec } from './page-spec';

describe('page spec', () => {
  describe('parsePageSpec', () => {
    it('parses a single page', () => {
      expect(parsePageSpec('183').pages).toEqual([183]);
    });

    it('parses a hyphen range', () => {
      expect(parsePageSpec('183-186').pages).toEqual([183, 184, 185, 186]);
    });

    it('parses a comma list', () => {
      expect(parsePageSpec('2,3,8,10').pages).toEqual([2, 3, 8, 10]);
    });

    it('parses a mix of ranges and singles', () => {
      expect(parsePageSpec('183-185, 190, 195-196').pages).toEqual([
        183, 184, 185, 190, 195, 196,
      ]);
    });

    it('tolerates whitespace and trailing commas', () => {
      expect(parsePageSpec('  183 , , 184  ').pages).toEqual([183, 184]);
    });

    it('accepts en dash and em dash, not just hyphen', () => {
      // A phone keyboard or a paste from a document produces these.
      expect(parsePageSpec('183–185').pages).toEqual([183, 184, 185]);
      expect(parsePageSpec('183—185').pages).toEqual([183, 184, 185]);
    });

    it('repairs a reversed range rather than rejecting it', () => {
      expect(parsePageSpec('186-183').pages).toEqual([183, 184, 185, 186]);
    });

    it('deduplicates overlapping selections', () => {
      expect(parsePageSpec('183-185, 184, 185').pages).toEqual([183, 184, 185]);
    });

    it('reports unparseable fragments instead of dropping them silently', () => {
      const r = parsePageSpec('183, chapter 9, 185');
      expect(r.pages).toEqual([183, 185]);
      expect(r.invalid).toEqual(['chapter 9']);
    });

    it('refuses an absurd range rather than building a huge array', () => {
      const r = parsePageSpec('1-100000');
      expect(r.pages).toEqual([]);
      expect(r.invalid).toEqual(['1-100000']);
    });

    it('returns empty for empty input', () => {
      expect(parsePageSpec('').pages).toEqual([]);
      expect(parsePageSpec('   ').pages).toEqual([]);
    });
  });

  describe('formatPageSpec', () => {
    it('collapses consecutive runs', () => {
      expect(formatPageSpec([1, 2, 3, 7, 9, 10])).toBe('1-3, 7, 9-10');
    });

    it('handles a single page', () => {
      expect(formatPageSpec([183])).toBe('183');
    });

    it('handles one unbroken run', () => {
      expect(formatPageSpec([183, 184, 185])).toBe('183-185');
    });

    it('sorts and dedupes before formatting', () => {
      expect(formatPageSpec([185, 183, 184, 183])).toBe('183-185');
    });

    it('returns empty string for no pages', () => {
      expect(formatPageSpec([])).toBe('');
    });

    it('round-trips with parsePageSpec', () => {
      const pages = [183, 184, 185, 190, 195, 196];
      expect(parsePageSpec(formatPageSpec(pages)).pages).toEqual(pages);
    });
  });
});
