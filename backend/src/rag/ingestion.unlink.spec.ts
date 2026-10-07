import { UnrecoverableError } from 'bullmq';
import { IngestionProcessor } from './ingestion.processor';
import { SharedLibraryError } from './shared-library.error';

const WORK = '5f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f';

const hubRow = (id: string, type = 'PDF') => ({ id, type, fileUrl: null, metadata: { hub: { workId: WORK, fileId: `f-${id}`, version: 'v' } } });
const ownRow = (id: string, type = 'PDF') => ({ id, type, fileUrl: `https://cdn.test/${id}.pdf`, metadata: { s3Key: id } });

function setup(opts: { book?: any; formats?: any[]; hubResult?: boolean; hubError?: Error; txError?: Error } = {}) {
  const order: string[] = [];
  const prisma: any = {
    book: {
      findUnique: jest.fn().mockResolvedValue(
        opts.book === undefined
          ? { id: 'book-1', title: 'Understanding Society', spineContentItemId: WORK, deletedAt: null }
          : opts.book,
      ),
      update: jest.fn((a: any) => ({ op: 'book.update', a })),
    },
    bookEmbeddingStatus: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      upsert: jest.fn((a: any) => ({ op: 'status.upsert', a })),
    },
    bookFormat: {
      findMany: jest.fn().mockResolvedValue(opts.formats ?? [hubRow('f1', 'PDF'), hubRow('f2', 'EPUB')]),
      deleteMany: jest.fn((a: any) => ({ op: 'format.deleteMany', a })),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(async (ops: any[]) => {
      order.push('transaction');
      if (opts.txError) throw opts.txError;
      return ops;
    }),
  };
  const sharedLibrary: any = {
    unlinkWork: opts.hubError
      ? jest.fn().mockImplementation(async () => {
          order.push('hub');
          throw opts.hubError;
        })
      : jest.fn().mockImplementation(async () => {
          order.push('hub');
          return opts.hubResult ?? true;
        }),
  };
  const contentSpine: any = { invalidate: jest.fn() };
  const hubFiles: any = { forget: jest.fn() };
  const processor = new IngestionProcessor(prisma, {} as any, contentSpine, {} as any, {} as any, {} as any, sharedLibrary, { add: jest.fn() } as any, hubFiles);
  const job = (outcome: 'retire' | 'keep' = 'keep', requestedBy: string | null = 'admin-1'): any => ({
    name: 'unlink-work',
    data: { bookId: 'book-1', outcome, requestedBy },
    updateProgress: jest.fn().mockResolvedValue(undefined),
  });
  return { processor, prisma, sharedLibrary, contentSpine, hubFiles, job, order };
}

const bookUpdate = (s: ReturnType<typeof setup>) => s.prisma.book.update.mock.calls[0][0];

