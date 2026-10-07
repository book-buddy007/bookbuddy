import { ForbiddenException } from '@nestjs/common';
import { bookRemovalBlocker } from './book-deletion-policy';
import { SuperAdminCatalogService } from './services/super-admin-catalog.service';

const SHARED = { id: 'b1', title: 'Understanding Society', spineContentItemId: 'work-9', deletedAt: new Date() };
const OWN = { id: 'b2', title: 'Staff Handbook', spineContentItemId: null, deletedAt: new Date() };

describe('bookRemovalBlocker', () => {
  it('allows every action on a book that lives only in Book Buddy', () => {
    for (const action of ['bin', 'purge', 'delete-file', 'replace-file'] as const) {
      expect(bookRemovalBlocker(OWN, action)).toBeNull();
    }
  });

  it('refuses every action on a shared-library book, pointing to the owning app and to Unlink for PDLMS hub libraries', () => {
    const reasons = (['bin', 'purge', 'delete-file', 'replace-file'] as const).map((a) => bookRemovalBlocker(SHARED, a));
    for (const r of reasons) {
      expect(r).toMatch(/belongs to the shared library, which PDLMS or DigiClassroom owns/);
      expect(r).toMatch(/Remove it in the app that owns it/);
      expect(r).toMatch(/Unlink from shared library/);
    }
    expect(reasons[0]).toMatch(/cannot be moved to the Bin/);
    expect(reasons[1]).toMatch(/cannot be permanently deleted/);
    expect(reasons[2]).toMatch(/cannot have its files deleted/);
    expect(reasons[3]).toMatch(/cannot have its files replaced/);
  });

  it('works without a title', () => {
    expect(bookRemovalBlocker({ spineContentItemId: 'w' }, 'bin')).toMatch(/^This book belongs/);
  });
});

/**
 * The refusal must hold at the service, where the destructive work happens, and must happen before
 * anything is touched: no storage call, no database write.
 */
describe('SuperAdminCatalogService on a shared-library book', () => {
  function make(book: any, opts: { format?: any; superseded?: any } = {}) {
    const prisma: any = {
      book: {
        findUnique: jest.fn().mockResolvedValue(book),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
      bookFormat: {
        findUnique: jest.fn().mockImplementation(async (args: any) =>
          args.where.id ? (opts.format ?? null) : (opts.superseded ?? null),
        ),
        upsert: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const s3: any = {
      deleteFile: jest.fn().mockResolvedValue(undefined),
      deleteFileOrThrow: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
    };
    const spine: any = { invalidate: jest.fn(), localIndex: jest.fn() };
    const service = new SuperAdminCatalogService(prisma, s3, {} as any, spine);
    return { service, prisma, s3, spine };
  }

  const untouched = (m: ReturnType<typeof make>) => {
    expect(m.prisma.book.update).not.toHaveBeenCalled();
    expect(m.prisma.book.delete).not.toHaveBeenCalled();
    expect(m.prisma.bookFormat.delete).not.toHaveBeenCalled();
    expect(m.prisma.bookFormat.upsert).not.toHaveBeenCalled();
    expect(m.s3.deleteFileOrThrow).not.toHaveBeenCalled();
    expect(m.s3.deleteMany).not.toHaveBeenCalled();
  };

  it('refuses to move it to the Bin', async () => {
    const m = make(SHARED);
    await expect(m.service.deleteBook('b1', 'admin-1')).rejects.toBeInstanceOf(ForbiddenException);
    untouched(m);
  });

  it('refuses to purge it, and deletes none of its files', async () => {
    const m = make({ ...SHARED, bookFormats: [{ metadata: { s3Key: 'global/books/b1/formats/pdf/1-a.pdf' }, fileUrl: null }], coverKey: 'global/books/b1/covers/front/c.png' });
    await expect(m.service.purgeBook('b1')).rejects.toThrow(/shared library/);
    untouched(m);
    expect(m.s3.deleteFile).not.toHaveBeenCalled();
  });

  it('refuses to delete one of its files', async () => {
    const m = make(SHARED, { format: { id: 'f1', bookId: 'b1', type: 'PDF', partIndex: 0, fileUrl: 'u', metadata: { s3Key: 'k' } } });
    await expect(m.service.deleteBookFormat('b1', 'f1')).rejects.toBeInstanceOf(ForbiddenException);
    untouched(m);
    expect(m.s3.deleteFile).not.toHaveBeenCalled();
  });

  it('refuses to replace one of its files, and removes only the object that was just uploaded', async () => {
    const m = make(SHARED, { superseded: { metadata: { s3Key: 'global/books/b1/formats/pdf/1-old.pdf' } } });
    await expect(
      m.service.confirmBookUpload('b1', { format: 'PDF', fileUrl: 'u', fileSize: 1, mimeType: 'application/pdf', s3Key: 'global/books/b1/formats/pdf/2-new.pdf' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(m.s3.deleteFile).toHaveBeenCalledTimes(1);
    expect(m.s3.deleteFile).toHaveBeenCalledWith('global/books/b1/formats/pdf/2-new.pdf');
    expect(m.prisma.bookFormat.upsert).not.toHaveBeenCalled();
  });

  it('still lets a file be added to an empty slot', async () => {
    const m = make(SHARED, { superseded: null });
    await m.service.confirmBookUpload('b1', { format: 'PDF', fileUrl: 'u', fileSize: 1, mimeType: 'application/pdf', s3Key: 'k-new' });
    expect(m.prisma.bookFormat.upsert).toHaveBeenCalledTimes(1);
    expect(m.s3.deleteFile).not.toHaveBeenCalled();
  });

  it("changes nothing for a book that lives only in Book Buddy", async () => {
    const m = make(OWN);
    await m.service.deleteBook('b2', 'admin-1');
    expect(m.prisma.book.update).toHaveBeenCalledTimes(1);

    const replaced = make(OWN, { superseded: { metadata: { s3Key: 'old' } } });
    await replaced.service.confirmBookUpload('b2', { format: 'PDF', fileUrl: 'u', fileSize: 1, mimeType: 'application/pdf', s3Key: 'new' });
    expect(replaced.s3.deleteFile).toHaveBeenCalledWith('old');
  });
});
