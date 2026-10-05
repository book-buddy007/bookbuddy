import { readFileSync } from 'fs';
import { join } from 'path';
import { OpenAiEmbeddingProvider } from '../providers/openai.embedding.provider';
import { EmbeddingService } from '../embedding.service';
import { QdrantInitService } from '../qdrant-init.service';
import { LocalIndexerService } from './local-indexer.service';
import { FakeOpenAi, startFakeOpenAi } from './test-support/fake-openai';

/**
 * End to end, with everything real except OpenAI: the real indexer, embedding provider, collection
 * bootstrap and search service run against a real Qdrant server. OpenAI is replaced by a local fake
 * that returns deterministic word-hash embeddings, so "similar text scores higher" is genuinely true
 * and the assertions below are about retrieval behaviour, not about mocks.
 *
 * Needs Qdrant (docker-compose.yml starts one on 6335). Set QDRANT_TEST_URL to point elsewhere.
 * Without a reachable Qdrant the tests say so and pass, so CI without it stays green; run it locally
 * before changing anything in rag/.
 */
const QDRANT_URL = process.env.QDRANT_TEST_URL || 'http://127.0.0.1:6335';
const COLLECTION = `bb_it_${Date.now()}`;
const DIMS = 256;

const sample = readFileSync(join(__dirname, '__fixtures__', 'sample-chapter.md'), 'utf8');

const otherBook = `---
chapter_title: Money and Banking
validation_status: APPROVED
subject: Economics
---
<!-- PAGE 40 -->
<!-- SECTION: Banks -->
A bank accepts deposits and gives loans. Unlike barley farming, banking depends on trust and interest.

Opportunity cost also applies to savings: money kept as cash gives up the interest a deposit would earn.
`;

let available = false;
let fake: FakeOpenAi;
let qdrantInit: QdrantInitService;
let indexer: LocalIndexerService;
let search: any; // RagSearchService, loaded after the environment is set
let spine: any;

const configFor = (env: Record<string, string>) =>
  ({ get: (key: string, fallback?: string) => process.env[key] ?? env[key] ?? fallback }) as any;

beforeAll(async () => {
  try {
    const res = await fetch(`${QDRANT_URL}/collections`, { signal: AbortSignal.timeout(2000) });
    available = res.ok;
  } catch {
    available = false;
  }
  if (!available) {
    console.warn(`SKIPPED: no Qdrant at ${QDRANT_URL}. Start docker-compose and re-run to exercise the index.`);
    return;
  }

  fake = await startFakeOpenAi();
  Object.assign(process.env, {
    QDRANT_URL,
    QDRANT_COLLECTION_NAME: COLLECTION,
    QDRANT_ALLOW_COLLECTION_CREATE: 'true',
    EMBEDDING_DIMENSIONS: String(DIMS),
    OPENAI_API_KEY: 'sk-test-key',
    OPENAI_BASE_URL: fake.url,
    OPENAI_RETRY_BASE_MS: '1',
  });
  delete process.env.INGESTION_MODE; // the default: Book Buddy indexes itself
  delete process.env.QDRANT_API_KEY;

  const config = configFor({});
  qdrantInit = new QdrantInitService(config);
  await qdrantInit.onModuleInit(); // creates the collection

  const embedding = new EmbeddingService(new OpenAiEmbeddingProvider(config));
  indexer = new LocalIndexerService(embedding, qdrantInit);

  // These read the collection name at import time, so they are loaded only now.
  const { RagSearchService } = require('../rag-search.service');
  const { ContentSpineService } = require('../content-spine.service');
  search = new RagSearchService(qdrantInit, embedding);
  spine = new ContentSpineService(qdrantInit);

  await indexer.indexBook({
    bookId: 'book-A',
    tenantId: 'tenant-1',
    bookTitle: 'Understanding Society',
    chapters: [{ assetId: 'asset-A8', partIndex: 8, markdown: sample }],
  });
  await indexer.indexBook({
    bookId: 'book-B',
    tenantId: 'tenant-2',
    bookTitle: 'Money Matters',
    chapters: [{ assetId: 'asset-B1', partIndex: 1, markdown: otherBook }],
  });
}, 60_000);

