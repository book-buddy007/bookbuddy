import { SharedLibraryError, SharedLibraryService, sharedWorkFromHub } from './shared-library.service';

const WORK = '5f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f';
// The id the passages carry in the shared index: the embedder's, not the work's.
const INDEX = '0b9d8c7e-6f5a-4b3c-9d2e-1f0a9b8c7d6e';

const summary = (over: Record<string, unknown> = {}) => ({
  id: WORK,
  title: 'Understanding Society',
  author: 'NCERT',
  isbn: '978-93-5729-100-2',
  language: 'Hindi',
  publisher: 'NCERT',
  publishYear: 2024,
  pages: 180,
  hasCover: true,
  formats: ['pdf'],
  searchable: true,
  passageCount: 42,
  ...over,
});

function make(enabled = true) {
  const hub: any = {
    enabled: jest.fn().mockReturnValue(enabled),
    listWorks: jest.fn().mockResolvedValue({ items: [summary()], total: 1 }),
    getWork: jest.fn().mockResolvedValue({ ...summary(), index: { collection: 'trio_content_v1_openai3072', contentItemId: INDEX }, manifest: { files: [] } }),
    linkWork: jest.fn().mockResolvedValue(undefined),
    unlinkWork: jest.fn().mockResolvedValue(true),
  };
  return { service: new SharedLibraryService(hub), hub };
}

