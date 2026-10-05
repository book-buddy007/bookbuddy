import { readFileSync } from 'fs';
import { join } from 'path';
import { LocalIndexerService, contextualText } from './local-indexer.service';
import { fakeEmbedding } from './test-support/fake-openai';

const sample = readFileSync(join(__dirname, '__fixtures__', 'sample-chapter.md'), 'utf8');
const DIMS = 16;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const chapterMd = (n: number, status = 'APPROVED') =>
  `---\nchapter_title: Chapter ${n}\nvalidation_status: ${status}\nsubject: Economics\n---\n<!-- PAGE ${n * 10} -->\n<!-- SECTION: Part ${n} -->\nThis is the opening paragraph of chapter ${n} about scarcity and choice in an economy.\n\nA second paragraph of chapter ${n} explains opportunity cost with a worked everyday example.\n`;

function setup(overrides: { embed?: jest.Mock; upsert?: jest.Mock } = {}) {
  const embed =
    overrides.embed ??
    jest.fn(async (texts: string[]) => texts.map((t) => fakeEmbedding(t, DIMS)));
  const upsert = overrides.upsert ?? jest.fn(async (..._args: any[]) => ({}));
  const del = jest.fn(async (..._args: any[]) => ({}));
  const qdrant = { upsert, delete: del };
  const service = new LocalIndexerService(
    { embedBatch: embed } as any,
    { getClient: () => qdrant } as any,
  );
  return { service, embed, upsert, del };
}

const base = {
  bookId: 'book-1',
  tenantId: 'tenant-1',
  bookTitle: 'Test Book',
};

beforeAll(() => {
  process.env.QDRANT_COLLECTION_NAME = 'test_collection';
});