afterAll(async () => {
  if (!available) return;
  await qdrantInit.getClient().deleteCollection(COLLECTION).catch(() => undefined);
  await fake.close();
});

/** Declares a test that is skipped (loudly, once, in beforeAll) when Qdrant is not running. */
const live = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!available) return;
    await fn();
  }, 30_000);

const idsFor = async (bookId: string, extra: object = {}) => {
  const res = await qdrantInit.getClient().scroll(COLLECTION, {
    filter: { must: [{ key: 'content_item_id', match: { value: bookId } }], ...extra },
    with_payload: true,
    limit: 500,
  });
  return res.points;
};

describe('Book Buddy indexes and searches a book by itself (real Qdrant)', () => {
  live('creates the collection with the dense and keyword vectors the search expects', async () => {
    const info: any = await qdrantInit.getClient().getCollection(COLLECTION);
    expect(info.config.params.vectors.dense).toMatchObject({ size: DIMS, distance: 'Cosine' });
    expect(info.config.params.sparse_vectors).toHaveProperty('bm25');
    const indexed = Object.keys(info.payload_schema);
    for (const field of ['content_item_id', 'tenant_id', 'visibility', 'retrieval_class', 'level', 'run_id']) {
      expect(indexed).toContain(field);
    }
  });

  live('accepts its own collection on the next boot instead of refusing to start', async () => {
    await expect(new QdrantInitService(configFor({})).onModuleInit()).resolves.toBeUndefined();
  });

  live('answers a question from the right passage, with page and section for the citation', async () => {
    const results = await search.search('What is opportunity cost?', {
      tenantId: 'tenant-1',
      bookId: 'book-A',
      contentItemId: 'book-A',
      topK: 5,
    });
    expect(results.length).toBeGreaterThan(0);
    const top = results.slice(0, 3);
    expect(top.some((r: any) => /opportunity cost/i.test(r.text))).toBe(true);

    const prose = results.find((r: any) => r.text.includes('Resources are required'))!;
    expect(prose).toMatchObject({
      pageNumber: 184,
      chapterTitle: 'Building Blocks in Economics: The Problem of Choice',
      sectionTitle: 'Choices and Limited Resources',
      retrievalClass: 'reference',
      bookId: 'book-A',
    });
    expect(prose.citationId).toMatch(/^book-A:asset-A8:\d+$/);
  });

  live('finds a rare word through the keyword half of the search', async () => {
    const results = await search.search('barley wheat combination', {
      tenantId: 'tenant-1',
      bookId: 'book-A',
      contentItemId: 'book-A',
    });
    expect(results.some((r: any) => r.text.includes('Combination'))).toBe(true);
  });

  live('never answers from practice material, even when the question matches it almost exactly', async () => {
    const results = await search.search('Do you think having too many wants may create problems? Why or why not?', {
      tenantId: 'tenant-1',
      bookId: 'book-A',
      contentItemId: 'book-A',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r: any) => r.retrievalClass !== 'practice')).toBe(true);
    expect(results.some((r: any) => r.text.includes('too many wants may create problems'))).toBe(false);
    // ...but the prompt is in the index, available for quizzes.
    const all = await idsFor('book-A', { must_not: [] });
    expect(all.some((p: any) => p.payload.retrieval_class === 'practice')).toBe(true);
  });

  live('keeps one book out of another: scoped by book and locked by tenant', async () => {
    const own = await search.search('banks deposits loans interest', {
      tenantId: 'tenant-2',
      bookId: 'book-B',
      contentItemId: 'book-B',
    });
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((r: any) => r.bookId === 'book-B')).toBe(true);

    // Book A's questions never surface Book B's text...
    const crossBook = await search.search('banks deposits loans interest', {
      tenantId: 'tenant-1',
      bookId: 'book-A',
      contentItemId: 'book-A',
    });
    expect(crossBook.some((r: any) => r.text.includes('accepts deposits'))).toBe(false);

    // ...and a tenant that does not own the book gets nothing even if it names the book.
    const wrongTenant = await search.search('What is opportunity cost?', {
      tenantId: 'tenant-2',
      bookId: 'book-A',
      contentItemId: 'book-A',
    });
    expect(wrongTenant).toEqual([]);
  });

  live('refuses to search a book it cannot scope, rather than searching everything', async () => {
    await expect(
      search.search('anything', { tenantId: 'tenant-1', bookId: 'book-A' }),
    ).rejects.toThrow(/cannot be scoped/);
  });

  live('finds a figure or table by the label a student types', async () => {
    const fig = await search.findByReference('what is shown in figure 8.2?', {
      tenantId: 'tenant-1',
      bookId: 'book-A',
      contentItemId: 'book-A',
    });
    expect(fig).toHaveLength(1);
    expect(fig[0].text).toContain('Alternative uses of steel');
    expect(fig[0].pageNumber).toBe(184);

    const table = await search.findByReference('explain table 1', {
      tenantId: 'tenant-1',
      bookId: 'book-A',
      contentItemId: 'book-A',
    });
    expect(table[0].text).toContain('| C | 50 | 70 |');
  });

  live('is its own work: the book id is the content id, and the page extent comes from the index', async () => {
    await expect(spine.resolveContentItemId('book-A')).resolves.toBe('book-A');
    await expect(spine.getPrintedPageSpan('book-A')).resolves.toEqual({
      minPrinted: 183,
      maxPrinted: 185,
      span: 3,
    });
    await expect(spine.getPrintedPageSpan('book-B')).resolves.toEqual({
      minPrinted: 40,
      maxPrinted: 40,
      span: 1,
    });
    await expect(spine.getPrintedPageSpan('never-indexed')).resolves.toBeNull();
  });

  live('re-indexing replaces the old passages rather than doubling them', async () => {
    const before = await idsFor('book-A');
    const oldRun = before[0].payload!.run_id;

    const result = await indexer.indexBook({
      bookId: 'book-A',
      tenantId: 'tenant-1',
      bookTitle: 'Understanding Society',
      chapters: [{ assetId: 'asset-A8', partIndex: 8, markdown: sample }],
    });

    const after = await idsFor('book-A');
    expect(after).toHaveLength(before.length);
    expect(after.every((p: any) => p.payload.run_id === result.runId)).toBe(true);
    expect(after.some((p: any) => p.payload.run_id === oldRun)).toBe(false);
    // Book B (two short paragraphs, which pack into one chunk) is untouched by A's re-index.
    expect(await idsFor('book-B')).toHaveLength(1);
  });

  live('a failed re-index leaves the working index exactly as it was', async () => {
    const before = await idsFor('book-A');
    fake.script.push({ status: 401, body: { error: { message: 'Incorrect API key provided: sk-bad***' } } });

    await expect(
      indexer.indexBook({
        bookId: 'book-A',
        tenantId: 'tenant-1',
        bookTitle: 'Understanding Society',
        chapters: [{ assetId: 'asset-A8', partIndex: 8, markdown: sample }],
      }),
    ).rejects.toThrow(/rejected the API key/);

    const after = await idsFor('book-A');
    expect(after.map((p: any) => p.id).sort()).toEqual(before.map((p: any) => p.id).sort());
    const results = await search.search('What is opportunity cost?', {
      tenantId: 'tenant-1',
      bookId: 'book-A',
      contentItemId: 'book-A',
    });
    expect(results.length).toBeGreaterThan(0);
  });

  live('deleting a book removes only its passages', async () => {
    await qdrantInit.getClient().delete(COLLECTION, {
      wait: true,
      filter: { must: [{ key: 'content_item_id', match: { value: 'book-B' } }] },
    });
    expect(await idsFor('book-B')).toHaveLength(0);
    expect((await idsFor('book-A')).length).toBeGreaterThan(5);
  });
});