describe('SharedLibraryService with the PDLMS hub', () => {
  it('says whose library it is', () => {
    expect(make(true).service.ownerName()).toBe('PDLMS');
    expect(make(false).service.ownerName()).toBe('DigiClassroom');
  });

  it('shapes a hub work like the catalogue screens expect', () => {
    expect(sharedWorkFromHub(summary())).toEqual({
      contentItemId: WORK,
      title: 'Understanding Society',
      isbn: '978-93-5729-100-2',
      edition: null,
      lang: 'Hindi',
      chunks: 42,
      pageStart: null,
      pageEnd: 180,
      linkedApps: [],
    });
  });

  describe('listWorks', () => {
    it('lists only works with embedded passages: linking exists to reuse them', async () => {
      const { service, hub } = make();
      hub.listWorks.mockResolvedValue({
        items: [summary(), summary({ id: 'other', searchable: false, passageCount: 0 })],
        total: 2,
      });
      const works = await service.listWorks('soc', 20);
      expect(hub.listWorks).toHaveBeenCalledWith({ q: 'soc', limit: 20 });
      expect(works.map((w) => w.contentItemId)).toEqual([WORK]);
    });

    it('never asks the hub for more than its page limit', async () => {
      const { service, hub } = make();
      await service.listWorks(undefined, 500);
      expect(hub.listWorks).toHaveBeenCalledWith({ q: undefined, limit: 50 });
    });
  });

  describe('getWork', () => {
    it('returns the work, with where its passages are', async () => {
      const { service } = make();
      await expect(service.getWork(WORK)).resolves.toMatchObject({
        contentItemId: WORK,
        chunks: 42,
        index: { collection: 'trio_content_v1_openai3072', contentItemId: INDEX },
      });
    });

    it('refuses a work the hub calls searchable but cannot place in the index', async () => {
      const { service, hub } = make();
      hub.getWork.mockResolvedValue({ ...summary(), index: null, manifest: { files: [] } });
      await expect(service.getWork(WORK)).rejects.toMatchObject({ status: 409 });
    });

    it('rejects an id that is not a uuid without calling the hub', async () => {
      const { service, hub } = make();
      await expect(service.getWork('nope')).rejects.toMatchObject({ status: 400 });
      expect(hub.getWork).not.toHaveBeenCalled();
    });

    it('explains a work the hub will not show, which looks the same as one that does not exist', async () => {
      const { service, hub } = make();
      hub.getWork.mockRejectedValue(new SharedLibraryError(404, 'Work not found'));
      await expect(service.getWork(WORK)).rejects.toMatchObject({ status: 404, message: expect.stringMatching(/not been shared/) });
    });

    it('refuses a work that has no embedded passages, because there would be nothing to link to', async () => {
      const { service, hub } = make();
      hub.getWork.mockResolvedValue({ ...summary({ searchable: false, passageCount: 0 }), manifest: { files: [] } });
      await expect(service.getWork(WORK)).rejects.toMatchObject({ status: 409, message: expect.stringMatching(/no embedded passages/) });
    });

    it('passes other hub failures on untouched', async () => {
      const { service, hub } = make();
      hub.getWork.mockRejectedValue(new SharedLibraryError(0, 'unreachable'));
      await expect(service.getWork(WORK)).rejects.toMatchObject({ status: 0, retryable: true });
    });
  });

  describe('resolveIndex', () => {
    const saved = { url: process.env.SHARED_QDRANT_URL, collection: process.env.SHARED_QDRANT_COLLECTION };
    beforeEach(() => {
      process.env.SHARED_QDRANT_URL = 'http://qdrant:6333';
      delete process.env.SHARED_QDRANT_COLLECTION; // the default: trio_content_v1_openai3072
    });
    afterEach(() => {
      for (const [k, v] of [['SHARED_QDRANT_URL', saved.url], ['SHARED_QDRANT_COLLECTION', saved.collection]] as const) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    });

    it('gives the work id for the hub and the embedder’s id for the passages, which differ', async () => {
      const { service } = make();
      await expect(service.resolveIndex(WORK)).resolves.toEqual({ hubWorkId: WORK, indexContentItemId: INDEX });
    });

    it('refuses, as a refusal that is not retried, when the passages are in another collection', async () => {
      const { service, hub } = make();
      hub.getWork.mockResolvedValue({ ...summary(), index: { collection: 'pdlms_content_v1', contentItemId: INDEX }, manifest: { files: [] } });
      const err: any = await service.resolveIndex(WORK).catch((e) => e);
      expect(err).toBeInstanceOf(SharedLibraryError);
      expect(err.status).toBe(409);
      expect(err.retryable).toBe(false);
      expect(err.message).toMatch(/pdlms_content_v1.*trio_content_v1_openai3072/s);
    });

    it('follows SHARED_QDRANT_COLLECTION when it is set', async () => {
      process.env.SHARED_QDRANT_COLLECTION = 'pdlms_content_v1';
      const { service, hub } = make();
      hub.getWork.mockResolvedValue({ ...summary(), index: { collection: 'pdlms_content_v1', contentItemId: INDEX }, manifest: { files: [] } });
      await expect(service.resolveIndex(WORK)).resolves.toMatchObject({ indexContentItemId: INDEX });
    });

    it('refuses when the hub cannot say where the passages are, or gives an id that is not a uuid', async () => {
      for (const index of [null, { collection: 'trio_content_v1_openai3072', contentItemId: 'not-a-uuid' }]) {
        const { service, hub } = make();
        hub.getWork.mockResolvedValue({ ...summary(), index, manifest: { files: [] } });
        await expect(service.resolveIndex(WORK)).rejects.toMatchObject({ status: 409 });
      }
    });

    it('refuses when the shared index is not set up here, before anything is linked', async () => {
      delete process.env.SHARED_QDRANT_URL;
      const { service, hub } = make();
      await expect(service.resolveIndex(WORK)).rejects.toMatchObject({ status: 409, message: expect.stringMatching(/SHARED_QDRANT_URL/) });
      expect(hub.linkWork).not.toHaveBeenCalled();
    });

    it('lets a failure to reach the hub through, so the job retries', async () => {
      const { service, hub } = make();
      hub.getWork.mockRejectedValue(new SharedLibraryError(0, 'unreachable'));
      await expect(service.resolveIndex(WORK)).rejects.toMatchObject({ retryable: true });
    });

    it('with DigiClassroom the work id is the index id and there is no hub id', async () => {
      const { service, hub } = make(false);
      await expect(service.resolveIndex(WORK)).resolves.toEqual({ hubWorkId: null, indexContentItemId: WORK });
      expect(hub.getWork).not.toHaveBeenCalled();
    });

    it('rejects an id that is not a uuid', async () => {
      await expect(make().service.resolveIndex('nope')).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('linkWork', () => {
    it('links through the hub with this book as the record id', async () => {
      const { service, hub } = make();
      await service.linkWork({ contentItemId: WORK, bookId: 'book-1', isbn: '978-93-5729-100-2' });
      expect(hub.linkWork).toHaveBeenCalledWith(WORK, 'book-1', '978-93-5729-100-2');
    });

    it('refuses a bad work id before calling the hub', async () => {
      const { service, hub } = make();
      await expect(service.linkWork({ contentItemId: 'x', bookId: 'b' })).rejects.toMatchObject({ status: 400 });
      expect(hub.linkWork).not.toHaveBeenCalled();
    });

    it('lets the hub’s refusal through, so a mismatch is not retried', async () => {
      const { service, hub } = make();
      hub.linkWork.mockRejectedValue(new SharedLibraryError(409, 'The ISBN does not match the hub work; the link was not made.'));
      const err: any = await service.linkWork({ contentItemId: WORK, bookId: 'b' }).catch((e) => e);
      expect(err.retryable).toBe(false);
    });
  });

  describe('unlinkWork', () => {
    it('unlinks through the hub with this book as the record id, and reports whether a link was removed', async () => {
      const { service, hub } = make();
      await expect(service.unlinkWork({ contentItemId: WORK, bookId: 'book-1' })).resolves.toBe(true);
      expect(hub.unlinkWork).toHaveBeenCalledWith(WORK, 'book-1');
      hub.unlinkWork.mockResolvedValue(false);
      await expect(service.unlinkWork({ contentItemId: WORK, bookId: 'book-1' })).resolves.toBe(false);
    });

    it('refuses a bad work id before calling the hub', async () => {
      const { service, hub } = make();
      await expect(service.unlinkWork({ contentItemId: 'x', bookId: 'b' })).rejects.toMatchObject({ status: 400 });
      expect(hub.unlinkWork).not.toHaveBeenCalled();
    });

    it('is not available with DigiClassroom, and sends nothing there', async () => {
      const { service, hub } = make(false);
      const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => {
        throw new Error('must not be called');
      });
      await expect(service.unlinkWork({ contentItemId: WORK, bookId: 'b' })).rejects.toMatchObject({ status: 501 });
      expect(hub.unlinkWork).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('lets the hub’s refusal through untouched, so a mixed-up id is not retried', async () => {
      const { service, hub } = make();
      hub.unlinkWork.mockRejectedValue(new SharedLibraryError(409, 'linked to a different work'));
      const err: any = await service.unlinkWork({ contentItemId: WORK, bookId: 'b' }).catch((e) => e);
      expect(err).toMatchObject({ status: 409, retryable: false });
    });
  });

  describe('when the hub is not configured', () => {
    it('does not use it and leaves DigiClassroom’s path in charge', async () => {
      const { service, hub } = make(false);
      delete process.env.TRIO_INGEST_URL;
      delete process.env.TRIO_API_BASE;
      await expect(service.listWorks()).rejects.toMatchObject({ status: 503 });
      expect(hub.listWorks).not.toHaveBeenCalled();
    });
  });
});