describe('LocalIndexerService', () => {
  it('writes points in the shape the search code reads: named vectors and the payload vocabulary', async () => {
    const { service, upsert } = setup();
    const result = await service.indexBook({
      ...base,
      chapters: [{ assetId: 'asset-8', partIndex: 8, markdown: sample }],
    });

    expect(result.totalChunks).toBeGreaterThan(5);
    const [collection, args] = upsert.mock.calls[0];
    expect(collection).toBe('test_collection');
    expect(args.wait).toBe(true);

    const point = args.points[0];
    expect(point.id).toMatch(UUID);
    expect(point.vector.dense).toHaveLength(DIMS);
    expect(point.vector.bm25.indices.length).toBeGreaterThan(0);
    expect(point.vector.bm25.values).toHaveLength(point.vector.bm25.indices.length);
    expect(point.payload).toMatchObject({
      level: 0,
      visibility: 'public',
      tenant_id: 'tenant-1',
      content_item_id: 'book-1',
      content_asset_id: 'asset-8',
      book_id: 'book-1',
      book_title: 'Test Book',
      part_index: 8,
      chapter: 'Building Blocks in Economics: The Problem of Choice',
      subject: 'Economics',
      class_level: '9',
      chapter_number: '8',
      run_id: result.runId,
    });
    expect(typeof point.payload.text).toBe('string');
    expect(['reference', 'practice']).toContain(point.payload.retrieval_class);
  });

  it('stores the pure excerpt but embeds it with its chapter and section in front', async () => {
    const { service, embed, upsert } = setup();
    await service.indexBook({ ...base, chapters: [{ assetId: 'a', partIndex: 1, markdown: chapterMd(1) }] });

    const embedded: string[] = embed.mock.calls[0][0];
    expect(embedded[0].startsWith('Chapter 1 - Part 1\n')).toBe(true);
    const stored = upsert.mock.calls[0][1].points[0].payload.text;
    expect(stored.startsWith('This is the opening paragraph')).toBe(true);
    expect(stored).not.toContain('Chapter 1 - Part 1');
  });

  it('carries page, section, block type and label for citations and the figure lookup', async () => {
    const { service, upsert } = setup();
    await service.indexBook({ ...base, chapters: [{ assetId: 'a', partIndex: 8, markdown: sample }] });
    const payloads = upsert.mock.calls.flatMap((c) => c[1].points.map((p: any) => p.payload));

    const fig = payloads.find((p) => p.block_type === 'FIGURE' && p.label === '8.2');
    expect(fig).toMatchObject({ page_start: 184, page_end: 184, retrieval_class: 'reference' });
    expect(fig.text).toContain('Fig. 8.2');

    const practice = payloads.filter((p) => p.retrieval_class === 'practice');
    expect(practice.length).toBe(2);
    expect(payloads.every((p) => Number.isInteger(p.chunk_index))).toBe(true);
  });

  it('numbers chunks in reading order across chapters, whatever order they are given', async () => {
    const { service, upsert } = setup();
    await service.indexBook({
      ...base,
      chapters: [
        { assetId: 'b', partIndex: 2, markdown: chapterMd(2) },
        { assetId: 'a', partIndex: 1, markdown: chapterMd(1) },
      ],
    });
    const payloads = upsert.mock.calls.flatMap((c) => c[1].points.map((p: any) => p.payload));
    expect(payloads.map((p) => p.chunk_index)).toEqual([0, 1]);
    expect(payloads.map((p) => p.part_index)).toEqual([1, 2]);
  });

  it('gives every point a unique, deterministic id derived from book, run and position', async () => {
    const a = setup();
    const b = setup();
    const input = { ...base, chapters: [{ assetId: 'a', partIndex: 1, markdown: sample }] };
    await a.service.indexBook({ ...input, runId: 'run-fixed' });
    await b.service.indexBook({ ...input, runId: 'run-fixed' });
    const ids = (s: ReturnType<typeof setup>) => s.upsert.mock.calls.flatMap((c) => c[1].points.map((p: any) => p.id));
    expect(ids(a)).toEqual(ids(b));
    expect(new Set(ids(a)).size).toBe(ids(a).length);

    const c = setup();
    await c.service.indexBook({ ...input, runId: 'run-other' });
    expect(ids(c)[0]).not.toBe(ids(a)[0]);
  });

  it('removes the previous run only AFTER every new point is stored', async () => {
    const { service, upsert, del } = setup();
    const { runId } = await service.indexBook({
      ...base,
      chapters: [{ assetId: 'a', partIndex: 1, markdown: sample }],
    });

    expect(del).toHaveBeenCalledTimes(1);
    const lastUpsert = Math.max(...upsert.mock.invocationCallOrder);
    expect(del.mock.invocationCallOrder[0]).toBeGreaterThan(lastUpsert);
    expect(del.mock.calls[0][1].filter).toEqual({
      must: [{ key: 'content_item_id', match: { value: 'book-1' } }],
      must_not: [{ key: 'run_id', match: { value: runId } }],
    });
  });

  describe('when something fails', () => {
    it('an embedding failure writes nothing and never touches the previous index', async () => {
      const embed = jest.fn(async () => {
        throw new Error('OpenAI rejected the API key. Check OPENAI_API_KEY.');
      });
      const { service, upsert, del } = setup({ embed });

      await expect(
        service.indexBook({ ...base, chapters: [{ assetId: 'a', partIndex: 1, markdown: sample }] }),
      ).rejects.toThrow(/rejected the API key/);

      expect(upsert).not.toHaveBeenCalled();
      // The only delete allowed is the cleanup of THIS run, never the previous run's points.
      for (const [, args] of del.mock.calls) {
        expect(args.filter.must_not).toBeUndefined();
        expect(JSON.stringify(args.filter.must)).toContain('run_id');
      }
    });

    it('a failure part-way through storing removes the half-written run and keeps the old one', async () => {
      const upsert = jest
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('qdrant unavailable'));
      const { service, del } = setup({ upsert });

      // Enough text for more than one storage batch.
      const longChapter = `${chapterMd(1)}\n${Array.from({ length: 220 }, (_, i) => `Paragraph ${i}. ${'Economics text about scarcity. '.repeat(60)}`).join('\n\n')}`;
      await expect(
        service.indexBook({ ...base, chapters: [{ assetId: 'a', partIndex: 1, markdown: longChapter }] }),
      ).rejects.toThrow('qdrant unavailable');

      expect(upsert).toHaveBeenCalledTimes(2);
      expect(del).toHaveBeenCalledTimes(1);
      const filter = del.mock.calls[0][1].filter;
      expect(filter.must_not).toBeUndefined();
      expect(filter.must).toEqual([
        { key: 'content_item_id', match: { value: 'book-1' } },
        { key: 'run_id', match: { value: expect.any(String) } },
      ]);
    });

    it('refuses a book with nothing to index, before spending anything', async () => {
      const { service, embed } = setup();
      await expect(
        service.indexBook({ ...base, chapters: [{ assetId: 'a', partIndex: 1, markdown: '---\nchapter_title: Empty\n---\n<!-- PAGE 1 -->\n' }] }),
      ).rejects.toThrow(/Nothing to index/);
      expect(embed).not.toHaveBeenCalled();
    });
  });

  describe('validation gate', () => {
    it('indexes a PENDING chapter by default (with a warning) because the super-admin is the validator', async () => {
      const { service } = setup();
      const result = await service.indexBook({
        ...base,
        chapters: [{ assetId: 'a', partIndex: 1, markdown: chapterMd(1, 'PENDING') }],
      });
      expect(result.chapters[0].validationStatus).toBe('PENDING');
      expect(result.totalChunks).toBe(1);
    });

    it('refuses unapproved chapters when required, before any embedding', async () => {
      const { service, embed, upsert } = setup();
      await expect(
        service.indexBook({
          ...base,
          requireApproved: true,
          chapters: [
            { assetId: 'a', partIndex: 1, markdown: chapterMd(1, 'APPROVED') },
            { assetId: 'b', partIndex: 2, markdown: chapterMd(2, 'PENDING') },
          ],
        }),
      ).rejects.toThrow(/part 2 is PENDING/);
      expect(embed).not.toHaveBeenCalled();
      expect(upsert).not.toHaveBeenCalled();
    });

    it('accepts approved chapters when required', async () => {
      const { service } = setup();
      const result = await service.indexBook({
        ...base,
        requireApproved: true,
        chapters: [{ assetId: 'a', partIndex: 1, markdown: chapterMd(1, 'approved') }],
      });
      expect(result.totalChunks).toBe(1);
    });
  });

  it('reports progress that climbs to the end of the storing stage', async () => {
    const { service } = setup();
    const seen: number[] = [];
    await service.indexBook({
      ...base,
      chapters: [{ assetId: 'a', partIndex: 1, markdown: sample }],
      onProgress: (pct) => void seen.push(pct),
    });
    expect(seen.length).toBeGreaterThan(1);
    expect([...seen].sort((x, y) => x - y)).toEqual(seen);
    expect(seen[seen.length - 1]).toBe(95);
  });

  it('reports per-chapter results: skipped content and warnings', async () => {
    const { service } = setup();
    const result = await service.indexBook({
      ...base,
      chapters: [{ assetId: 'a', partIndex: 8, markdown: sample }],
    });
    expect(result.chapters[0].skipped).toEqual([{ page: 185, reason: 'fill-in student worksheet' }]);
    expect(result.chapters[0].chunks).toBe(result.totalChunks);
  });
});

describe('contextualText', () => {
  const chunk = (over = {}) => ({
    text: 'The curve slopes downward.',
    pageStart: 1,
    pageEnd: 1,
    chapter: 'Choice',
    sectionTitle: 'Production Possibility Curve',
    retrievalClass: 'reference' as const,
    blockType: null,
    label: null,
    ...over,
  });

  it('puts the chapter and section before the text', () => {
    expect(contextualText(chunk())).toBe(
      'Choice - Production Possibility Curve\nThe curve slopes downward.',
    );
  });

  it('does not repeat a section that equals the chapter, and copes with none', () => {
    expect(contextualText(chunk({ sectionTitle: 'Choice' }))).toBe('Choice\nThe curve slopes downward.');
    expect(contextualText(chunk({ sectionTitle: null }))).toBe('Choice\nThe curve slopes downward.');
  });
});
