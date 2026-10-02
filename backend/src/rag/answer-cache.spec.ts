import {
  AnswerCacheService,
  buildAnswerKey,
  isCacheableMode,
  normalizeQuery,
} from './answer-cache.service';

describe('answer cache', () => {
  describe('isCacheableMode', () => {
    /* This is a correctness boundary, not a tuning knob: quiz_me, socratic and
       debate each build their prompt from the asking student's own history, so
       a shared entry would hand one student the wrong half of another's
       conversation. */
    it('allows only explain', () => {
      expect(isCacheableMode('explain')).toBe(true);
      expect(isCacheableMode('quiz_me')).toBe(false);
      expect(isCacheableMode('socratic')).toBe(false);
      expect(isCacheableMode('debate')).toBe(false);
    });
  });

  describe('normalizeQuery', () => {
    it('folds case, padding, inner runs and trailing punctuation', () => {
      const variants = [
        'What is opportunity cost?',
        '  what is opportunity cost  ',
        'WHAT   IS   OPPORTUNITY   COST',
        'What is opportunity cost?!',
      ];
      const normalized = variants.map(normalizeQuery);
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe('what is opportunity cost');
    });

    it('keeps questions that differ by a real word apart', () => {
      expect(normalizeQuery('what is demand')).not.toBe(
        normalizeQuery('what is supply'),
      );
      // No stemming, deliberately — conflating these would answer the wrong one.
      expect(normalizeQuery('what is a market')).not.toBe(
        normalizeQuery('what are markets'),
      );
    });
  });

  describe('buildAnswerKey', () => {
    const base = {
      bookId: 'b1',
      mode: 'explain' as const,
      query: 'what is demand',
    };

    it('matches across trivial phrasing differences', () => {
      expect(buildAnswerKey(base)).toBe(
        buildAnswerKey({ ...base, query: 'What is demand?' }),
      );
    });

    it('separates books', () => {
      expect(buildAnswerKey(base)).not.toBe(
        buildAnswerKey({ ...base, bookId: 'b2' }),
      );
    });

    it('separates curriculum scopes', () => {
      /* Two students at different institutes can ask identical words and be
         entitled to different passages. Omitting scope would leak scoped
         content across institutes. */
      expect(buildAnswerKey({ ...base, scopeNodeIds: ['x'] })).not.toBe(
        buildAnswerKey({ ...base, scopeNodeIds: ['y'] }),
      );
    });

    it('treats the same scope in a different order as the same key', () => {
      expect(buildAnswerKey({ ...base, scopeNodeIds: ['a', 'b'] })).toBe(
        buildAnswerKey({ ...base, scopeNodeIds: ['b', 'a'] }),
      );
    });
  });

  describe('AnswerCacheService', () => {
    let cache: AnswerCacheService;
    const answer = {
      content: 'Demand rises [1].',
      citations: [{ index: 1, pageNumber: 199 }],
    };

    beforeEach(() => {
      cache = new AnswerCacheService();
    });

    it('returns null on a miss and the value on a hit', () => {
      expect(cache.get('k')).toBeNull();
      cache.set('k', answer);
      expect(cache.get('k')).toEqual(answer);
    });

    it('refuses to cache an answer with no citations', () => {
      /* An uncited answer is a refusal or an upstream failure. Caching it
         would pin that outcome for everyone asking the same question — including
         after the underlying problem is fixed. */
      cache.set('k', {
        content: "I couldn't find this in the book.",
        citations: [],
      });
      expect(cache.get('k')).toBeNull();
    });

    it('refuses to cache empty content', () => {
      cache.set('k', { content: '   ', citations: [{ index: 1 }] });
      expect(cache.get('k')).toBeNull();
    });

    it('tracks hit rate', () => {
      cache.set('k', answer);
      cache.get('k');
      cache.get('missing');
      const s = cache.stats();
      expect(s.hits).toBe(1);
      expect(s.misses).toBe(1);
      expect(s.hitRate).toBe(0.5);
    });
  });
});
