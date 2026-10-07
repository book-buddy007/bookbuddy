import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SharedLibraryController } from './shared-library.controller';

const BOOK = 'book-1';
const LINKED = { id: BOOK, deletedAt: null, spineContentItemId: '5f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f' };

function make(opts: { hub?: boolean; book?: any; jobs?: Record<string, string>; sharedUrl?: string } = {}) {
  const saved = process.env.SHARED_QDRANT_URL;
  if (opts.sharedUrl !== undefined) process.env.SHARED_QDRANT_URL = opts.sharedUrl;
  const prisma: any = { book: { findUnique: jest.fn().mockResolvedValue(opts.book === undefined ? LINKED : opts.book) } };
  const library: any = {
    usesHub: jest.fn().mockReturnValue(opts.hub ?? true),
    ownerName: jest.fn().mockReturnValue(opts.hub === false ? 'DigiClassroom' : 'PDLMS'),
  };
  const removed: string[] = [];
  const queue: any = {
    getJob: jest.fn(async (id: string) => {
      const state = opts.jobs?.[id];
      return state ? { getState: async () => state, remove: async () => void removed.push(id) } : null;
    }),
    add: jest.fn().mockResolvedValue({}),
  };
  return { controller: new SharedLibraryController(prisma, library, queue), prisma, library, queue, removed, restore: () => (process.env.SHARED_QDRANT_URL = saved) };
}

const req = { user: { id: 'admin-1' } };

describe('SharedLibraryController: status', () => {
  afterEach(() => {
    delete process.env.SHARED_QDRANT_URL;
  });

  it('tells the screens whose library it is and whether a book can be unlinked', () => {
    const hub = make({ hub: true, sharedUrl: 'http://q:6333' });
    expect(hub.controller.status()).toEqual({ configured: true, owner: 'PDLMS', canUnlink: true });
    const dcp = make({ hub: false, sharedUrl: 'http://q:6333' });
    expect(dcp.controller.status()).toEqual({ configured: true, owner: 'DigiClassroom', canUnlink: false });
  });

  it('says so when no shared library is set up', () => {
    const none = make({ hub: false, sharedUrl: '' });
    expect(none.controller.status()).toMatchObject({ configured: false, canUnlink: false });
  });
});

describe('SharedLibraryController: unlink-shared-work', () => {
  it('queues one unlink job per book, with the outcome and who asked', async () => {
    const { controller, queue } = make();
    await expect(controller.unlink(BOOK, { outcome: 'retire' }, req)).resolves.toEqual({ status: 'QUEUED', bookId: BOOK, outcome: 'retire' });
    expect(queue.add).toHaveBeenCalledWith(
      'unlink-work',
      { bookId: BOOK, outcome: 'retire', requestedBy: 'admin-1' },
      expect.objectContaining({ jobId: `unlink-${BOOK}`, attempts: 3 }),
    );
  });

  it('accepts both outcomes and nothing else', async () => {
    const { controller, queue } = make();
    await controller.unlink(BOOK, { outcome: 'keep' }, req);
    for (const outcome of [undefined, '', 'delete', 'RETIRE', 5 as any]) {
      await expect(controller.unlink(BOOK, { outcome } as any, req)).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(controller.unlink(BOOK, undefined as any, req)).rejects.toBeInstanceOf(BadRequestException);
    expect(queue.add).toHaveBeenCalledTimes(1);
  });

  it('is only available when the library is PDLMS’s hub, and queues nothing otherwise', async () => {
    const { controller, queue, prisma } = make({ hub: false });
    await expect(controller.unlink(BOOK, { outcome: 'keep' }, req)).rejects.toThrow(/only available when the library is PDLMS/);
    expect(queue.add).not.toHaveBeenCalled();
    expect(prisma.book.findUnique).not.toHaveBeenCalled();
  });

  it('refuses a book that does not exist, is in the Bin, or is not linked', async () => {
    for (const book of [null, { ...LINKED, deletedAt: new Date() }]) {
      const { controller } = make({ book });
      await expect(controller.unlink(BOOK, { outcome: 'keep' }, req)).rejects.toBeInstanceOf(NotFoundException);
    }
    const unlinked = make({ book: { ...LINKED, spineContentItemId: null } });
    await expect(unlinked.controller.unlink(BOOK, { outcome: 'keep' }, req)).rejects.toThrow(/not linked/);
    expect(unlinked.queue.add).not.toHaveBeenCalled();
  });

  it.each(['link', 'embed', 'unlink'])('refuses while a %s job is running for the book', async (kind) => {
    const { controller, queue } = make({ jobs: { [`${kind}-${BOOK}`]: 'active' } });
    await expect(controller.unlink(BOOK, { outcome: 'keep' }, req)).rejects.toBeInstanceOf(ConflictException);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('is not held up by jobs that have finished, and clears a settled unlink job so it cannot swallow the request', async () => {
    const { controller, queue, removed } = make({ jobs: { [`link-${BOOK}`]: 'completed', [`embed-${BOOK}`]: 'failed', [`unlink-${BOOK}`]: 'failed' } });
    await controller.unlink(BOOK, { outcome: 'keep' }, req);
    expect(removed).toEqual([`unlink-${BOOK}`]);
    expect(queue.add).toHaveBeenCalledTimes(1);
  });
});
