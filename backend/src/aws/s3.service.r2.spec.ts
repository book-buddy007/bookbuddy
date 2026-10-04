import { ServiceUnavailableException } from '@nestjs/common';
import { S3Service, isPublicStorageKey, storageConfigProblem } from './s3.service';

/**
 * Production storage is Cloudflare R2 with TWO buckets (see docs/storage-r2.md):
 *   - private: book files, audio, personal uploads, join-request proofs. Never has a public domain.
 *   - public:  covers, samples, branding. The only bucket the public media domain points at.
 * Signing is done offline, so these tests check, without any network or credentials, the properties
 * the setup depends on.
 */
describe('S3Service on Cloudflare R2, two buckets', () => {
  const ENV = {
    S3_ENDPOINT: 'https://acct123.r2.cloudflarestorage.com',
    S3_REGION: 'auto',
    S3_ACCESS_KEY_ID: 'test-key-id',
    S3_SECRET_ACCESS_KEY: 'test-secret',
    S3_BUCKET_NAME: 'priv-bucket',
    S3_PUBLIC_BUCKET_NAME: 'pub-bucket',
    CDN_BASE_URL: 'https://media.example.test',
  };
  const saved: Record<string, string | undefined> = {};
  let service: S3Service;
  let logger: { setContext: jest.Mock; log: jest.Mock; error: jest.Mock; warn: jest.Mock };

  beforeAll(() => {
    for (const [k, v] of Object.entries(ENV)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }
    logger = { setContext: jest.fn(), log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    service = new S3Service({} as any, logger as any);
  });

  afterAll(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  const PRIVATE_KEYS = [
    'global/books/b1/formats/pdf/1-book.pdf',
    'tenants/t1/books/b1/formats/epub/1-book.epub',
    'global/books/b1/audio/s1/MALE/1-track.mp3',
    'personal/user-1/0b8f9c1e-1111-4222-8333-444455556666-notes.pdf',
    'join-proofs/user-1/0b8f9c1e-1111-4222-8333-444455556666.pdf',
    'uploads/0b8f9c1e-1111-4222-8333-444455556666.pdf',
  ];
  const PUBLIC_KEYS = [
    'global/books/b1/covers/front/1-c.png',
    'global/books/b1/covers/back/1-c.png',
    'global/books/b1/sample/1-s.pdf',
    'global/branding/inst-1/0b8f9c1e-1111-4222-8333-444455556666.png',
  ];

  describe('which bucket an object lives in', () => {
    it('sends covers, samples and branding to the public bucket', () => {
      for (const key of PUBLIC_KEYS) {
        expect(service.isPublicKey(key)).toBe(true);
        expect(service.bucketFor(key)).toBe('pub-bucket');
      }
    });

    it('sends everything else to the private bucket', () => {
      for (const key of PRIVATE_KEYS) {
        expect(service.isPublicKey(key)).toBe(false);
        expect(service.bucketFor(key)).toBe('priv-bucket');
      }
    });

    it('cannot be fooled by a filename or a look-alike path', () => {
      const hostile = ['../covers/x.pdf', 'a/covers/b.pdf', '/sample/y.pdf', 'branding/z.pdf', 'global/branding/../x'];
      for (const filename of hostile) {
        for (const tenantId of [null, 't1']) {
          for (const format of ['pdf', 'epub', 'audiobook']) {
            const key = service.buildBookFileKey({ tenantId, bookId: 'b1', format, filename });
            expect(isPublicStorageKey(key)).toBe(false);
          }
        }
        expect(isPublicStorageKey(service.buildPersonalFileKey('user-1', filename))).toBe(false);
      }
      // Look-alikes that must NOT be public.
      expect(isPublicStorageKey('tenants/t1/books/b1/covers/front/x.png')).toBe(false);
      expect(isPublicStorageKey('personal/u/global/branding/x.png')).toBe(false);
      expect(isPublicStorageKey('global/books/b1/formats/pdf/covers/x.pdf')).toBe(false);
      expect(isPublicStorageKey('global/books//covers/x.png')).toBe(false);
      expect(isPublicStorageKey('prefix/global/branding/x.png')).toBe(false);
    });

    it('builds cover, sample and branding keys that land in the public bucket', async () => {
      expect(service.bucketFor(service.buildCoverKey({ bookId: 'b1', side: 'front', filename: 'c.png' }))).toBe('pub-bucket');
      expect(service.bucketFor(service.buildCoverKey({ bookId: 'b1', side: 'back', filename: 'c.png' }))).toBe('pub-bucket');
      expect(service.bucketFor(service.buildSampleKey({ bookId: 'b1', filename: 's.pdf' }))).toBe('pub-bucket');

      const { key } = await service.generatePresignedUploadUrl('pub-bucket', 'logo', 'image/png', 3600, {
        keyPrefix: 'global/branding/inst-1',
        extension: 'png',
      });
      expect(key).toMatch(/^global\/branding\/inst-1\/[0-9a-f-]{36}\.png$/);
      expect(service.bucketFor(key)).toBe('pub-bucket');
    });

    it('keeps legacy uploads off the public bucket', async () => {
      const { key } = await service.generatePresignedUploadUrl('priv-bucket', 'application/pdf', 'application/pdf');
      expect(key).toMatch(/^uploads\/[0-9a-f-]{36}\.pdf$/);
      expect(service.bucketFor(key)).toBe('priv-bucket');
    });

    it('exposes the bucket names', () => {
      expect(service.bucketName).toBe('priv-bucket');
      expect(service.publicBucketName).toBe('pub-bucket');
    });
  });

  describe('signed links', () => {
    it('signs a book upload for the PRIVATE bucket on the R2 endpoint, path-style, region auto, no checksum params', async () => {
      const { uploadUrl } = await service.getPresignedUploadUrl({
        key: 'global/books/b1/formats/pdf/1-book.pdf',
        mimeType: 'application/pdf',
        format: 'pdf',
      });
      const url = new URL(uploadUrl);

      expect(url.origin).toBe('https://acct123.r2.cloudflarestorage.com');
      expect(url.pathname).toBe('/priv-bucket/global/books/b1/formats/pdf/1-book.pdf');
      expect(url.searchParams.get('X-Amz-Credential')).toContain('/auto/s3/aws4_request');
      expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
      expect(uploadUrl.toLowerCase()).not.toContain('checksum');
    });

    it('signs a cover upload for the PUBLIC bucket and returns its public URL on the media domain', async () => {
      const key = 'global/books/b1/covers/front/1-c.png';
      const { uploadUrl, publicUrl } = await service.getPresignedUploadUrl({
        key,
        mimeType: 'image/png',
        format: 'cover',
      });

      expect(new URL(uploadUrl).pathname).toBe(`/pub-bucket/${key}`);
      // No bucket segment: the custom domain is attached to the public bucket's root.
      expect(publicUrl).toBe(`https://media.example.test/${key}`);
    });

    it('signs downloads from the right bucket, inline, with the right content type', async () => {
      const book = new URL(await service.getPresignedDownloadUrl({ key: 'tenants/t1/books/b1/formats/epub/1-book.epub' }));
      expect(book.pathname.startsWith('/priv-bucket/')).toBe(true);
      expect(book.searchParams.get('response-content-disposition')).toBe('inline');
      expect(book.searchParams.get('response-content-type')).toBe('application/epub+zip');
      expect(book.toString().toLowerCase()).not.toContain('checksum');

      const sample = new URL(await service.getPresignedDownloadUrl({ key: 'global/books/b1/sample/1-s.pdf' }));
      expect(sample.pathname.startsWith('/pub-bucket/')).toBe(true);
    });

    it('rejects an upload whose MIME type does not match the declared format', async () => {
      await expect(
        service.getPresignedUploadUrl({ key: 'k', mimeType: 'text/html', format: 'pdf' }),
      ).rejects.toThrow(/Invalid MIME type/);
    });
  });

  describe('deletes go to the bucket that holds the object', () => {
    const send = () => {
      const fn = jest.fn().mockResolvedValue({});
      (service as any).client.send = fn;
      return fn;
    };

    it('deleteFile and deleteFileOrThrow pick the bucket by key', async () => {
      const fn = send();
      await service.deleteFile('global/books/b1/covers/front/1-c.png');
      await service.deleteFileOrThrow('global/books/b1/formats/pdf/1-book.pdf');

      expect(fn.mock.calls[0][0].input).toEqual({ Bucket: 'pub-bucket', Key: 'global/books/b1/covers/front/1-c.png' });
      expect(fn.mock.calls[1][0].input).toEqual({ Bucket: 'priv-bucket', Key: 'global/books/b1/formats/pdf/1-book.pdf' });
    });

    it('deleteMany splits a mixed list into one request per bucket', async () => {
      const fn = send();
      await service.deleteMany([...PRIVATE_KEYS, ...PUBLIC_KEYS]);

      const byBucket = Object.fromEntries(
        fn.mock.calls.map(([cmd]) => [cmd.input.Bucket, cmd.input.Delete.Objects.map((o: any) => o.Key)]),
      );
      expect(Object.keys(byBucket).sort()).toEqual(['priv-bucket', 'pub-bucket']);
      expect(byBucket['pub-bucket']).toEqual(PUBLIC_KEYS);
      expect(byBucket['priv-bucket']).toEqual(PRIVATE_KEYS);
    });

    it('deleteMany makes no request for an empty list', async () => {
      const fn = send();
      await service.deleteMany([]);
      expect(fn).not.toHaveBeenCalled();
    });
  });
});

describe('single-bucket mode (local MinIO)', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('keeps everything in one bucket when no public bucket is configured', () => {
    process.env.S3_ENDPOINT = 'http://localhost:9000';
    process.env.S3_ACCESS_KEY_ID = 'k';
    process.env.S3_SECRET_ACCESS_KEY = 's';
    process.env.S3_BUCKET_NAME = 'dev-bucket';
    delete process.env.S3_PUBLIC_BUCKET_NAME;
    process.env.STORAGE_PROVIDER = 'minio';
    const logger = { setContext: jest.fn(), log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    const service = new S3Service({} as any, logger as any);

    expect(service.bucketFor('global/books/b1/covers/front/c.png')).toBe('dev-bucket');
    expect(service.bucketFor('global/books/b1/formats/pdf/b.pdf')).toBe('dev-bucket');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns on R2 when public and private would share a bucket', () => {
    process.env.S3_ENDPOINT = 'https://acct123.r2.cloudflarestorage.com';
    process.env.S3_ACCESS_KEY_ID = 'k';
    process.env.S3_SECRET_ACCESS_KEY = 's';
    process.env.S3_BUCKET_NAME = 'only-bucket';
    delete process.env.S3_PUBLIC_BUCKET_NAME;
    process.env.STORAGE_PROVIDER = 'r2';
    const logger = { setContext: jest.fn(), log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    new S3Service({} as any, logger as any);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('share one bucket'));
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
