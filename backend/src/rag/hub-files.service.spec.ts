import { HubFilesService, hubMarkerOf } from './hub-files.service';
import { SharedLibraryError } from './shared-library.error';

const WORK = '5f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f';
const LINK = 'https://r2.pdlms.test/signed?sig=abc';

const file = (kind: string, over: Record<string, unknown> = {}) => ({
  fileId: `f-${kind}`,
  kind,
  mimeType: kind === 'pdf' ? 'application/pdf' : kind === 'epub' ? 'application/epub+zip' : 'image/png',
  sizeBytes: kind === 'cover' ? null : 1000,
  version: `v-${kind}`,
  ...over,
});

function make(opts: { files?: any[]; withheld?: 'drm' | null; existing?: Record<string, any>; book?: any } = {}) {
  const work = { id: WORK, manifest: { revision: 'r', files: opts.files ?? [file('pdf'), file('epub'), file('cover')], filesWithheld: opts.withheld ?? null, chapters: [], pages: 10 } };
  const prisma: any = {
    bookFormat: {
      findUnique: jest.fn(async ({ where }: any) => opts.existing?.[where.bookId_type_partIndex.type] ?? null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    book: {
      findUnique: jest.fn().mockResolvedValue(opts.book ?? { coverUrl: null, coverKey: null }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const s3: any = {
    buildCoverKey: jest.fn((p: any) => `global/books/${p.bookId}/covers/front/1-${p.filename}`),
    putObject: jest.fn().mockResolvedValue({ publicUrl: 'https://media.bb.test/cover.png' }),
  };
  const hub: any = {
    getWork: jest.fn().mockResolvedValue(work),
    fileLink: jest.fn().mockResolvedValue({ url: LINK, expiresAt: '2026-10-07T10:05:00Z', mimeType: 'x', sizeBytes: 1, version: 'v' }),
  };
  return { service: new HubFilesService(prisma, s3, hub), prisma, s3, hub, work };
}

describe('hubMarkerOf', () => {
  it('reads the marker, and returns null for a file that is Book Buddy’s own', () => {
    expect(hubMarkerOf({ hub: { workId: WORK, fileId: 'f', version: 'v' } })).toMatchObject({ workId: WORK });
    for (const m of [null, undefined, {}, { s3Key: 'k' }, { hub: {} }, { hub: { workId: '' } }, { hub: { workId: 5 } }]) {
      expect(hubMarkerOf(m)).toBeNull();
    }
  });
});

describe('HubFilesService.readLink (streaming)', () => {
  it('asks the hub for a fresh link for the rendition, and returns only the url and expiry', async () => {
    const { service, hub } = make();
    const out = await service.readLink(WORK, 'pdf');
    expect(hub.fileLink).toHaveBeenCalledWith(WORK, 'f-pdf');
    expect(out).toEqual({ url: LINK, expiresAt: '2026-10-07T10:05:00Z' });
  });

  it('asks for a new link on every read, but reads the manifest only once a minute', async () => {
    const { service, hub } = make();
    await service.readLink(WORK, 'pdf');
    await service.readLink(WORK, 'epub');
    await service.readLink(WORK, 'pdf');
    expect(hub.getWork).toHaveBeenCalledTimes(1);
    expect(hub.fileLink).toHaveBeenCalledTimes(3);
  });

  it('reads the manifest again after it has gone stale', async () => {
    jest.useFakeTimers();
    try {
      const { service, hub } = make();
      await service.readLink(WORK, 'pdf');
      jest.setSystemTime(Date.now() + 61_000);
      await service.readLink(WORK, 'pdf');
      expect(hub.getWork).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('recovers once when the file was replaced at the hub since the manifest was cached', async () => {
    const { service, hub } = make();
    hub.getWork
      .mockResolvedValueOnce({ manifest: { files: [file('pdf', { fileId: 'old' })], filesWithheld: null } })
      .mockResolvedValueOnce({ manifest: { files: [file('pdf', { fileId: 'new' })], filesWithheld: null } });
    hub.fileLink.mockRejectedValueOnce(new SharedLibraryError(404, 'File not found'));
    await expect(service.readLink(WORK, 'pdf')).resolves.toMatchObject({ url: LINK });
    expect(hub.fileLink).toHaveBeenNthCalledWith(1, WORK, 'old');
    expect(hub.fileLink).toHaveBeenNthCalledWith(2, WORK, 'new');
  });

  it('does not retry forever: a second 404 is the answer', async () => {
    const { service, hub } = make();
    hub.fileLink.mockRejectedValue(new SharedLibraryError(404, 'File not found'));
    await expect(service.readLink(WORK, 'pdf')).rejects.toMatchObject({ status: 404 });
    expect(hub.fileLink).toHaveBeenCalledTimes(2);
  });

  it('does not retry other failures', async () => {
    const { service, hub } = make();
    hub.fileLink.mockRejectedValue(new SharedLibraryError(0, 'unreachable'));
    await expect(service.readLink(WORK, 'pdf')).rejects.toMatchObject({ status: 0 });
    expect(hub.fileLink).toHaveBeenCalledTimes(1);
  });

  it('says so when the hub has no such rendition, and when the book is copy-protected', async () => {
    await expect(make({ files: [file('epub')] }).service.readLink(WORK, 'pdf')).rejects.toMatchObject({ status: 404, message: expect.stringMatching(/no PDF/) });
    await expect(make({ files: [], withheld: 'drm' }).service.readLink(WORK, 'pdf')).rejects.toMatchObject({ status: 403 });
  });
});

describe('HubFilesService.syncFromWork', () => {
  it('records the PDF and EPUB as hub-owned formats with no file URL, and nothing else', async () => {
    const { service, prisma } = make();
    const out = await service.syncFromWork('book-1', WORK);
    expect(out.formats).toEqual(['PDF', 'EPUB']);
    const [pdf, epub] = prisma.bookFormat.upsert.mock.calls.map((c: any[]) => c[0]);
    expect(pdf.where).toEqual({ bookId_type_partIndex: { bookId: 'book-1', type: 'PDF', partIndex: 0 } });
    expect(pdf.create).toMatchObject({ bookId: 'book-1', type: 'PDF', partIndex: 0, fileUrl: null, fileSize: 1000, mimeType: 'application/pdf' });
    expect(pdf.create.metadata).toEqual({ hub: { workId: WORK, fileId: 'f-pdf', version: 'v-pdf' } });
    expect(pdf.update).toEqual(expect.objectContaining({ fileUrl: null }));
    expect(epub.create.type).toBe('EPUB');
    expect(prisma.bookFormat.upsert).toHaveBeenCalledTimes(2);
  });

  it('leaves a file that Book Buddy holds itself alone, but refreshes a hub-owned row', async () => {
    const own = make({ existing: { PDF: { fileUrl: 'https://cdn/own.pdf', metadata: { s3Key: 'k' } } } });
    expect((await own.service.syncFromWork('book-1', WORK)).formats).toEqual(['EPUB']);

    const hubOwned = make({ existing: { PDF: { fileUrl: null, metadata: { hub: { workId: WORK, fileId: 'old', version: 'old' } } } } });
    expect((await hubOwned.service.syncFromWork('book-1', WORK)).formats).toEqual(['PDF', 'EPUB']);
  });

  it('is safe to repeat', async () => {
    const { service, prisma } = make();
    await service.syncFromWork('book-1', WORK);
    await service.syncFromWork('book-1', WORK);
    expect(prisma.bookFormat.upsert).toHaveBeenCalledTimes(4); // upserts, never inserts that could collide
  });

  it('records nothing for a copy-protected work', async () => {
    const { service, prisma } = make({ files: [], withheld: 'drm' });
    const out = await service.syncFromWork('book-1', WORK);
    expect(out).toEqual({ formats: [], cover: false });
    expect(prisma.bookFormat.upsert).not.toHaveBeenCalled();
  });

  it('always reads the manifest afresh', async () => {
    const { service, hub } = make();
    await service.readLink(WORK, 'pdf'); // caches
    await service.syncFromWork('book-1', WORK);
    expect(hub.getWork).toHaveBeenCalledTimes(2);
  });

  describe('the cover', () => {
    const realFetch = global.fetch;
    afterEach(() => {
      global.fetch = realFetch;
    });
    const image = (type = 'image/png', bytes = 20, headers: Record<string, string> = {}) =>
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: (h: string) => ({ 'content-type': type, ...headers })[h.toLowerCase()] ?? null },
        arrayBuffer: async () => new ArrayBuffer(bytes),
      });

    it('is copied once into Book Buddy’s own storage and set on the book', async () => {
      const { service, prisma, s3 } = make();
      const f = (global.fetch = image() as any);
      const out = await service.syncFromWork('book-1', WORK);
      expect(out.cover).toBe(true);
      expect(f).toHaveBeenCalledWith(LINK, expect.objectContaining({ redirect: 'error' }));
      expect(s3.putObject).toHaveBeenCalledWith(expect.stringContaining('global/books/book-1/covers/front/'), expect.any(Buffer), 'image/png');
      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: 'book-1' },
        data: { coverKey: expect.stringContaining('covers/front'), coverUrl: 'https://media.bb.test/cover.png' },
      });
    });

    it('never replaces a cover the book already has', async () => {
      const { service, s3, hub } = make({ book: { coverUrl: 'https://cdn/mine.png', coverKey: 'k' } });
      global.fetch = image() as any;
      expect((await service.syncFromWork('book-1', WORK)).cover).toBe(false);
      expect(s3.putObject).not.toHaveBeenCalled();
      expect(hub.fileLink).not.toHaveBeenCalled();
    });

    it.each([
      ['an unsupported type', image('image/svg+xml')],
      ['an oversized body', image('image/png', 6 * 1024 * 1024)],
      ['an oversized declared length', image('image/png', 10, { 'content-length': String(9 * 1024 * 1024) })],
      ['an empty body', image('image/png', 0)],
    ])('is skipped for %s, without failing the sync', async (_name, f) => {
      const { service, s3 } = make();
      global.fetch = f as any;
      const out = await service.syncFromWork('book-1', WORK);
      expect(out).toMatchObject({ formats: ['PDF', 'EPUB'], cover: false });
      expect(s3.putObject).not.toHaveBeenCalled();
    });

    it('does not fail the sync when the storage answers an error', async () => {
      const { service } = make();
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, headers: { get: () => null } }) as any;
      await expect(service.syncFromWork('book-1', WORK)).resolves.toMatchObject({ cover: false });
    });
  });
});
