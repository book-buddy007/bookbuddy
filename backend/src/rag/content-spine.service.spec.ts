import { ContentSpineService } from './content-spine.service';

/**
 * Shared-index mode: which canonical work a Book Buddy book is. The answer must come from the
 * book's own record, must fail closed, and must never need the shared database.
 */
describe('ContentSpineService (INGESTION_MODE=trio)', () => {
  const saved = { mode: process.env.INGESTION_MODE, db: process.env.TRIO_CONTENT_DATABASE_URL };
  beforeAll(() => {
    process.env.INGESTION_MODE = 'trio';
    delete process.env.TRIO_CONTENT_DATABASE_URL;
  });
  afterAll(() => {
    for (const [k, v] of [['INGESTION_MODE', saved.mode], ['TRIO_CONTENT_DATABASE_URL', saved.db]] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  const make = (findUnique: jest.Mock, scroll = jest.fn()) => {
    const prisma = { book: { findUnique } } as any;
    const qdrant = { getClient: () => ({ scroll }) } as any;
    return new ContentSpineService(qdrant, prisma);
  };

  it('answers from the book record, with no shared database configured', async () => {
    const findUnique = jest.fn().mockResolvedValue({ spineContentItemId: 'work-1' });
    const spine = make(findUnique);
    await expect(spine.resolveContentItemId('book-1')).resolves.toBe('work-1');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'book-1' }, select: { spineContentItemId: true } });
  });

  it('caches the answer so a chat turn does not hit the database every time', async () => {
    const findUnique = jest.fn().mockResolvedValue({ spineContentItemId: 'work-1' });
    const spine = make(findUnique);
    await spine.resolveContentItemId('book-1');
    await spine.resolveContentItemId('book-1');
    expect(findUnique).toHaveBeenCalledTimes(1);
    spine.invalidate('book-1');
    await spine.resolveContentItemId('book-1');
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it('returns null, not a guess, for a book with no recorded work', async () => {
    const spine = make(jest.fn().mockResolvedValue({ spineContentItemId: null }));
    await expect(spine.resolveContentItemId('book-2')).resolves.toBeNull();
    const none = make(jest.fn().mockResolvedValue(null));
    await expect(none.resolveContentItemId('missing')).resolves.toBeNull();
  });

  it('fails closed when the record cannot be read', async () => {
    const spine = make(jest.fn().mockRejectedValue(new Error('connection refused')));
    await expect(spine.resolveContentItemId('book-1')).resolves.toBeNull();
  });

  it('works out the page extent from the passages when there is no shared database', async () => {
    const scroll = jest.fn().mockResolvedValue({
      points: [
        { payload: { page_start: 12, page_end: 13 } },
        { payload: { page_start: 40 } },
        { payload: {} },
      ],
      next_page_offset: null,
    });
    const spine = make(jest.fn().mockResolvedValue({ spineContentItemId: 'work-1' }), scroll);
    await expect(spine.getPrintedPageSpan('book-1')).resolves.toEqual({ minPrinted: 12, maxPrinted: 40, span: 29 });
    expect(scroll.mock.calls[0][1].filter).toEqual({
      must: [{ key: 'content_item_id', match: { value: 'work-1' } }],
    });
  });

  it('gives no page extent for an unlinked book', async () => {
    const spine = make(jest.fn().mockResolvedValue({ spineContentItemId: null }));
    await expect(spine.getPrintedPageSpan('book-2')).resolves.toBeNull();
  });
});
