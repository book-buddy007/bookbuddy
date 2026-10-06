import { ContentSpineService, SharedIndexUnavailableError } from './content-spine.service';
import { RagSearchService } from './rag-search.service';

/**
 * Search follows the book: an own-index book is searched in Book Buddy's index, locked to its
 * tenant, with a 1024-wide question; a shared book in the shared index, public passages only, with a
 * 3072-wide question. Neither can leak into the other.
 */
describe('RagSearchService routing', () => {
  const saved = process.env.SHARED_QDRANT_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.SHARED_QDRANT_URL;
    else process.env.SHARED_QDRANT_URL = saved;
  });

  function make(opts: { book?: any; sharedProblem?: string | null; sharedConfigured?: boolean } = {}) {
    if (opts.sharedConfigured !== false) process.env.SHARED_QDRANT_URL = 'http://shared:6333';
    else delete process.env.SHARED_QDRANT_URL;

    const hit = { id: 'p1', score: 0.9, payload: { content_item_id: 'x', content_asset_id: 'a', chunk_index: 3, page_start: 7, chapter: 'C', text: 'Opportunity cost is the next best use.' } };
    const local = { query: jest.fn().mockResolvedValue({ points: [hit] }), scroll: jest.fn().mockResolvedValue({ points: [], next_page_offset: null }) };
    const shared = { query: jest.fn().mockResolvedValue({ points: [hit] }), scroll: jest.fn().mockResolvedValue({ points: [], next_page_offset: null }) };
    const qdrantInit = {
      getClient: () => local,
      getSharedClient: () => (opts.sharedConfigured === false ? null : shared),
      sharedProblem: () => opts.sharedProblem ?? null,
    };
    const prisma = { book: { findUnique: jest.fn().mockResolvedValue(opts.book === undefined ? { spineContentItemId: null } : opts.book) } };
    const spine = new ContentSpineService(qdrantInit as any, prisma as any);
    const embedding = { embedOne: jest.fn(async (_q: string, o?: { dimensions?: number }) => new Array(o?.dimensions ?? 1024).fill(0.1)) };
    const service = new RagSearchService(qdrantInit as any, embedding as any, spine);
    return { service, local, shared, embedding };
  }

  const mustKeys = (call: any[]) => (call[1].filter?.must ?? call[1].prefetch[0].filter.must).map((c: any) => c.key);
  const mustOf = (call: any[]) => call[1].filter?.must ?? call[1].prefetch[0].filter.must;

  describe('search', () => {
    it("searches an own-index book in Book Buddy's index, locked to its tenant, at the own width", async () => {
      const { service, local, shared, embedding } = make();
      const results = await service.search('what is opportunity cost', { tenantId: 't1', bookId: 'b1', contentItemId: 'b1' });

      expect(results).toHaveLength(1);
      expect(shared.query).not.toHaveBeenCalled();
      expect(local.query.mock.calls[0][0]).toBe('book_buddy_chunks_v1');
      expect(mustOf(local.query.mock.calls[0])).toEqual(
        expect.arrayContaining([
          { key: 'content_item_id', match: { value: 'b1' } },
          { key: 'tenant_id', match: { value: 't1' } },
          { key: 'visibility', match: { value: 'public' } },
        ]),
      );
      expect(embedding.embedOne).toHaveBeenCalledWith('what is opportunity cost', { dimensions: 1024 });
    });

    it('searches a shared book in the shared index, for its work, public only, at the shared width', async () => {
      const { service, local, shared, embedding } = make({ book: { spineContentItemId: 'work-9' } });
      await service.search('what is opportunity cost', { tenantId: 't1', bookId: 'b1', contentItemId: 'work-9' });

      expect(local.query).not.toHaveBeenCalled();
      expect(shared.query.mock.calls[0][0]).toBe('trio_content_v1_openai3072');
      const keys = mustKeys(shared.query.mock.calls[0]);
      expect(keys).toContain('visibility');
      expect(mustOf(shared.query.mock.calls[0])).toEqual(
        expect.arrayContaining([
          { key: 'content_item_id', match: { value: 'work-9' } },
          { key: 'visibility', match: { value: 'public' } },
        ]),
      );
      // The shared index has no tenant field: filtering on one would match nothing.
      expect(keys).not.toContain('tenant_id');
      expect(embedding.embedOne).toHaveBeenCalledWith('what is opportunity cost', { dimensions: 3072 });
    });

    it('refuses a shared book while the shared library is unusable, and never searches the own index instead', async () => {
      const down = make({ book: { spineContentItemId: 'work-9' }, sharedProblem: 'it could not be reached' });
      await expect(down.service.search('q', { tenantId: 't1', bookId: 'b1', contentItemId: 'work-9' })).rejects.toBeInstanceOf(
        SharedIndexUnavailableError,
      );
      expect(down.local.query).not.toHaveBeenCalled();
      expect(down.embedding.embedOne).not.toHaveBeenCalled();

      const unset = make({ book: { spineContentItemId: 'work-9' }, sharedConfigured: false });
      await expect(unset.service.search('q', { tenantId: 't1', bookId: 'b1', contentItemId: 'work-9' })).rejects.toBeInstanceOf(
        SharedIndexUnavailableError,
      );
      expect(unset.local.query).not.toHaveBeenCalled();
    });

    it('refuses a question about a work that is not the one the book is linked to', async () => {
      const { service, local, shared } = make({ book: { spineContentItemId: 'work-9' } });
      await expect(service.search('q', { tenantId: 't1', bookId: 'b1', contentItemId: 'someone-elses-work' })).rejects.toThrow(
        /not the work it is linked to/,
      );
      expect(local.query).not.toHaveBeenCalled();
      expect(shared.query).not.toHaveBeenCalled();
    });

    it('refuses a book it cannot scope, rather than searching everything', async () => {
      const { service, local, shared } = make();
      await expect(service.search('q', { tenantId: 't1', bookId: 'b1' })).rejects.toThrow(/cannot be scoped/);
      expect(local.query).not.toHaveBeenCalled();
      expect(shared.query).not.toHaveBeenCalled();
    });

    it('refuses a book that does not exist', async () => {
      const { service, local } = make({ book: null });
      await expect(service.search('q', { tenantId: 't1', bookId: 'gone', contentItemId: 'gone' })).rejects.toThrow(/not found/);
      expect(local.query).not.toHaveBeenCalled();
    });

    it('never answers from practice material, in either index', async () => {
      for (const book of [{ spineContentItemId: null }, { spineContentItemId: 'w' }]) {
        const { service, local, shared } = make({ book });
        await service.search('q', { tenantId: 't1', bookId: 'b1', contentItemId: book.spineContentItemId ?? 'b1' });
        const call = (book.spineContentItemId ? shared : local).query.mock.calls[0];
        expect(call[1].filter.must_not).toEqual([{ key: 'retrieval_class', match: { value: 'practice' } }]);
      }
    });
  });

  describe('findByReference', () => {
    it('locks an own-index book to its tenant', async () => {
      const { service, local } = make();
      await service.findByReference('what is shown in figure 8.2?', { tenantId: 't1', bookId: 'b1', contentItemId: 'b1' });
      expect(local.scroll.mock.calls[0][0]).toBe('book_buddy_chunks_v1');
      expect(local.scroll.mock.calls[0][1].filter.must).toEqual(
        expect.arrayContaining([{ key: 'tenant_id', match: { value: 't1' } }]),
      );
    });

    it('asks the shared index for public passages only, even though the book is authorised', async () => {
      const { service, local, shared } = make({ book: { spineContentItemId: 'work-9' } });
      await service.findByReference('what is shown in figure 8.2?', { tenantId: 't1', bookId: 'b1', contentItemId: 'work-9' });
      expect(local.scroll).not.toHaveBeenCalled();
      expect(shared.scroll.mock.calls[0][1].filter.must).toEqual([
        { key: 'content_item_id', match: { value: 'work-9' } },
        { key: 'visibility', match: { value: 'public' } },
      ]);
    });

    it('does nothing without a book, without a work, for the wrong work, or without a reference', async () => {
      const { service, local, shared } = make({ book: { spineContentItemId: 'work-9' } });
      await expect(service.findByReference('figure 8.2', { tenantId: 't1', contentItemId: 'work-9' })).resolves.toEqual([]);
      await expect(service.findByReference('figure 8.2', { tenantId: 't1', bookId: 'b1' })).resolves.toEqual([]);
      await expect(service.findByReference('figure 8.2', { tenantId: 't1', bookId: 'b1', contentItemId: 'other' })).resolves.toEqual([]);
      await expect(service.findByReference('what is inflation', { tenantId: 't1', bookId: 'b1', contentItemId: 'work-9' })).resolves.toEqual([]);
      expect(local.scroll).not.toHaveBeenCalled();
      expect(shared.scroll).not.toHaveBeenCalled();
    });
  });
});
