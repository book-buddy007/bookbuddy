import { IngestionProcessor } from './ingestion.processor';
import { SharedLibraryError } from './shared-library.service';
import { SharedIndexUnavailableError } from './content-spine.service';

/**
 * The local-mode bookkeeping around the indexer: what gets read, what the book's status says at
 * each stage, and what happens when a step fails. The indexer itself is covered by its own specs;
 * here it is a stub.
 */
describe('IngestionProcessor (INGESTION_MODE=local)', () => {
  const savedMode = process.env.INGESTION_MODE;
  const savedRequire = process.env.INGEST_REQUIRE_APPROVED;
  beforeAll(() => {
    delete process.env.INGESTION_MODE;
    delete process.env.INGEST_REQUIRE_APPROVED;
  });
  afterAll(() => {
    if (savedMode !== undefined) process.env.INGESTION_MODE = savedMode;
    if (savedRequire !== undefined) process.env.INGEST_REQUIRE_APPROVED = savedRequire;
  });

  const book = (formats: any[]) => ({
    id: 'book-1',
    title: 'Understanding Society',
    tenantId: 'tenant-1',
    bookFormats: formats,
  });
  const fmt = (partIndex: number, fileUrl: string | null = `https://media.test/ch${partIndex}.md`) => ({
    id: `asset-${partIndex}`,
    partIndex,
    fileUrl,
  });

  function setup(opts: { book?: any; files?: Record<string, string | Error>; indexResult?: any; indexError?: Error } = {}) {
    const prisma: any = {
      book: {
        findUnique: jest.fn().mockResolvedValue(opts.book === undefined ? book([fmt(1), fmt(2)]) : opts.book),
        update: jest.fn().mockResolvedValue({}),
      },
      bookEmbeddingStatus: { upsert: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) },
      bookChunkMapping: { deleteMany: jest.fn().mockReturnValue('del'), createMany: jest.fn().mockReturnValue('create') },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const files = opts.files ?? {};
    const fileService = {
      getFileBuffer: jest.fn(async (url: string) => {
        const v = files[url] ?? '# chapter markdown';
        if (v instanceof Error) throw v;
        return Buffer.from(v);
      }),
    };
    const qdrant: any = {
      delete: jest.fn().mockResolvedValue({}),
      scroll: jest.fn().mockResolvedValue({
        points: [
          { id: 'p1', payload: { chunk_index: 0, page_start: 183, chapter: 'Choice', text: 'x'.repeat(300), run_id: 'r1' } },
          { id: 'p2', payload: { chunk_index: 1, page_start: 184, section_title: 'Wants', text: 'y', run_id: 'r1' } },
        ],
        next_page_offset: null,
      }),
    };
    const contentSpine = {
      invalidate: jest.fn(),
      localIndex: jest.fn((bookId: string) => ({
        kind: 'local', client: qdrant, collection: 'own_index', dimensions: 1024, contentItemId: bookId, tenantLock: true, guard: [],
      })),
      sharedIndex: jest.fn((work: string) => ({
        kind: 'shared', client: qdrant, collection: 'shared_index', dimensions: 3072, contentItemId: work, tenantLock: false,
        guard: [{ key: 'visibility', match: { value: 'public' } }],
      })),
    };
    const embedding = { modelId: 'text-embedding-3-large' };
    const localIndexer = {
      indexBook: opts.indexError
        ? jest.fn().mockRejectedValue(opts.indexError)
        : jest.fn(async (input: any) => {
            input.onProgress?.(50);
            return opts.indexResult ?? { runId: 'r1', totalChunks: 42, chapters: [] };
          }),
    };
    const graphQueue = { add: jest.fn().mockResolvedValue({}) };
    const sharedLibrary = { linkWork: jest.fn().mockResolvedValue(undefined), usesHub: jest.fn().mockReturnValue(false) };
    const hubFiles = { syncFromWork: jest.fn().mockResolvedValue({ formats: ['PDF'], cover: true }) };
    const processor = new IngestionProcessor(
      prisma,
      fileService as any,
      contentSpine as any,
      {} as any,
      embedding as any,
      localIndexer as any,
      sharedLibrary as any,
      graphQueue as any,
      hubFiles as any,
    );
    const job: any = { name: 'ingest-book', data: { bookId: 'book-1' }, updateProgress: jest.fn().mockResolvedValue(undefined) };
    return { processor, prisma, fileService, contentSpine, localIndexer, graphQueue, qdrant, job, sharedLibrary, hubFiles };
  }

  it('reads every chapter in order, indexes them together and marks the book READY', async () => {
    const s = setup();
    await s.processor.process(s.job);

    expect(s.fileService.getFileBuffer.mock.calls.map((c) => c[0])).toEqual([
      'https://media.test/ch1.md',
      'https://media.test/ch2.md',
    ]);
    expect(s.localIndexer.indexBook).toHaveBeenCalledTimes(1);
    expect(s.localIndexer.indexBook.mock.calls[0][0]).toMatchObject({
      bookId: 'book-1',
      tenantId: 'tenant-1',
      bookTitle: 'Understanding Society',
      requireApproved: false,
      chapters: [
        { assetId: 'asset-1', partIndex: 1, markdown: '# chapter markdown' },
        { assetId: 'asset-2', partIndex: 2, markdown: '# chapter markdown' },
      ],
    });

    expect(s.prisma.bookEmbeddingStatus.update).toHaveBeenCalledWith({
      where: { bookId: 'book-1' },
      data: expect.objectContaining({
        status: 'READY',
        totalChunks: 42,
        embeddedChunks: 42,
        embeddingModel: 'text-embedding-3-large',
      }),
    });
    expect(s.prisma.book.update).toHaveBeenLastCalledWith({
      where: { id: 'book-1' },
      data: { embeddingStatus: 'READY', vectorCollectionId: expect.any(String), spineContentItemId: null },
    });
    expect(s.contentSpine.invalidate).toHaveBeenCalledWith('book-1');
    expect(s.graphQueue.add).toHaveBeenCalledWith(
      'extract-graph',
      { bookId: 'book-1' },
      expect.objectContaining({ jobId: 'graph-ingest-book-1' }),
    );
  });

  it('passes the approval requirement through when INGEST_REQUIRE_APPROVED=true', async () => {
    process.env.INGEST_REQUIRE_APPROVED = 'true';
    try {
      const s = setup();
      await s.processor.process(s.job);
      expect(s.localIndexer.indexBook.mock.calls[0][0].requireApproved).toBe(true);
    } finally {
      delete process.env.INGEST_REQUIRE_APPROVED;
    }
  });

  it('rebuilds the citation mapping from what the index now holds', async () => {
    const s = setup();
    await s.processor.process(s.job);

    expect(s.qdrant.scroll.mock.calls[0][0]).toBe('own_index');
    expect(s.qdrant.scroll.mock.calls[0][1].filter).toEqual({
      must: [
        { key: 'content_item_id', match: { value: 'book-1' } },
        { key: 'visibility', match: { value: 'public' } },
      ],
    });
    const { data } = s.prisma.bookChunkMapping.createMany.mock.calls[0][0];
    expect(data).toEqual([
      expect.objectContaining({ bookId: 'book-1', qdrantPointId: 'p1', pageNumber: 183, chapterTitle: 'Choice', runId: 'r1' }),
      expect.objectContaining({ bookId: 'book-1', qdrantPointId: 'p2', pageNumber: 184, chapterTitle: 'Wants' }),
    ]);
    expect(data[0].textPreview).toHaveLength(200);
  });

  it('still finishes READY when only the citation mapping fails', async () => {
    const s = setup();
    s.prisma.$transaction.mockRejectedValue(new Error('db hiccup'));
    await s.processor.process(s.job);

    expect(s.prisma.bookEmbeddingStatus.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'READY' }) }),
    );
  });

  it('fails the whole run, indexing nothing, when one chapter cannot be read', async () => {
    const s = setup({ files: { 'https://media.test/ch2.md': new Error('NoSuchKey') } });
    await expect(s.processor.process(s.job)).rejects.toThrow(/Could not read chapter 2.*NoSuchKey.*Nothing was indexed/);

    expect(s.localIndexer.indexBook).not.toHaveBeenCalled();
    expect(s.graphQueue.add).not.toHaveBeenCalled();
    expect(s.prisma.book.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ embeddingStatus: 'READY' }) }),
    );
  });

  it('does not report READY or queue graph extraction when indexing fails', async () => {
    const s = setup({ indexError: new Error('OpenAI rejected the API key.') });
    await expect(s.processor.process(s.job)).rejects.toThrow(/rejected the API key/);

    expect(s.graphQueue.add).not.toHaveBeenCalled();
    expect(s.prisma.bookEmbeddingStatus.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'READY' }) }),
    );
    // The failure is recorded where the admin can see it.
    const recorded = [...s.prisma.bookEmbeddingStatus.update.mock.calls, ...s.prisma.bookEmbeddingStatus.upsert.mock.calls]
      .map((c) => JSON.stringify(c[0]))
      .join('\n');
    expect(recorded).toMatch(/FAILED|rejected the API key/);
  });

  it('explains what to upload when the book has no enriched markdown', async () => {
    const s = setup({ book: book([]) });
    await expect(s.processor.process(s.job)).rejects.toThrow(/no AI_EMBED/);
    expect(s.localIndexer.indexBook).not.toHaveBeenCalled();
  });

  it('skips quietly when the book was deleted before the job ran', async () => {
    const s = setup({ book: null });
    await expect(s.processor.process(s.job)).resolves.toBeUndefined();
    expect(s.localIndexer.indexBook).not.toHaveBeenCalled();
  });

  it('rejects job names it does not know', async () => {
    const s = setup();
    await expect(s.processor.process({ ...s.job, name: 'nope' })).rejects.toThrow(/Unknown job name/);
  });

  describe('shared index (INGESTION_MODE=trio)', () => {
    beforeEach(() => {
      process.env.INGESTION_MODE = 'trio';
      process.env.TRIO_INGEST_URL = 'https://dcp.test/api/internal/trio-ingest';
      process.env.TRIO_SERVICE_SECRET = 'service-secret';
      process.env.SHARED_QDRANT_URL = 'http://shared:6333';
    });
    afterEach(() => {
      delete process.env.SHARED_QDRANT_URL;
      delete process.env.INGESTION_MODE;
      delete process.env.TRIO_INGEST_URL;
      delete process.env.TRIO_SERVICE_SECRET;
      jest.restoreAllMocks();
    });

    const sharedBook = (over: object = {}) => ({
      ...book([fmt(1)]),
      catalogScope: 'GLOBAL',
      licenseType: 'AI_PERMITTED',
      isbn: null,
      ...over,
    });

    it.each([
      ['an institutional book', { catalogScope: 'INSTITUTIONAL' }],
      ['a book without an AI licence', { licenseType: 'UNKNOWN' }],
    ])("keeps %s in Book Buddy's own index: nothing is sent to DigiClassroom", async (_name, over) => {
      const fetchSpy = jest.spyOn(global, 'fetch' as any);
      const s = setup({ book: sharedBook(over) });
      await s.processor.process(s.job);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(s.localIndexer.indexBook).toHaveBeenCalledTimes(1);
      expect(s.prisma.book.update).toHaveBeenLastCalledWith({
        where: { id: 'book-1' },
        // Wherever it lived before, it lives here now.
        data: expect.objectContaining({ embeddingStatus: 'READY', spineContentItemId: null }),
      });
    });

    it('refuses before sending anything when reading back from the shared library is not set up', async () => {
      delete process.env.SHARED_QDRANT_URL;
      const fetchSpy = jest.spyOn(global, 'fetch' as any);
      const s = setup({ book: sharedBook() });
      const err: any = await s.processor.process(s.job).catch((e) => e);

      expect(err.name).toBe('UnrecoverableError');
      expect(err.message).toMatch(/SHARED_QDRANT_URL/);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(s.fileService.getFileBuffer).not.toHaveBeenCalled();
    });

    it('sends an eligible book to DigiClassroom as bookbuddy, and records the work it returns', async () => {
      const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, contentItemId: 'work-9', chunksIndexed: 12 }),
      } as any);
      const s = setup({ book: sharedBook() });
      s.qdrant.scroll.mockResolvedValue({ points: [], next_page_offset: null });
      await s.processor.process(s.job);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init]: any = fetchMock.mock.calls[0];
      expect(url).toBe('https://dcp.test/api/internal/trio-ingest');
      expect(init.headers).toEqual({ 'X-Trio-Service-Secret': 'service-secret' });
      expect(init.body.get('sourceApp')).toBe('bookbuddy');
      expect(init.body.get('sourceLocalId')).toBe('book-1');
      // No organisation is sent: the work is public by design, which is why the policy exists.
      expect(init.body.get('organizationId')).toBeNull();
      expect(s.prisma.book.update).toHaveBeenLastCalledWith({
        where: { id: 'book-1' },
        data: expect.objectContaining({ embeddingStatus: 'READY', spineContentItemId: 'work-9' }),
      });
      expect(s.localIndexer.indexBook).not.toHaveBeenCalled();
      expect(s.contentSpine.sharedIndex).toHaveBeenCalledWith('work-9');
      expect(s.qdrant.scroll.mock.calls[0][0]).toBe('shared_index');
    });

    it('embeds an eligible book here when INGESTION_MODE is local', async () => {
      process.env.INGESTION_MODE = 'local';
      const fetchSpy = jest.spyOn(global, 'fetch' as any);
      const s = setup({ book: sharedBook() });
      await s.processor.process(s.job);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(s.localIndexer.indexBook).toHaveBeenCalledTimes(1);
    });
  });

  describe('linking to a work already in the shared library (link-work)', () => {
    const linkJob = (s: ReturnType<typeof setup>) => ({ ...s.job, name: 'link-work', data: { bookId: 'book-1', contentItemId: 'work-1' } });
    const linkBook = { id: 'book-1', title: 'Understanding Society', isbn: '978-93-5729-100-2' };

    it('links at DigiClassroom, finds the passages, then records the work and marks READY', async () => {
      const s = setup({ book: linkBook });
      await s.processor.process(linkJob(s));

      expect(s.sharedLibrary.linkWork).toHaveBeenCalledWith({ contentItemId: 'work-1', bookId: 'book-1', isbn: '978-93-5729-100-2' });
      expect(s.localIndexer.indexBook).not.toHaveBeenCalled();
      expect(s.prisma.book.update).toHaveBeenLastCalledWith({
        where: { id: 'book-1' },
        data: expect.objectContaining({ spineContentItemId: 'work-1', embeddingStatus: 'READY' }),
      });
      expect(s.prisma.bookEmbeddingStatus.update).toHaveBeenCalledWith({
        where: { bookId: 'book-1' },
        data: { status: 'READY', totalChunks: 2, embeddedChunks: 2 },
      });
      expect(s.contentSpine.invalidate).toHaveBeenCalledWith('book-1');
      expect(s.graphQueue.add).toHaveBeenCalled();
      expect(s.qdrant.scroll.mock.calls[0][0]).toBe('shared_index');
      // The unused local passages of this book, and only this book's, are removed.
      expect(s.qdrant.delete).toHaveBeenCalledWith('own_index', {
        filter: { must: [{ key: 'content_item_id', match: { value: 'book-1' } }] },
        wait: true,
      });
    });

    it('does not touch hub files when the library is DigiClassroom', async () => {
      const s = setup({ book: linkBook });
      await s.processor.process(linkJob(s));
      expect(s.hubFiles.syncFromWork).not.toHaveBeenCalled();
    });

    it('records the hub files of a hub work after linking, once READY is saved', async () => {
      const s = setup({ book: linkBook });
      s.sharedLibrary.usesHub.mockReturnValue(true);
      await s.processor.process(linkJob(s));
      expect(s.hubFiles.syncFromWork).toHaveBeenCalledWith('book-1', 'work-1');
      expect(s.hubFiles.syncFromWork.mock.invocationCallOrder[0]).toBeGreaterThan(
        s.prisma.book.update.mock.invocationCallOrder.at(-1)!,
      );
    });

    it('still finishes READY when recording the hub files fails', async () => {
      const s = setup({ book: linkBook });
      s.sharedLibrary.usesHub.mockReturnValue(true);
      s.hubFiles.syncFromWork.mockRejectedValue(new Error('hub down'));
      await s.processor.process(linkJob(s));
      expect(s.prisma.bookEmbeddingStatus.update).toHaveBeenCalledWith({
        where: { bookId: 'book-1' },
        data: { status: 'READY', totalChunks: 2, embeddedChunks: 2 },
      });
      expect(s.graphQueue.add).toHaveBeenCalled();
    });

    it('stops, without saving anything, when the shared library cannot be used', async () => {
      const s = setup({ book: linkBook });
      s.contentSpine.sharedIndex.mockImplementation(() => {
        throw new SharedIndexUnavailableError('it could not be reached');
      });
      const err: any = await s.processor.process(linkJob(s)).catch((e) => e);
      expect(err.name).toBe('UnrecoverableError');
      expect(err.message).toMatch(/could not be reached/);
      expect(JSON.stringify(s.prisma.book.update.mock.calls)).not.toMatch(/spineContentItemId/);
      expect(s.qdrant.delete).not.toHaveBeenCalled();
    });

    it('does not save the work or claim READY when no public passages can be read', async () => {
      const s = setup({ book: linkBook });
      s.qdrant.scroll.mockResolvedValue({ points: [], next_page_offset: null });
      const err: any = await s.processor.process(linkJob(s)).catch((e) => e);

      expect(err.name).toBe('UnrecoverableError');
      expect(err.message).toMatch(/no public passages/);
      const saved = JSON.stringify(s.prisma.book.update.mock.calls);
      expect(saved).not.toMatch(/spineContentItemId/);
      expect(saved).not.toMatch(/READY/);
      expect(s.graphQueue.add).not.toHaveBeenCalled();
    });

    it('turns a refusal from DigiClassroom into a failure that is not retried, with its reason recorded', async () => {
      const s = setup({ book: linkBook });
      s.sharedLibrary.linkWork.mockRejectedValue(new SharedLibraryError(422, 'ISBN mismatch: the record says 1 but the work is 2.'));
      const err: any = await s.processor.process(linkJob(s)).catch((e) => e);

      expect(err.name).toBe('UnrecoverableError');
      expect(err.message).toMatch(/ISBN mismatch/);
      const recorded = JSON.stringify(s.prisma.bookEmbeddingStatus.upsert.mock.calls);
      expect(recorded).toMatch(/FAILED/);
      expect(recorded).toMatch(/ISBN mismatch/);
      expect(s.qdrant.scroll).not.toHaveBeenCalled();
    });

    it('lets a network or server failure through to be retried', async () => {
      const s = setup({ book: linkBook });
      s.sharedLibrary.linkWork.mockRejectedValue(new SharedLibraryError(0, 'Could not reach the shared library.'));
      const err: any = await s.processor.process(linkJob(s)).catch((e) => e);
      expect(err.name).toBe('SharedLibraryError');
    });

    it('skips quietly when the book was deleted', async () => {
      const s = setup({ book: null });
      await expect(s.processor.process(linkJob(s))).resolves.toBeUndefined();
      expect(s.sharedLibrary.linkWork).not.toHaveBeenCalled();
    });
  });
});
