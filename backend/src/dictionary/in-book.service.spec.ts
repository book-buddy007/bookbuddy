import { ForbiddenException } from '@nestjs/common';
import { InBookService } from './in-book.service';
import { DictionaryController } from './dictionary.controller';

const point = (text: string, page: number | null, extra: Record<string, unknown> = {}) => ({
  id: `p-${page}-${text.length}`,
  payload: { text, page_start: page, chapter: 'Chapter 8', chunk_index: 0, ...extra },
});

function make(points: any[], opts: { resolveError?: Error } = {}) {
  const scroll = jest.fn().mockResolvedValue({ points, next_page_offset: null });
  const index = { kind: 'shared', client: { scroll }, collection: 'trio_content_v1_openai3072', contentItemId: 'dcp-id', guard: [{ key: 'visibility', match: { value: 'public' } }] };
  const spine: any = { resolveIndex: opts.resolveError ? jest.fn().mockRejectedValue(opts.resolveError) : jest.fn().mockResolvedValue(index) };
  return { service: new InBookService(spine), scroll, spine, index };
}

const BOOK = [
  point('In the last chapter we saw how people choose.', 40),
  point('**Scarcity** is the situation where wants exceed the resources available to meet them.', 42),
  point('Scarcity is mentioned again here.', 61),
];

