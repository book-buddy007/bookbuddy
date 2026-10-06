import { BadRequestException, ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { SharedLibraryController } from './shared-library.controller';
import { SharedLibraryError } from './shared-library.service';

const WORK = '5f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f';

describe('SharedLibraryController', () => {
  const saved = process.env.INGESTION_MODE;
  afterEach(() => {
    if (saved === undefined) delete process.env.INGESTION_MODE;
    else process.env.INGESTION_MODE = saved;
  });

  function make(overrides: { book?: any; job?: any } = {}) {
    const prisma = {
      book: {
        findUnique: jest
          .fn()
          .mockResolvedValue(overrides.book === undefined ? { id: 'b1', deletedAt: null } : overrides.book),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const library = { listWorks: jest.fn().mockResolvedValue([{ contentItemId: WORK }]) };
    const queue = { getJob: jest.fn().mockResolvedValue(overrides.job ?? null), add: jest.fn().mockResolvedValue({}) };
    const controller = new SharedLibraryController(prisma as any, library as any, queue as any);
    return { controller, prisma, library, queue };
  }

  describe('with Book Buddy using its own index', () => {
    beforeEach(() => {
      delete process.env.INGESTION_MODE;
    });
    it('refuses both calls, since there is no shared library to use', async () => {
      const { controller, queue } = make();
      await expect(controller.works()).rejects.toBeInstanceOf(ConflictException);
      await expect(controller.link('b1', { contentItemId: WORK })).rejects.toBeInstanceOf(ConflictException);
      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('in shared-index mode', () => {
    beforeEach(() => {
      process.env.INGESTION_MODE = 'trio';
    });

    it('lists the works', async () => {
      const { controller, library } = make();
      await expect(controller.works('eco', '10')).resolves.toEqual({ works: [{ contentItemId: WORK }] });
      expect(library.listWorks).toHaveBeenCalledWith('eco', 10);
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
