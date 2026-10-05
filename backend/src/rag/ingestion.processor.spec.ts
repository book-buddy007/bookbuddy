import { IngestionProcessor } from './ingestion.processor';

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
    const contentSpine = { invalidate: jest.fn() };
    const qdrant = {
      scroll: jest.fn().mockResolvedValue({
        points: [
          { id: 'p1', payload: { chunk_index: 0, page_start: 183, chapter: 'Choice', text: 'x'.repeat(300), run_id: 'r1' } },
          { id: 'p2', payload: { chunk_index: 1, page_start: 184, section_title: 'Wants', text: 'y', run_id: 'r1' } },
        ],
        next_page_offset: null,
      }),
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
    const processor = new IngestionProcessor(
      prisma,
      fileService as any,
      contentSpine as any,
      { getClient: () => qdrant } as any,
      embedding as any,
      localIndexer as any,
      graphQueue as any,
    );
    const job: any = { name: 'ingest-book', data: { bookId: 'book-1' }, updateProgress: jest.fn().mockResolvedValue(undefined) };
    return { processor, prisma, fileService, contentSpine, localIndexer, graphQueue, qdrant, job };
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
      data: { embeddingStatus: 'READY', vectorCollectionId: expect.any(String) },
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

    expect(s.qdrant.scroll.mock.calls[0][1].filter).toEqual({
      must: [{ key: 'content_item_id', match: { value: 'book-1' } }],
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
});