describe('InBookService.find', () => {
  it('finds the book\'s own definition with its page', async () => {
    const { service } = make(BOOK);
    const r = await service.find('book-1', 'scarcity');
    expect(r).toMatchObject({ kind: 'definition', page: 42, chapter: 'Chapter 8' });
  });

  it('reads only this book\'s public, non-practice passages, from the index the book lives in', async () => {
    const { service, scroll } = make(BOOK);
    await service.find('book-1', 'scarcity');
    const arg = scroll.mock.calls[0];
    expect(arg[0]).toBe('trio_content_v1_openai3072');
    expect(arg[1].filter.must).toEqual([{ key: 'content_item_id', match: { value: 'dcp-id' } }, { key: 'visibility', match: { value: 'public' } }]);
    expect(arg[1].filter.must_not).toEqual([{ key: 'retrieval_class', match: { value: 'practice' } }]);
    expect(arg[1].with_vector).toBe(false);
  });

  it('reads the book once and answers later lookups from memory', async () => {
    const { service, scroll } = make(BOOK);
    await service.find('book-1', 'scarcity');
    await service.find('book-1', 'choose');
    await service.find('book-1', 'again');
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('reads the index once for a burst of lookups at the same time', async () => {
    const { service, scroll } = make(BOOK);
    await Promise.all([service.find('b', 'scarcity'), service.find('b', 'choose'), service.find('b', 'again')]);
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('reads every page of a large book', async () => {
    const { service, scroll } = make([]);
    scroll
      .mockResolvedValueOnce({ points: [point('Scarcity is the situation where wants exceed resources available.', 5)], next_page_offset: 'next' })
      .mockResolvedValueOnce({ points: [point('Elsewhere, scarcity is mentioned too.', 90)], next_page_offset: null });
    const r = await service.find('b', 'scarcity');
    expect(scroll).toHaveBeenCalledTimes(2);
    expect(scroll.mock.calls[1][1].offset).toBe('next');
    expect(r?.occurrences).toBe(2);
  });

  it('puts passages in book order, whatever order the index returns them in', async () => {
    const { service } = make([point('Barter is mentioned in passing late in the book.', 80), point('Barter: exchange of goods without using money.', 8)]);
    expect((await service.find('b', 'barter'))?.page).toBe(8);
  });

  it('skips points with no text, and keeps those with no page', async () => {
    const { service } = make([{ id: 'x', payload: {} }, { id: 'y', payload: { text: 'Capital is the stock of machines and tools used in production.' } }]);
    const r = await service.find('b', 'capital');
    expect(r).toMatchObject({ kind: 'definition', page: null });
  });

  it('is null when the book is not indexed or its index is unavailable, not an error', async () => {
    const { service, scroll } = make(BOOK, { resolveError: new Error('Book b not found.') });
    await expect(service.find('b', 'scarcity')).resolves.toBeNull();
    expect(scroll).not.toHaveBeenCalled();
  });

  it('does not touch the index for something that is not a term', async () => {
    const { service, spine } = make(BOOK);
    await expect(service.find('b', 'a')).resolves.toBeNull();
    await expect(service.find('b', 'this is clearly a whole sentence and not a term to look up')).resolves.toBeNull();
    expect(spine.resolveIndex).not.toHaveBeenCalled();
  });

  it('can forget a book so a re-embedded one is read afresh', async () => {
    const { service, scroll, index } = make(BOOK);
    await service.find('b', 'scarcity');
    service.invalidate(index);
    await service.find('b', 'scarcity');
    expect(scroll).toHaveBeenCalledTimes(2);
  });
});

describe('DictionaryController.inBookDefinition', () => {
  function controller(opts: { denied?: boolean; result?: any } = {}) {
    const inBook: any = { find: jest.fn().mockResolvedValue(opts.result ?? null) };
    const bookAccess: any = { assertCanRead: opts.denied ? jest.fn().mockRejectedValue(new ForbiddenException('no')) : jest.fn().mockResolvedValue({}) };
    return { c: new DictionaryController({} as any, inBook, bookAccess), inBook, bookAccess };
  }
  const req = { user: { id: 'u1' } };

  it('returns what the book says, once the reader is allowed to read the book', async () => {
    const { c, inBook, bookAccess } = controller({ result: { term: 'scarcity', kind: 'definition', text: 't', page: 42, chapter: null, occurrences: 3, pages: [42] } });
    await expect(c.inBookDefinition(req, 'book-1', 'scarcity')).resolves.toMatchObject({ found: true, page: 42 });
    expect(bookAccess.assertCanRead).toHaveBeenCalledWith('u1', 'book-1');
    expect(inBook.find).toHaveBeenCalledWith('book-1', 'scarcity');
  });

  it('says found:false when the book does not use the term', async () => {
    const { c } = controller({ result: null });
    await expect(c.inBookDefinition(req, 'book-1', 'nothing')).resolves.toEqual({ found: false });
  });

  it('refuses a reader who may not read the book, before reading anything of it', async () => {
    const { c, inBook } = controller({ denied: true });
    await expect(c.inBookDefinition(req, 'book-1', 'scarcity')).rejects.toBeInstanceOf(ForbiddenException);
    expect(inBook.find).not.toHaveBeenCalled();
  });

  it('needs both a book and a term', async () => {
    const { c, bookAccess } = controller();
    await expect(c.inBookDefinition(req, '', 'x')).resolves.toEqual({ found: false });
    await expect(c.inBookDefinition(req, 'b', '')).resolves.toEqual({ found: false });
    expect(bookAccess.assertCanRead).not.toHaveBeenCalled();
  });
});

describe('dependency wiring', () => {
  it('the controller and both services resolve their dependencies, so the API can start', async () => {
    const { Test } = await import('@nestjs/testing');
    const { PrismaService } = await import('../prisma/prisma.service');
    const { ContentSpineService } = await import('../rag/content-spine.service');
    const { BookAccessService } = await import('../common/book-access.service');
    const { DictionaryService } = await import('./dictionary.service');
    const { BetterAuthGuard } = await import('../guards/better-auth.guard');
    const { TenantResolverGuard } = await import('../guards/tenant-resolver.guard');
    const moduleRef = await Test.createTestingModule({
      controllers: [DictionaryController],
      providers: [
        DictionaryService,
        InBookService,
        { provide: PrismaService, useValue: {} },
        { provide: ContentSpineService, useValue: {} },
        { provide: BookAccessService, useValue: {} },
      ],
    })
      .overrideGuard(BetterAuthGuard).useValue({})
      .overrideGuard(TenantResolverGuard).useValue({})
      .compile();
    expect(moduleRef.get(DictionaryController)).toBeInstanceOf(DictionaryController);
    expect(moduleRef.get(InBookService)).toBeInstanceOf(InBookService);
  });
});