describe('IngestionProcessor: unlink-work', () => {
  it('tells the hub FIRST, then changes the book', async () => {
    const s = setup();
    await s.processor.process(s.job());
    expect(s.sharedLibrary.unlinkWork).toHaveBeenCalledWith({ contentItemId: WORK, bookId: 'book-1' });
    expect(s.order).toEqual(['hub', 'transaction']);
  });

  it('changes nothing locally when the hub call fails, records why, and lets the job retry', async () => {
    const s = setup({ hubError: new SharedLibraryError(0, 'Could not reach the library hub') });
    await expect(s.processor.process(s.job())).rejects.toMatchObject({ status: 0 });
    expect(s.prisma.$transaction).not.toHaveBeenCalled();
    expect(s.prisma.bookEmbeddingStatus.updateMany).toHaveBeenLastCalledWith({ where: { bookId: 'book-1' }, data: { errorMessage: 'Could not reach the library hub' } });
    expect(s.contentSpine.invalidate).not.toHaveBeenCalled();
  });

  it('does not retry a refusal from the hub (a mixed-up record), and changes nothing', async () => {
    const s = setup({ hubError: new SharedLibraryError(409, 'This record is linked to a different work') });
    await expect(s.processor.process(s.job())).rejects.toBeInstanceOf(UnrecoverableError);
    expect(s.prisma.$transaction).not.toHaveBeenCalled();
    expect(s.prisma.book.update).not.toHaveBeenCalled();
  });

  it('accepts "there was no link to remove" as success: the hub may already have let go', async () => {
    const s = setup({ hubResult: false });
    await s.processor.process(s.job());
    expect(s.prisma.$transaction).toHaveBeenCalled();
    expect(s.prisma.auditLog.create.mock.calls[0][0].data.metadata.hub).toBe('none');
  });

  describe('detaching the book (outcome keep)', () => {
    it('clears the link and the ready state, and removes only the hub marker rows', async () => {
      const s = setup({ formats: [hubRow('f1', 'PDF'), ownRow('own-epub', 'EPUB')] });
      await s.processor.process(s.job('keep'));
      expect(bookUpdate(s).data).toMatchObject({ spineContentItemId: null, vectorCollectionId: null, embeddingStatus: 'NONE', embeddingStartedAt: null });
      expect(bookUpdate(s).data).not.toHaveProperty('deletedAt');
      expect(s.prisma.bookFormat.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['f1'] } } });
      expect(s.prisma.bookEmbeddingStatus.upsert.mock.calls[0][0]).toMatchObject({
        where: { bookId: 'book-1' },
        update: { status: 'NONE', totalChunks: 0, embeddedChunks: 0, errorMessage: null },
      });
    });

    it('stops borrowing when no readable file is left, and leaves it alone when the book has its own', async () => {
      const none = setup();
      await none.processor.process(none.job('keep'));
      expect(bookUpdate(none).data.available).toBe(false);

      const own = setup({ formats: [hubRow('f1'), ownRow('own')] });
      await own.processor.process(own.job('keep'));
      expect(bookUpdate(own).data).not.toHaveProperty('available');
    });

    it('never touches the book’s citation map, cover, learner data or anything at the hub beyond its own link', async () => {
      const s = setup();
      expect(Object.keys(s.prisma)).toEqual(['book', 'bookEmbeddingStatus', 'bookFormat', 'auditLog', '$transaction']);
      await s.processor.process(s.job('keep'));
      expect(bookUpdate(s).data).not.toHaveProperty('coverUrl');
      expect(bookUpdate(s).data).not.toHaveProperty('coverKey');
    });
  });

  describe('retiring the book (outcome retire)', () => {
    it('unlinks and moves it to the Bin in the SAME write, recording who did it', async () => {
      const s = setup();
      await s.processor.process(s.job('retire', 'admin-7'));
      expect(s.prisma.book.update).toHaveBeenCalledTimes(1);
      expect(bookUpdate(s).data).toMatchObject({ spineContentItemId: null, embeddingStatus: 'NONE', deletedBy: 'admin-7' });
      expect(bookUpdate(s).data.deletedAt).toBeInstanceOf(Date);
      expect(bookUpdate(s).data).not.toHaveProperty('available');
    });

    it('keeps the original binning date of a book that was already in the Bin', async () => {
      const when = new Date('2026-01-01');
      const s = setup({ book: { id: 'book-1', title: 'T', spineContentItemId: WORK, deletedAt: when } });
      await s.processor.process(s.job('retire'));
      expect(bookUpdate(s).data.deletedAt).toBe(when);
    });
  });

  it('is safe to run again: a book already detached skips the hub and still finishes', async () => {
    const s = setup({ book: { id: 'book-1', title: 'T', spineContentItemId: null, deletedAt: null }, formats: [] });
    await s.processor.process(s.job('retire'));
    expect(s.sharedLibrary.unlinkWork).not.toHaveBeenCalled();
    expect(bookUpdate(s).data.deletedAt).toBeInstanceOf(Date);
    expect(s.prisma.auditLog.create.mock.calls[0][0].data.metadata.hub).toBe('skipped');
  });

  it('after the hub answered but the local write failed, fails (so it retries) with the reason recorded', async () => {
    const s = setup({ txError: new Error('db down') });
    await expect(s.processor.process(s.job())).rejects.toThrow('db down');
    expect(s.sharedLibrary.unlinkWork).toHaveBeenCalledTimes(1);
    expect(s.prisma.bookEmbeddingStatus.updateMany).toHaveBeenLastCalledWith({ where: { bookId: 'book-1' }, data: { errorMessage: 'db down' } });
    expect(s.contentSpine.invalidate).not.toHaveBeenCalled();
  });

  it('forgets what it knew of the book and the work, so nothing stale is served', async () => {
    const s = setup();
    await s.processor.process(s.job());
    expect(s.contentSpine.invalidate).toHaveBeenCalledWith('book-1');
    expect(s.hubFiles.forget).toHaveBeenCalledWith(WORK);
  });

  it('writes an audit record of who, which work, which outcome and what the hub said', async () => {
    const s = setup({ formats: [hubRow('f1'), hubRow('f2', 'EPUB'), ownRow('x', 'PDF')] });
    await s.processor.process(s.job('retire', 'admin-1'));
    expect(s.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: 'SHARED_LIBRARY_UNLINK',
        entityType: 'book',
        entityId: 'book-1',
        userId: 'admin-1',
        metadata: { workId: WORK, outcome: 'retire', hub: 'removed', hubFilesRemoved: 2, keptOwnFiles: true },
      },
    });
  });

  it('still finishes when the audit record cannot be written', async () => {
    const s = setup();
    s.prisma.auditLog.create.mockRejectedValue(new Error('no such user'));
    const job = s.job();
    await expect(s.processor.process(job)).resolves.toBeUndefined();
    expect(job.updateProgress).toHaveBeenLastCalledWith(100);
  });

  it('clears an old error when it starts, and skips quietly when the book is gone', async () => {
    const s = setup();
    await s.processor.process(s.job());
    expect(s.prisma.bookEmbeddingStatus.updateMany.mock.calls[0][0]).toEqual({ where: { bookId: 'book-1' }, data: { errorMessage: null } });

    const gone = setup({ book: null });
    await gone.processor.process(gone.job());
    expect(gone.sharedLibrary.unlinkWork).not.toHaveBeenCalled();
  });
});
