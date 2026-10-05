import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { NotFoundException } from '@nestjs/common';
import { FileService } from './file.service';

describe('FileService.getFileBuffer', () => {
  const s3 = { keyFromUrl: jest.fn(), getObjectBuffer: jest.fn() };
  const service = new FileService(s3 as any);
  const realFetch = global.fetch;

  beforeEach(() => {
    s3.keyFromUrl.mockReset().mockReturnValue(null);
    s3.getObjectBuffer.mockReset();
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('refuses an empty URL', async () => {
    await expect(service.getFileBuffer('')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reads our own storage through the credentialed API, never over plain HTTP', async () => {
    s3.keyFromUrl.mockReturnValue('global/books/b1/formats/ai-embed/1-ch.md');
    s3.getObjectBuffer.mockResolvedValue(Buffer.from('markdown'));
    global.fetch = jest.fn() as any;

    const out = await service.getFileBuffer('https://media.example.test/global/books/b1/formats/ai-embed/1-ch.md');

    expect(out.toString()).toBe('markdown');
    expect(s3.getObjectBuffer).toHaveBeenCalledWith('global/books/b1/formats/ai-embed/1-ch.md');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches a URL that is not ours directly, and reports an HTTP failure', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new TextEncoder().encode('hello').buffer })
      .mockResolvedValueOnce({ ok: false, status: 404 }) as any;

    expect((await service.getFileBuffer('https://other.test/a.md')).toString()).toBe('hello');
    await expect(service.getFileBuffer('https://other.test/missing.md')).rejects.toThrow(/HTTP 404/);
    expect(s3.getObjectBuffer).not.toHaveBeenCalled();
  });

  it('reads an absolute local path from disk', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bb-file-'));
    try {
      const path = join(dir, 'chapter.md');
      writeFileSync(path, 'on disk');
      // Windows drive paths and POSIX absolute paths both take this branch.
      expect((await service.getFileBuffer(path)).toString()).toBe('on disk');
      expect(s3.keyFromUrl).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('lets a storage failure through for the caller to explain', async () => {
    s3.keyFromUrl.mockReturnValue('k');
    s3.getObjectBuffer.mockRejectedValue(new Error('NoSuchKey'));
    await expect(service.getFileBuffer('https://media.example.test/k')).rejects.toThrow('NoSuchKey');
  });
});
