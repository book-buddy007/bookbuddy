import { ServiceUnavailableException } from '@nestjs/common';
import { S3Service, storageConfigProblem } from './s3.service';

/**
 * Production storage is Cloudflare R2 (see docs/storage-r2.md). Signing is done offline, so
 * these tests can check, without any network or credentials, the properties the setup depends on:
 *  - signed links use the R2 endpoint, path-style, with region "auto";
 *  - no checksum parameters, which break R2's CORS preflight;
 *  - covers, samples and branding are the ONLY keys under the public prefixes: everything else
 *    (book files, audio, personal uploads, join-request proofs) must never fall under them,
 *    because the Cloudflare rule that guards the public domain is written in those terms.
 */
describe('S3Service on Cloudflare R2', () => {
  const ENV = {
    S3_ENDPOINT: 'https://acct123.r2.cloudflarestorage.com',
    S3_REGION: 'auto',
    S3_ACCESS_KEY_ID: 'test-key-id',
    S3_SECRET_ACCESS_KEY: 'test-secret',
    S3_BUCKET_NAME: 'book-buddy-media',
    CDN_BASE_URL: 'https://media.example.test',
  };
  const saved: Record<string, string | undefined> = {};
  let service: S3Service;

  beforeAll(() => {
    for (const [k, v] of Object.entries(ENV)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }
    const logger = { setContext: jest.fn(), log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    service = new S3Service({} as any, logger as any);
  });

  afterAll(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  /** The same test the Cloudflare rule applies to the public domain. */
  const isPublicPath = (key: string) =>
    key.includes('/covers/') || key.includes('/sample/') || key.includes('/branding/');

  describe('signed links', () => {
    it('signs uploads for the R2 endpoint, path-style, with region auto and no checksum params', async () => {
      const { uploadUrl } = await service.getPresignedUploadUrl({
        key: 'global/books/b1/formats/pdf/1-book.pdf',
        mimeType: 'application/pdf',
        format: 'pdf',
      });
      const url = new URL(uploadUrl);

      expect(url.origin).toBe('https://acct123.r2.cloudflarestorage.com');
      expect(url.pathname).toBe('/book-buddy-media/global/books/b1/formats/pdf/1-book.pdf');
      expect(url.searchParams.get('X-Amz-Credential')).toContain('/auto/s3/aws4_request');
      expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
      expect(uploadUrl.toLowerCase()).not.toContain('checksum');
    });

    it('signs downloads as inline with the right content type, again with no checksum params', async () => {
      const link = await service.getPresignedDownloadUrl({
        key: 'tenants/t1/books/b1/formats/epub/1-book.epub',
      });
      const url = new URL(link);

      expect(url.origin).toBe('https://acct123.r2.cloudflarestorage.com');
      expect(url.searchParams.get('response-content-disposition')).toBe('inline');
      expect(url.searchParams.get('response-content-type')).toBe('application/epub+zip');
      expect(link.toLowerCase()).not.toContain('checksum');
    });

    it('rejects an upload whose MIME type does not match the declared format', async () => {
      await expect(
        service.getPresignedUploadUrl({ key: 'k', mimeType: 'text/html', format: 'pdf' }),
      ).rejects.toThrow(/Invalid MIME type/);
    });

    it('builds public URLs on the custom domain with no bucket segment', () => {
      expect(service.publicUrlFor('global/books/b1/covers/front/1-c.png')).toBe(
        'https://media.example.test/global/books/b1/covers/front/1-c.png',
      );
    });
  });

  describe('which objects are public', () => {
    const hostile = ['../covers/x.pdf', 'a/covers/b.pdf', '/sample/y.pdf', 'branding/z.pdf'];

    it('puts covers, samples and branding on public paths', async () => {
      expect(isPublicPath(service.buildCoverKey({ bookId: 'b1', side: 'front', filename: 'c.png' }))).toBe(true);
      expect(isPublicPath(service.buildCoverKey({ bookId: 'b1', side: 'back', filename: 'c.png' }))).toBe(true);
      expect(isPublicPath(service.buildSampleKey({ bookId: 'b1', filename: 's.pdf' }))).toBe(true);
    });

    it('keeps book files private whatever the uploaded filename says', () => {
      for (const filename of hostile) {
        for (const tenantId of [null, 't1']) {
          for (const format of ['pdf', 'epub', 'audiobook']) {
            const key = service.buildBookFileKey({ tenantId, bookId: 'b1', format, filename });
            expect(isPublicPath(key)).toBe(false);
          }
        }
      }
    });

    it('keeps personal uploads private whatever the uploaded filename says', () => {
      for (const filename of hostile) {
        expect(isPublicPath(service.buildPersonalFileKey('user-1', filename))).toBe(false);
      }
    });

    it('keeps legacy uploads and join-request proofs off the public paths', async () => {
      const { key } = await service.generatePresignedUploadUrl('book-buddy-media', 'application/pdf', 'application/pdf');
      expect(key).toMatch(/^uploads\/[0-9a-f-]{36}\.pdf$/);
      expect(isPublicPath(key)).toBe(false);
      expect(isPublicPath('join-proofs/user-1/0b8f9c1e-1111-4222-8333-444455556666.pdf')).toBe(false);
    });

    it('stores branding under global/branding/<institution>/ with the extension chosen by the caller', async () => {
      const { key } = await service.generatePresignedUploadUrl(
        'book-buddy-media',
        'logo',
        'image/png',
        3600,
        { keyPrefix: 'global/branding/inst-1', extension: 'png' },
      );
      expect(key).toMatch(/^global\/branding\/inst-1\/[0-9a-f-]{36}\.png$/);
      expect(isPublicPath(key)).toBe(true);
    });
  });
});

describe('storage configuration check', () => {
  const good = {
    S3_ENDPOINT: 'https://acct123.r2.cloudflarestorage.com',
    S3_ACCESS_KEY_ID: 'key-id',
    S3_SECRET_ACCESS_KEY: 'secret',
  };

  it('accepts a real R2 configuration and a local MinIO one', () => {
    expect(storageConfigProblem(good)).toBeNull();
    expect(storageConfigProblem({ ...good, S3_ENDPOINT: 'http://localhost:9000' })).toBeNull();
  });

  it('rejects the placeholder text a deploy platform once substituted for the endpoint', () => {
    const placeholder =
      'Set S3_ENDPOINT to your R2 endpoint, https://<account-id>.r2.cloudflarestorage.com';
    expect(storageConfigProblem({ ...good, S3_ENDPOINT: placeholder })).toMatch(/not a web address/);
  });

  it('rejects missing or placeholder values, and non-web schemes', () => {
    expect(storageConfigProblem({ ...good, S3_ENDPOINT: '' })).toMatch(/S3_ENDPOINT is not set/);
    expect(storageConfigProblem({ ...good, S3_ENDPOINT: 'ftp://x.test' })).toMatch(/https/);
    expect(storageConfigProblem({ ...good, S3_ACCESS_KEY_ID: '' })).toMatch(/S3_ACCESS_KEY_ID is not set/);
    expect(
      storageConfigProblem({ ...good, S3_SECRET_ACCESS_KEY: 'Set S3_SECRET_ACCESS_KEY to your R2 API token secret' }),
    ).toMatch(/placeholder/);
  });

  describe('S3Service with bad settings', () => {
    const saved = { ...process.env };
    afterEach(() => {
      process.env = { ...saved };
    });

    it('starts, logs what is wrong, and refuses file operations with a clear 503', async () => {
      process.env.S3_ENDPOINT = 'Set S3_ENDPOINT to your R2 endpoint';
      process.env.S3_ACCESS_KEY_ID = 'k';
      process.env.S3_SECRET_ACCESS_KEY = 's';
      const logger = { setContext: jest.fn(), log: jest.fn(), error: jest.fn(), warn: jest.fn() };
      const service = new S3Service({} as any, logger as any);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('File storage is NOT configured'));
      await expect(
        service.getPresignedUploadUrl({ key: 'k', mimeType: 'application/pdf', format: 'pdf' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(service.getPresignedDownloadUrl({ key: 'k' })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      await expect(
        service.generatePresignedUploadUrl('b', 'application/pdf', 'application/pdf'),
      ).rejects.toThrow(/File storage is not configured/);
    });
  });
});
