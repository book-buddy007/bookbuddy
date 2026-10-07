import { HttpException, NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service';
import { SharedLibraryError } from '../rag/shared-library.error';

const WORK = '5f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f';
const HUB_URL = 'https://r2.pdlms.test/signed?sig=abc';

function make(opts: { format?: any; drm?: boolean; hubError?: Error } = {}) {
  const prisma: any = { bookFormat: { findFirst: jest.fn().mockResolvedValue(opts.format ?? null) } };
  const s3: any = { getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://own.test/presigned') };
  const secureLinks: any = { encryptPayload: jest.fn((p: any) => `enc(${p.url})`) };
  const bookAccess: any = {
    assertCanRead: jest.fn().mockResolvedValue({ id: 'book-1', tenantId: null, accessTier: 'FREE', drmProtected: !!opts.drm }),
  };
  const hubFiles: any = {
    readLink: opts.hubError
      ? jest.fn().mockRejectedValue(opts.hubError)
      : jest.fn().mockResolvedValue({ url: HUB_URL, expiresAt: '2026-10-07T10:05:00Z' }),
  };
  return { service: new BooksService(prisma, s3, secureLinks, bookAccess, hubFiles), prisma, s3, secureLinks, bookAccess, hubFiles };
}

const hubRow = (over: Record<string, unknown> = {}) => ({
  type: 'PDF',
  fileUrl: null,
  metadata: { hub: { workId: WORK, fileId: 'f-pdf', version: 'v' } },
  ...over,
});

describe('BooksService.getReadUrl for a book whose files live in the library hub', () => {
  it('checks who may read BEFORE asking the hub for anything', async () => {
    const { service, bookAccess, hubFiles } = make({ format: hubRow() });
    bookAccess.assertCanRead.mockRejectedValue(new HttpException('no', 403));
    await expect(service.getReadUrl('u1', 'book-1', 'pdf')).rejects.toMatchObject({ status: 403 });
    expect(hubFiles.readLink).not.toHaveBeenCalled();
  });

  it('streams: asks the hub for a fresh link and returns it in the usual shape, signing nothing itself', async () => {
    const { service, s3, hubFiles } = make({ format: hubRow() });
    const out = await service.getReadUrl('u1', 'book-1', 'pdf');
    expect(hubFiles.readLink).toHaveBeenCalledWith(WORK, 'pdf');
    expect(out).toEqual({ url: HUB_URL, expiresAt: '2026-10-07T10:05:00Z', format: 'pdf' });
    expect(s3.getPresignedDownloadUrl).not.toHaveBeenCalled();
  });

  it('asks for the EPUB when the EPUB is read', async () => {
    const { service, hubFiles } = make({ format: hubRow({ type: 'EPUB' }) });
    await service.getReadUrl('u1', 'book-1', 'epub');
    expect(hubFiles.readLink).toHaveBeenCalledWith(WORK, 'epub');
  });

  it('keeps the DRM wrapping for a protected book', async () => {
    const { service, secureLinks } = make({ format: hubRow(), drm: true });
    const out: any = await service.getReadUrl('u1', 'book-1', 'pdf');
    expect(secureLinks.encryptPayload).toHaveBeenCalledWith({ url: HUB_URL, expiresAt: '2026-10-07T10:05:00Z', format: 'pdf' });
    expect(out).toEqual({ encryptedUrl: `enc(${HUB_URL})`, format: 'pdf' });
  });

  it('fails the read, with the hub’s reason, when the hub cannot answer: there is no other copy', async () => {
    for (const [status, expected] of [[0, 502], [404, 404], [403, 403], [503, 503], [429, 429]] as const) {
      const { service, s3 } = make({ format: hubRow(), hubError: new SharedLibraryError(status, 'reason') });
      const err: any = await service.getReadUrl('u1', 'book-1', 'pdf').catch((e) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(expected);
      expect(err.getResponse()).toEqual({ message: 'reason' });
      expect(s3.getPresignedDownloadUrl).not.toHaveBeenCalled();
    }
  });

  it('lets an unexpected error through rather than hiding it', async () => {
    const { service } = make({ format: hubRow(), hubError: new TypeError('bug') });
    await expect(service.getReadUrl('u1', 'book-1', 'pdf')).rejects.toBeInstanceOf(TypeError);
  });

  it('does not stream audiobooks: only PDF and EPUB come from the hub', async () => {
    const { service, hubFiles } = make({ format: hubRow({ type: 'AUDIOBOOK' }) });
    await expect(service.getReadUrl('u1', 'book-1', 'audiobook')).rejects.toBeInstanceOf(NotFoundException);
    expect(hubFiles.readLink).not.toHaveBeenCalled();
  });
});

describe('BooksService.getReadUrl for Book Buddy’s own files (unchanged)', () => {
  it('presigns the book’s own file and never calls the hub', async () => {
    const { service, s3, hubFiles } = make({
      format: { type: 'PDF', fileUrl: 'https://cdn.test/global/books/b1/formats/pdf/1-a.pdf', metadata: null },
    });
    const out = await service.getReadUrl('u1', 'book-1', 'pdf');
    expect(s3.getPresignedDownloadUrl).toHaveBeenCalledWith({ key: 'global/books/b1/formats/pdf/1-a.pdf', expiresInSeconds: 300 });
    expect(out).toMatchObject({ url: 'https://own.test/presigned', format: 'pdf' });
    expect(hubFiles.readLink).not.toHaveBeenCalled();
  });

  it('an own file wins even when the row still carries a hub marker', async () => {
    const { service, s3, hubFiles } = make({
      format: { type: 'PDF', fileUrl: 'https://cdn.test/global/books/b1/formats/pdf/1-a.pdf', metadata: { hub: { workId: WORK } } },
    });
    await service.getReadUrl('u1', 'book-1', 'pdf');
    expect(s3.getPresignedDownloadUrl).toHaveBeenCalled();
    expect(hubFiles.readLink).not.toHaveBeenCalled();
  });

  it('still says there is no file when there is neither a file nor a hub marker', async () => {
    for (const format of [null, { type: 'PDF', fileUrl: null, metadata: null }, { type: 'PDF', fileUrl: null, metadata: { s3Key: 'k' } }]) {
      const { service, hubFiles } = make({ format });
      await expect(service.getReadUrl('u1', 'book-1', 'pdf')).rejects.toBeInstanceOf(NotFoundException);
      expect(hubFiles.readLink).not.toHaveBeenCalled();
    }
  });
});
