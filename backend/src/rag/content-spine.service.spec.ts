import {
  ContentSpineService,
  SharedIndexUnavailableError,
  readablePoints,
} from './content-spine.service';

/**
 * Per-book routing: every book lives in exactly one index, recorded on the book, and anything that
 * cannot be resolved is refused rather than guessed.
 */
describe('ContentSpineService', () => {
  const KEYS = ['SHARED_QDRANT_URL', 'SHARED_QDRANT_COLLECTION', 'SHARED_EMBEDDING_DIMENSIONS', 'QDRANT_COLLECTION_NAME', 'EMBEDDING_DIMENSIONS'];
  const saved: Record<string, string | undefined> = {};
  beforeAll(() => {
    for (const k of KEYS) saved[k] = process.env[k];
  });
  afterAll(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });
  beforeEach(() => {
    for (const k of KEYS) delete process.env[k];
  });

  const localClient = { name: 'local-client', scroll: jest.fn() };
  const sharedClient = { name: 'shared-client', scroll: jest.fn() };

  function make(opts: { book?: any; findError?: Error; shared?: boolean; sharedProblem?: string | null } = {}) {
    if (opts.shared !== false) process.env.SHARED_QDRANT_URL = 'http://shared:6333';
    const findUnique = opts.findError
      ? jest.fn().mockRejectedValue(opts.findError)
      : jest.fn().mockResolvedValue(opts.book === undefined ? { spineContentItemId: null } : opts.book);
    const qdrantInit = {
      getClient: () => localClient,
      getSharedClient: () => (opts.shared === false ? null : sharedClient),
      sharedProblem: () => opts.sharedProblem ?? null,
    };
    const spine = new ContentSpineService(qdrantInit as any, { book: { findUnique } } as any);
    return { spine, findUnique };
  }

  describe('resolveIndex', () => {
    it("puts a book with no recorded work in Book Buddy's own index, locked to the tenant", async () => {
      const { spine } = make();
      const index = await spine.resolveIndex('book-1');
      expect(index).toMatchObject({
        kind: 'local',
        client: localClient,
        collection: 'book_buddy_chunks_v1',
        dimensions: 1024,
        contentItemId: 'book-1',
        tenantLock: true,
        guard: [],
      });
    });

    it('honours the configured local collection and width', async () => {
      process.env.QDRANT_COLLECTION_NAME = 'custom_v2';
      process.env.EMBEDDING_DIMENSIONS = '768';
      const { spine } = make();
      expect(await spine.resolveIndex('b')).toMatchObject({ collection: 'custom_v2', dimensions: 768 });
    });

    it('puts a linked book in the shared index, for its work, public passages only', async () => {
      const { spine } = make({ book: { spineContentItemId: 'work-9' } });
      const index = await spine.resolveIndex('book-1');
      expect(index).toMatchObject({
        kind: 'shared',
        client: sharedClient,
        collection: 'trio_content_v1_openai3072',
        dimensions: 3072,
        contentItemId: 'work-9',
        tenantLock: false,
        guard: [{ key: 'visibility', match: { value: 'public' } }],
      });
    });

    it('honours the shared collection and width settings', async () => {
      process.env.SHARED_QDRANT_COLLECTION = 'shared_v2';
      process.env.SHARED_EMBEDDING_DIMENSIONS = '1536';
      const { spine } = make({ book: { spineContentItemId: 'w' } });
      expect(await spine.resolveIndex('b')).toMatchObject({ collection: 'shared_v2', dimensions: 1536 });
    });

    it('refuses a shared book when the shared index is not configured, and does not fall back to the own index', async () => {
      const { spine } = make({ book: { spineContentItemId: 'work-9' }, shared: false });
      await expect(spine.resolveIndex('book-1')).rejects.toBeInstanceOf(SharedIndexUnavailableError);
    });

    it('refuses a shared book while the shared index is unusable, naming the reason', async () => {
      const { spine } = make({ book: { spineContentItemId: 'work-9' }, sharedProblem: 'it could not be reached' });
      await expect(spine.resolveIndex('book-1')).rejects.toThrow(/it could not be reached/);
    });

    it('still serves own-index books while the shared index is down', async () => {
      const { spine } = make({ sharedProblem: 'down' });
      await expect(spine.resolveIndex('book-1')).resolves.toMatchObject({ kind: 'local' });
    });

    it('refuses a book that does not exist, and a record that cannot be read', async () => {
      await expect(make({ book: null }).spine.resolveIndex('nope')).rejects.toThrow(/not found/);
      await expect(make({ findError: new Error('connection refused') }).spine.resolveIndex('b')).rejects.toThrow(
        /refusing to guess/,
      );
    });

    it('caches a book for a short time and forgets it on invalidate', async () => {
      const { spine, findUnique } = make({ book: { spineContentItemId: 'work-9' } });
      await spine.resolveIndex('b');
      await spine.resolveIndex('b');
      expect(findUnique).toHaveBeenCalledTimes(1);
      spine.invalidate('b');
      await spine.resolveIndex('b');
      expect(findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('resolveContentItemId', () => {
    it('is the shared work for a linked book and the book id for an own-index book', async () => {
      await expect(make({ book: { spineContentItemId: 'work-9' } }).spine.resolveContentItemId('b1')).resolves.toBe('work-9');
      await expect(make().spine.resolveContentItemId('b1')).resolves.toBe('b1');
    });

    it('is null, never a guess, for a missing book, an unreadable record or an empty id', async () => {
      await expect(make({ book: null }).spine.resolveContentItemId('b')).resolves.toBeNull();
      await expect(make({ findError: new Error('down') }).spine.resolveContentItemId('b')).resolves.toBeNull();
      await expect(make().spine.resolveContentItemId('')).resolves.toBeNull();
    });

    it('does not need the shared index to answer', async () => {
      const { spine } = make({ book: { spineContentItemId: 'w' }, shared: false });
      await expect(spine.resolveContentItemId('b')).resolves.toBe('w');
    });
  });

  describe('getPrintedPageSpan', () => {
    const pages = {
      points: [{ payload: { page_start: 12, page_end: 13 } }, { payload: { page_start: 40 } }, { payload: {} }],
      next_page_offset: null,
    };

    it("reads an own-index book's extent from its own passages", async () => {
      localClient.scroll.mockReset().mockResolvedValue(pages);
      const { spine } = make();
      await expect(spine.getPrintedPageSpan('b1')).resolves.toEqual({ minPrinted: 12, maxPrinted: 40, span: 29 });
      expect(localClient.scroll.mock.calls[0][0]).toBe('book_buddy_chunks_v1');
      expect(localClient.scroll.mock.calls[0][1].filter).toEqual({
        must: [{ key: 'content_item_id', match: { value: 'b1' } }],
      });
    });

    it("reads a shared book's extent from the shared index, public passages only", async () => {
      sharedClient.scroll.mockReset().mockResolvedValue(pages);
      const { spine } = make({ book: { spineContentItemId: 'work-9' } });
      await spine.getPrintedPageSpan('b1');
      expect(sharedClient.scroll.mock.calls[0][1].filter).toEqual({
        must: [
          { key: 'content_item_id', match: { value: 'work-9' } },
          { key: 'visibility', match: { value: 'public' } },
        ],
      });
    });

    it('is null when the book has no passages, cannot be resolved, or the index fails', async () => {
      localClient.scroll.mockReset().mockResolvedValue({ points: [], next_page_offset: null });
      await expect(make().spine.getPrintedPageSpan('b')).resolves.toBeNull();
      await expect(make({ book: null }).spine.getPrintedPageSpan('b')).resolves.toBeNull();
      localClient.scroll.mockReset().mockRejectedValue(new Error('unreachable'));
      await expect(make().spine.getPrintedPageSpan('b')).resolves.toBeNull();
    });
  });
});

describe('readablePoints', () => {
  const own: any = { guard: [] };
  const shared: any = { guard: [{ key: 'visibility', match: { value: 'public' } }] };
  const points = [
    { id: 1, payload: { visibility: 'public' } },
    { id: 2, payload: { visibility: 'restricted' } },
    { id: 3, payload: {} },
    { id: 4 },
  ];

  it("keeps everything of Book Buddy's own index", () => {
    expect(readablePoints(own, points)).toHaveLength(4);
  });

  it('keeps only passages explicitly marked public from the shared index', () => {
    expect(readablePoints(shared, points).map((p) => p.id)).toEqual([1]);
  });
});
