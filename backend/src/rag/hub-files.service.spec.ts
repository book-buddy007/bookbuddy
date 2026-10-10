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

const track = (id: string, gender: string, over: Record<string, unknown> = {}) => ({
  fileId: id,
  kind: 'audio',
  gender,
  mimeType: 'audio/mpeg',
  sizeBytes: 5000,
  durationSeconds: 60,
  version: `v-${id}`,
  ...over,
});
const audioChapter = (id: string, sections: any[], over: Record<string, unknown> = {}) => ({ chapterId: id, title: `Chapter ${id}`, sortOrder: 1, sections, ...over });
const audioSection = (id: string, tracks: any[], over: Record<string, unknown> = {}) => ({ sectionId: id, title: `Section ${id}`, sortOrder: 1, type: 'SECTION', durationSeconds: 60, tracks, ...over });

function make(opts: { files?: any[]; withheld?: 'drm' | null; existing?: Record<string, any>; book?: any; audio?: any[]; ownChapters?: number } = {}) {
  const work = { id: WORK, manifest: { revision: 'r', files: opts.files ?? [file('pdf'), file('epub'), file('cover')], filesWithheld: opts.withheld ?? null, audio: opts.audio ?? [], chapters: [], pages: 10 } };
  let seq = 0;
  const prisma: any = {
    bookFormat: {
      findUnique: jest.fn(async ({ where }: any) => opts.existing?.[where.bookId_type_partIndex.type] ?? null),
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    book: {
      findUnique: jest.fn().mockResolvedValue(opts.book ?? { coverUrl: null, coverKey: null }),
      update: jest.fn().mockResolvedValue({}),
    },
    audioChapter: {
      count: jest.fn().mockResolvedValue(opts.ownChapters ?? 0),
      upsert: jest.fn(async (a: any) => ({ id: `chap-row-${a.where.bookId_hubChapterId.hubChapterId}` })),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    audioSection: {
      upsert: jest.fn(async (a: any) => ({ id: `sec-row-${a.where.chapterId_hubSectionId.hubSectionId}` })),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    audioTrack: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(async () => ({ id: `t${++seq}` })),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
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
    expect(out).toMatchObject({ formats: [], cover: false, audioTracks: 0 });
    expect(prisma.bookFormat.upsert).not.toHaveBeenCalled();
  });

  describe('audio', () => {
    const AUDIO = [
      audioChapter('c1', [audioSection('s1', [track('t-m', 'male'), track('t-f', 'female')]), audioSection('s2', [track('t-f2', 'female')], { sortOrder: 2, type: 'INTRO' })]),
    ];

    it('mirrors chapters, sections and tracks with the hub’s ids, and copies no file', async () => {
      const { service, prisma } = make({ audio: AUDIO });
      const out = await service.syncFromWork('book-1', WORK);

      expect(out.audioTracks).toBe(3);
      expect(out.formats).toContain('AUDIOBOOK');
      expect(prisma.audioChapter.upsert.mock.calls[0][0]).toMatchObject({
        where: { bookId_hubChapterId: { bookId: 'book-1', hubChapterId: 'c1' } },
        create: { bookId: 'book-1', hubChapterId: 'c1', title: 'Chapter c1' },
      });
      const sections = prisma.audioSection.upsert.mock.calls.map((c: any[]) => c[0]);
      expect(sections[0].create).toMatchObject({ chapterId: 'chap-row-c1', hubSectionId: 's1', sectionType: 'SECTION', fileSizeBytes: BigInt(5000) });
      expect(sections[1].create).toMatchObject({ hubSectionId: 's2', sectionType: 'INTRO' });
      const created = prisma.audioTrack.create.mock.calls.map((c: any[]) => c[0].data);
      expect(created).toHaveLength(3);
      expect(created[0]).toMatchObject({ sectionId: 'sec-row-s1', gender: 'MALE', fileUrl: '', hubFileId: 't-m', durationSeconds: 60, fileSizeBytes: BigInt(5000) });
      expect(created[1]).toMatchObject({ gender: 'FEMALE', hubFileId: 't-f' });
      // Nothing is fetched or stored: the hub's links are asked for on every play.
      expect(prisma.bookFormat.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookId_type_partIndex: { bookId: 'book-1', type: 'AUDIOBOOK', partIndex: 0 } },
          create: expect.objectContaining({ fileUrl: null, metadata: { hub: { workId: WORK, fileId: 'audio', version: 'r' } } }),
        }),
      );
    });

    it('updates a track in place on a repeat run, so a listener’s progress and bookmarks keep their ids', async () => {
      const { service, prisma } = make({ audio: AUDIO });
      prisma.audioTrack.findFirst.mockResolvedValue({ id: 'existing-track' });
      await service.syncFromWork('book-1', WORK);
      expect(prisma.audioTrack.create).not.toHaveBeenCalled();
      expect(prisma.audioTrack.update).toHaveBeenCalledWith({ where: { id: 'existing-track' }, data: expect.objectContaining({ hubFileId: 't-m', fileUrl: '' }) });
    });

    it('removes only hub-marked rows the hub no longer lists', async () => {
      const { service, prisma } = make({ audio: AUDIO });
      await service.syncFromWork('book-1', WORK);
      expect(prisma.audioTrack.deleteMany).toHaveBeenCalledWith({ where: { section: { chapter: { bookId: 'book-1' } }, hubFileId: { not: null, notIn: ['t-m', 't-f', 't-f2'] } } });
      expect(prisma.audioSection.deleteMany).toHaveBeenCalledWith({ where: { chapter: { bookId: 'book-1' }, hubSectionId: { not: null, notIn: ['s1', 's2'] } } });
      expect(prisma.audioChapter.deleteMany).toHaveBeenCalledWith({ where: { bookId: 'book-1', hubChapterId: { not: null, notIn: ['c1'] } } });
    });

    it('leaves audio the book holds itself alone', async () => {
      const ownChapters = make({ audio: AUDIO, ownChapters: 2 });
      expect((await ownChapters.service.syncFromWork('book-1', WORK)).audioTracks).toBe(0);
      expect(ownChapters.prisma.audioChapter.upsert).not.toHaveBeenCalled();
      expect(ownChapters.prisma.audioChapter.deleteMany).not.toHaveBeenCalled();

      const ownFile = make({ audio: AUDIO, existing: { AUDIOBOOK: { fileUrl: 'https://cdn/own.m4b', metadata: {} } } });
      expect((await ownFile.service.syncFromWork('book-1', WORK)).audioTracks).toBe(0);
      expect(ownFile.prisma.audioChapter.upsert).not.toHaveBeenCalled();
    });

    it('skips a track whose gender is neither male nor female, and drops the marker when nothing is left', async () => {
      const { service, prisma } = make({ audio: [audioChapter('c1', [audioSection('s1', [track('t-x', 'other')])])] });
      const out = await service.syncFromWork('book-1', WORK);
      expect(out.audioTracks).toBe(0);
      expect(prisma.audioTrack.create).not.toHaveBeenCalled();
      expect(prisma.bookFormat.deleteMany).toHaveBeenCalledWith({ where: { bookId: 'book-1', type: 'AUDIOBOOK', fileUrl: null } });
    });

    it('does not fail the link when the audio cannot be recorded', async () => {
      const { service, prisma } = make({ audio: AUDIO });
      prisma.$transaction.mockRejectedValue(new Error('db down'));
      await expect(service.syncFromWork('book-1', WORK)).resolves.toMatchObject({ formats: ['PDF', 'EPUB'], audioTracks: 0 });
    });
  });

  describe('audioLink', () => {
    it('asks the hub for a fresh link for the track and returns only the url and expiry', async () => {
      const { service, hub } = make();
      await expect(service.audioLink(WORK, 't-m')).resolves.toEqual({ url: LINK, expiresAt: '2026-10-07T10:05:00Z' });
      expect(hub.fileLink).toHaveBeenCalledWith(WORK, 't-m');
      expect(hub.getWork).not.toHaveBeenCalled();
    });
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

    describe('refreshing a cover (the "Refresh from library" action)', () => {
      const HUB_KEY = 'global/books/book-1/covers/front/111-hub-cover.png';

      it('copies a cover when the book has none, and says nothing is wrong', async () => {
        const { service, s3 } = make();
        global.fetch = image() as any;
        const out = await service.syncFromWork('book-1', WORK, { refreshCover: true });
        expect(out).toMatchObject({ cover: true });
        expect(out.coverNote).toBeUndefined();
        expect(s3.putObject).toHaveBeenCalledTimes(1);
      });

      it('replaces a cover that an earlier sync copied from the library, and removes the old copy from storage', async () => {
        const { service, s3, prisma } = make({ book: { coverUrl: 'https://media.bb.test/old.png', coverKey: HUB_KEY } });
        s3.deleteFile = jest.fn().mockResolvedValue(undefined);
        global.fetch = image() as any;
        const out = await service.syncFromWork('book-1', WORK, { refreshCover: true });
        expect(out.cover).toBe(true);
        expect(prisma.book.update).toHaveBeenCalledWith({ where: { id: 'book-1' }, data: expect.objectContaining({ coverUrl: 'https://media.bb.test/cover.png' }) });
        expect(s3.deleteFile).toHaveBeenCalledWith(HUB_KEY);
      });

      it('never replaces a cover someone uploaded, and says so', async () => {
        const { service, s3, hub } = make({ book: { coverUrl: 'https://cdn/mine.png', coverKey: 'global/books/book-1/covers/front/222-my-cover.png' } });
        s3.deleteFile = jest.fn();
        global.fetch = image() as any;
        const out = await service.syncFromWork('book-1', WORK, { refreshCover: true });
        expect(out).toMatchObject({ cover: false, coverNote: expect.stringMatching(/cover of its own, which is kept/) });
        expect(s3.putObject).not.toHaveBeenCalled();
        expect(s3.deleteFile).not.toHaveBeenCalled();
        expect(hub.fileLink).not.toHaveBeenCalled();
      });

      it('without refresh (the link job) leaves even a library-copied cover alone', async () => {
        const { service, s3 } = make({ book: { coverUrl: 'https://media.bb.test/old.png', coverKey: HUB_KEY } });
        global.fetch = image() as any;
        expect((await service.syncFromWork('book-1', WORK)).cover).toBe(false);
        expect(s3.putObject).not.toHaveBeenCalled();
      });

      it('says why when the cover could not be copied (for example storage refusing the write)', async () => {
        const { service, s3 } = make();
        global.fetch = image() as any;
        s3.putObject.mockRejectedValue(new Error('The request signature we calculated does not match the signature you provided.'));
        const out = await service.syncFromWork('book-1', WORK, { refreshCover: true });
        expect(out.cover).toBe(false);
        expect(out.coverNote).toMatch(/The cover could not be copied: The request signature/);
      });

      it('says so when the library has no cover', async () => {
        const { service } = make({ files: [file('pdf')] });
        expect((await service.syncFromWork('book-1', WORK, { refreshCover: true })).coverNote).toMatch(/no cover for this book/);
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
