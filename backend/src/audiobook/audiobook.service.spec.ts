import { HttpException, NotFoundException } from '@nestjs/common';
import { AudiobookService } from './audiobook.service';
import { SharedLibraryError } from '../rag/shared-library.error';

const WORK = '5f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f';

function make(track: any, opts: { denied?: Error } = {}) {
  const prisma: any = { audioTrack: { findFirst: jest.fn().mockResolvedValue(track) } };
  const bookAccess: any = {
    assertCanReadSection: opts.denied ? jest.fn().mockRejectedValue(opts.denied) : jest.fn().mockResolvedValue({}),
  };
  const s3: any = { getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://r2.bb.test/own?sig=1') };
  const hubFiles: any = {
    audioLink: jest.fn().mockResolvedValue({ url: 'https://r2.pdlms.test/signed?sig=2', expiresAt: '2026-10-10T10:05:00Z' }),
  };
  const service = new AudiobookService(prisma, {} as any, {} as any, s3, bookAccess, hubFiles);
  return { service, prisma, bookAccess, s3, hubFiles };
}

const ownTrack = { fileUrl: 'global/books/b1/audio/s1-male.mp3', hubFileId: null, section: { chapter: { book: { hubWorkId: null } } } };
const hubTrack = { fileUrl: '', hubFileId: 'hub-track-1', section: { chapter: { book: { hubWorkId: WORK } } } };

describe('AudiobookService.getPresignedUrl', () => {
  it('presigns a track the book holds itself from its own storage, as before', async () => {
    const { service, s3, hubFiles } = make(ownTrack);
    await expect(service.getPresignedUrl('u1', 's1', 'MALE')).resolves.toEqual({ url: 'https://r2.bb.test/own?sig=1' });
    expect(s3.getPresignedDownloadUrl).toHaveBeenCalledWith({ key: ownTrack.fileUrl, expiresInSeconds: 900 });
    expect(hubFiles.audioLink).not.toHaveBeenCalled();
  });

  it('asks the hub for a fresh link for a hub track, by the work id and the track’s hub id, and says when it ends', async () => {
    const { service, s3, hubFiles } = make(hubTrack);
    await expect(service.getPresignedUrl('u1', 's1', 'FEMALE')).resolves.toEqual({
      url: 'https://r2.pdlms.test/signed?sig=2',
      expiresAt: '2026-10-10T10:05:00Z',
    });
    expect(hubFiles.audioLink).toHaveBeenCalledWith(WORK, 'hub-track-1');
    expect(s3.getPresignedDownloadUrl).not.toHaveBeenCalled();
  });

  it('decides who may listen BEFORE the hub is asked for anything', async () => {
    const denied = new NotFoundException('nope');
    const { service, hubFiles, prisma } = make(hubTrack, { denied });
    await expect(service.getPresignedUrl('u1', 's1', 'MALE')).rejects.toBe(denied);
    expect(prisma.audioTrack.findFirst).not.toHaveBeenCalled();
    expect(hubFiles.audioLink).not.toHaveBeenCalled();
  });

  it('is a 404 when there is no track of that gender', async () => {
    await expect(make(null).service.getPresignedUrl('u1', 's1', 'MALE')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('is a 404, and asks nobody, for a hub track whose book is no longer linked', async () => {
    const orphan = { ...hubTrack, section: { chapter: { book: { hubWorkId: null } } } };
    const { service, hubFiles } = make(orphan);
    await expect(service.getPresignedUrl('u1', 's1', 'MALE')).rejects.toBeInstanceOf(NotFoundException);
    expect(hubFiles.audioLink).not.toHaveBeenCalled();
  });

  it('turns the hub’s refusal into an HTTP error with its reason, and an unreachable hub into a 502', async () => {
    const refused = make(hubTrack);
    refused.hubFiles.audioLink.mockRejectedValue(new SharedLibraryError(403, 'The library does not share the files of this copy-protected book.'));
    const a: any = await refused.service.getPresignedUrl('u1', 's1', 'MALE').catch((e) => e);
    expect(a).toBeInstanceOf(HttpException);
    expect(a.getStatus()).toBe(403);

    const down = make(hubTrack);
    down.hubFiles.audioLink.mockRejectedValue(new SharedLibraryError(0, 'Could not reach the library hub (PDLMS).'));
    const b: any = await down.service.getPresignedUrl('u1', 's1', 'MALE').catch((e) => e);
    expect(b.getStatus()).toBe(502);
  });
});
