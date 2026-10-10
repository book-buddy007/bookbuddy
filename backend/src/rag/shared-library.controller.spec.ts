import { BadRequestException, ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { SharedLibraryController } from './shared-library.controller';
import { SharedLibraryError } from './shared-library.service';

const WORK = '5f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f';

describe('SharedLibraryController', () => {
  const saved = process.env.SHARED_QDRANT_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.SHARED_QDRANT_URL;
    else process.env.SHARED_QDRANT_URL = saved;
  });

  function make(overrides: { book?: any; job?: any; duplicate?: any; work?: any; workError?: Error; enqueueError?: Error; hub?: boolean; used?: any[] } = {}) {
    const prisma = {
      book: {
        findUnique: jest
          .fn()
          .mockResolvedValue(overrides.book === undefined ? { id: 'b1', deletedAt: null } : overrides.book),
        update: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue(overrides.duplicate ?? null),
        findMany: jest.fn().mockResolvedValue(overrides.used ?? []),
        create: jest.fn().mockResolvedValue({ id: 'new-book', title: 'Understanding Society' }),
        delete: jest.fn().mockResolvedValue({}),
      },
      tenant: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const library = {
      ownerName: jest.fn().mockReturnValue('PDLMS'),
      usesHub: jest.fn().mockReturnValue(overrides.hub ?? false),
      listWorks: jest.fn().mockResolvedValue([{ contentItemId: WORK }]),
      getWork: overrides.workError
        ? jest.fn().mockRejectedValue(overrides.workError)
        : jest.fn().mockResolvedValue(overrides.work ?? { contentItemId: WORK, title: 'Understanding Society', isbn: '978-93-5729-100-2', lang: 'Hindi' }),
    };
    const queue = {
      getJob: jest.fn().mockResolvedValue(overrides.job ?? null),
      add: overrides.enqueueError ? jest.fn().mockRejectedValue(overrides.enqueueError) : jest.fn().mockResolvedValue({}),
    };
    const controller = new SharedLibraryController(prisma as any, library as any, queue as any);
    return { controller, prisma, library, queue };
  }

  describe('with no shared library configured', () => {
    beforeEach(() => {
      delete process.env.SHARED_QDRANT_URL;
    });
    it('refuses both calls, since there is nothing to link to', async () => {
      const { controller, queue } = make();
      await expect(controller.works()).rejects.toBeInstanceOf(ConflictException);
      await expect(controller.link('b1', { contentItemId: WORK })).rejects.toBeInstanceOf(ConflictException);
      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('with the shared library configured', () => {
    beforeEach(() => {
      process.env.SHARED_QDRANT_URL = 'http://shared:6333';
    });

    it('lists the works', async () => {
      const { controller, library } = make();
      await expect(controller.works('eco', '10')).resolves.toEqual({ works: [{ contentItemId: WORK }], owner: 'PDLMS' });
      expect(library.listWorks).toHaveBeenCalledWith('eco', 10);
    });

    it('with the hub, marks the works Book Buddy already has a book for, so the screen does not offer a second', async () => {
      const OTHER = '0b9d8c7e-6f5a-4b3c-9d2e-1f0a9b8c7d6e';
      const { controller, prisma, library } = make({ hub: true, used: [{ hubWorkId: WORK }] });
      library.listWorks.mockResolvedValue([
        { contentItemId: WORK, linkedApps: [] },
        { contentItemId: OTHER, linkedApps: [] },
      ]);
      const out = await controller.works();
      expect(out.works).toEqual([
        { contentItemId: WORK, linkedApps: ['bookbuddy'] },
        { contentItemId: OTHER, linkedApps: [] },
      ]);
      expect(prisma.book.findMany).toHaveBeenCalledWith({ where: { deletedAt: null, hubWorkId: { in: [WORK, OTHER] } }, select: { hubWorkId: true } });
    });

    it('without the hub, asks the database nothing and leaves the works as they are', async () => {
      const { controller, prisma } = make({ hub: false });
      await controller.works();
      expect(prisma.book.findMany).not.toHaveBeenCalled();
    });

    it('turns a library failure into an HTTP error carrying its reason', async () => {
      const { controller, library } = make();
      library.listWorks.mockRejectedValue(new SharedLibraryError(502, 'DigiClassroom rejected the service secret.'));
      const err: any = await controller.works().catch((e) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(502);
      expect(JSON.stringify(err.getResponse())).toMatch(/rejected the service secret/);
    });

    it('queues one link job per book and marks the book PENDING', async () => {
      const { controller, queue, prisma } = make();
      await expect(controller.link('b1', { contentItemId: WORK })).resolves.toEqual({ status: 'QUEUED', bookId: 'b1' });
      expect(queue.add).toHaveBeenCalledWith(
        'link-work',
        { bookId: 'b1', contentItemId: WORK },
        expect.objectContaining({ jobId: 'link-b1', attempts: 3 }),
      );
      expect(prisma.book.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { embeddingStatus: 'PENDING' } });
    });

    it('rejects a malformed work id and a missing or binned book, queueing nothing', async () => {
      const a = make();
      await expect(a.controller.link('b1', { contentItemId: 'x; DROP' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(a.controller.link('b1', {} as any)).rejects.toBeInstanceOf(BadRequestException);
      const missing = make({ book: null });
      await expect(missing.controller.link('b1', { contentItemId: WORK })).rejects.toBeInstanceOf(NotFoundException);
      const binned = make({ book: { id: 'b1', deletedAt: new Date() } });
      await expect(binned.controller.link('b1', { contentItemId: WORK })).rejects.toBeInstanceOf(NotFoundException);
      for (const m of [a, missing, binned]) expect(m.queue.add).not.toHaveBeenCalled();
    });

    describe('createBook (a Book Buddy book made from a shared work)', () => {
      const req = { user: { id: 'admin-1' } };

      it('confirms the work, creates a global book from it, and queues the link', async () => {
        const { controller, prisma, library, queue } = make();
        const out = await controller.createBook({ contentItemId: WORK, author: 'NCERT' }, req);

        expect(library.getWork).toHaveBeenCalledWith(WORK);
        expect(prisma.book.create.mock.calls[0][0].data).toMatchObject({
          title: 'Understanding Society',
          author: 'NCERT',
          isbn: '978-93-5729-100-2',
          language: 'hi',
          tenantId: '__SYSTEM__',
          catalogScope: 'GLOBAL',
          globalPublishStatus: 'APPROVED',
          globalPublishReviewedBy: 'admin-1',
        });
        expect(queue.add).toHaveBeenCalledWith(
          'link-work',
          { bookId: 'new-book', contentItemId: WORK },
          expect.objectContaining({ jobId: 'link-new-book' }),
        );
        expect(out).toEqual({ status: 'QUEUED', bookId: 'new-book', title: 'Understanding Society' });
      });

      it('from a hub work needs no author typed, and saves what the library knows about the book', async () => {
        const { controller, prisma } = make({
          work: {
            contentItemId: WORK, title: 'Understanding Society', isbn: '978-93-5729-100-2', lang: 'en',
            author: 'NCERT', publisher: 'NCERT', publishYear: 2024, pages: 180, description: 'A textbook.', formats: ['pdf', 'audiobook'],
          },
        });
        await controller.createBook({ contentItemId: WORK }, req);
        expect(prisma.book.create.mock.calls[0][0].data).toMatchObject({
          author: 'NCERT', publisher: 'NCERT', publishYear: 2024, pages: 180, description: 'A textbook.', format: 'pdf',
        });
      });

      it('creates nothing when the work is not there or not public', async () => {
        const { controller, prisma, queue } = make({ workError: new SharedLibraryError(404, 'That work is not in the shared library, or it is not public.') });
        const err: any = await controller.createBook({ contentItemId: WORK, author: 'A' }, req).catch((e) => e);
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(404);
        expect(prisma.book.create).not.toHaveBeenCalled();
        expect(queue.add).not.toHaveBeenCalled();
      });

      it('creates nothing without an author, with a bad id, or with an unknown language', async () => {
        const { controller, prisma } = make();
        await expect(controller.createBook({ contentItemId: WORK }, req)).rejects.toBeInstanceOf(BadRequestException);
        await expect(controller.createBook({ contentItemId: "x; DROP", author: 'A' }, req)).rejects.toBeInstanceOf(BadRequestException);
        await expect(controller.createBook({ contentItemId: WORK, author: 'A', language: 'klingon' }, req)).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.book.create).not.toHaveBeenCalled();
      });

      it('refuses a work that another Book Buddy book already uses, naming that book', async () => {
        const { controller, prisma } = make({ duplicate: { title: 'Understanding Society (Class 9)' } });
        await expect(controller.createBook({ contentItemId: WORK, author: 'A' }, req)).rejects.toThrow(/already used by the Book Buddy book/);
        expect(prisma.book.create).not.toHaveBeenCalled();
      });

      it('looks for an existing book by the PDLMS work id AND the id the passages carry, so a DigiClassroom-linked book is found too', async () => {
        const INDEX = '0b9d8c7e-6f5a-4b3c-9d2e-1f0a9b8c7d6e';
        const { controller, prisma } = make({
          work: { contentItemId: WORK, title: 'T', isbn: null, lang: 'Hindi', index: { collection: 'c', contentItemId: INDEX } },
        });
        await controller.createBook({ contentItemId: WORK, author: 'A' }, req);
        expect(prisma.book.findFirst.mock.calls[0][0].where).toEqual({
          deletedAt: null,
          OR: [{ hubWorkId: WORK }, { spineContentItemId: WORK }, { spineContentItemId: INDEX }],
        });
      });

      it('removes the book again if the link cannot be queued, so nothing is left half-made', async () => {
        const { controller, prisma } = make({ enqueueError: new Error('redis down') });
        await expect(controller.createBook({ contentItemId: WORK, author: 'A' }, req)).rejects.toThrow('redis down');
        expect(prisma.book.delete).toHaveBeenCalledWith({ where: { id: 'new-book' } });
      });

      it('is refused when no shared library is configured', async () => {
        delete process.env.SHARED_QDRANT_URL;
        const { controller, prisma } = make();
        await expect(controller.createBook({ contentItemId: WORK, author: 'A' }, req)).rejects.toBeInstanceOf(ConflictException);
        expect(prisma.book.create).not.toHaveBeenCalled();
      });
    });

    it('refuses while a link is already running, and clears a settled job to make room', async () => {
      const running = make({ job: { getState: async () => 'active', remove: jest.fn() } });
      await expect(running.controller.link('b1', { contentItemId: WORK })).rejects.toBeInstanceOf(ConflictException);
      expect(running.queue.add).not.toHaveBeenCalled();

      const remove = jest.fn();
      const settled = make({ job: { getState: async () => 'failed', remove } });
      await settled.controller.link('b1', { contentItemId: WORK });
      expect(remove).toHaveBeenCalled();
      expect(settled.queue.add).toHaveBeenCalled();
    });
  });
});
