import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Allowed MIME types per format
const FORMAT_MIME_ALLOWLIST: Record<string, string[]> = {
  pdf: ['application/pdf'],
  epub: ['application/epub+zip'],
  audiobook: [
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
  ],
  cover: ['image/jpeg', 'image/png', 'image/webp'], // NO svg — XSS risk
  sample: ['application/pdf'],
  physical: [],
  personal: ['application/pdf', 'application/epub+zip'],
  // Enriched markdown — the retrieval rendition, handed to the shared content
  // spine by the ingestion bridge. Browsers disagree wildly on what a `.md` is:
  // Chrome on Windows usually reports an empty string (the client then falls
  // back to the declared 'text/markdown'), some platforms say 'text/plain', and
  // a few send the octet-stream default. All three are the same file, so all
  // three are allowed rather than failing an upload over OS mime guessing.
  ai_embed: [
    'text/markdown',
    'text/x-markdown',
    'text/plain',
    'application/octet-stream',
  ],
};

/**
 * What is wrong with the storage settings, or null when they look usable. A deploy platform can
 * hand the app a placeholder instead of a real value (the production compose file once did),
 * and the AWS SDK then fails later with an obscure error; checking up front says what to fix.
 */
export function storageConfigProblem(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const endpoint = (env.S3_ENDPOINT ?? '').trim();
  if (!endpoint) return 'S3_ENDPOINT is not set';
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return 'S3_ENDPOINT must start with https:// (or http:// for local MinIO)';
    }
  } catch {
    return `S3_ENDPOINT is not a web address (got "${endpoint.slice(0, 60)}")`;
  }
  for (const name of ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
    const value = (env[name] ?? '').trim();
    if (!value) return `${name} is not set`;
    if (/^set\s+s3_/i.test(value)) return `${name} still holds a placeholder instead of a real value`;
  }
  return null;
}

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly cdnBaseUrl: string;
  private readonly configProblem: string | null;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('S3Service');

    // The app still starts (sign-in and everything else keep working); only file operations are
    // refused, with this message, until the settings are fixed.
    this.configProblem = storageConfigProblem();
    if (this.configProblem) {
      this.logger.error(`File storage is NOT configured: ${this.configProblem}`);
    }

    this.bucket = process.env.S3_BUCKET_NAME || 'book-buddy-media';
    this.cdnBaseUrl =
      process.env.CDN_BASE_URL || `${process.env.S3_ENDPOINT}/${this.bucket}`;

    this.client = new S3Client({
      region: process.env.S3_REGION ?? 'auto',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      // Cloudflare R2 rejects presigned requests built with virtual-hosted-style
      // addressing (bucket.account.r2.cloudflarestorage.com) — confirmed live,
      // that shape 403s while the identical request path-style
      // (account.r2.cloudflarestorage.com/bucket/...) succeeds. MinIO needs the
      // same. Neither provider this app targets wants virtual-hosted style, so
      // force path-style unconditionally rather than gate it on 'minio' only.
      forcePathStyle: true,
      // Disable automatic CRC32 checksum headers — they break Cloudflare R2
      // CORS preflight because R2 doesn't recognise the extra signed query
      // params (x-amz-checksum-crc32, x-amz-sdk-checksum-algorithm).
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  // ── NEW ROADMAP METHODS ──────────────────────────────────────────────────

  /** Throws a clear 503 instead of letting the SDK fail obscurely on bad settings. */
  private assertConfigured(): void {
    if (this.configProblem) {
      throw new ServiceUnavailableException(
        `File storage is not configured: ${this.configProblem}`,
      );
    }
  }

  async getPresignedUploadUrl(params: {
    key: string;
    mimeType: string;
    format: string;
    expiresInSeconds?: number;
  }): Promise<{
    uploadUrl: string;
    fields?: Record<string, string>;
    publicUrl: string;
    maxBytes?: number;
  }> {
    this.assertConfigured();
    const allowed = FORMAT_MIME_ALLOWLIST[params.format.toLowerCase()] ?? [];
    if (allowed.length > 0 && !allowed.includes(params.mimeType)) {
      throw new Error(
        `Invalid MIME type "${params.mimeType}" for format "${params.format}". Allowed: ${allowed.join(', ')}`,
      );
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.mimeType,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: params.expiresInSeconds ?? 300,
    });

    return {
      uploadUrl: url,
      publicUrl: `${this.cdnBaseUrl}/${params.key}`,
    };
  }

  async getPresignedDownloadUrl(params: {
    key: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    this.assertConfigured();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ResponseContentDisposition: 'inline',
      ResponseContentType: params.key.endsWith('.pdf')
        ? 'application/pdf'
        : params.key.endsWith('.epub')
          ? 'application/epub+zip'
          : undefined,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: params.expiresInSeconds ?? 3600,
    });
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      this.logger.log(`Deleted file from storage: ${key}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to delete file from storage: ${key}`,
        err.stack,
      );
    }
  }

  /**
   * Same delete, but a failure is reported instead of logged.
   *
   * `deleteFile` swallows its error on purpose — the callers that sweep up after
   * a deleted book treat storage cleanup as best-effort, and a stray object is
   * not worth failing the request over. That is exactly the wrong contract when
   * an operator is told a file was removed from the server: the row would vanish
   * from the dashboard while the object stayed in the bucket, and nothing in the
   * UI would ever say so. Use this wherever the deletion is the thing being
   * promised.
   */
  async deleteFileOrThrow(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted file from storage: ${key}`);
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) return;

    // AWS S3 DeleteObjects allows max 1000 keys per request
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
      const chunk = keys.slice(i, i + CHUNK_SIZE);
      try {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
              Objects: chunk.map((Key) => ({ Key })),
              Quiet: true,
            },
          }),
        );
        this.logger.log(`Bulk deleted ${chunk.length} files from storage`);
      } catch (err: any) {
        this.logger.error(`Failed to bulk delete files`, err.stack);
        throw err;
      }
    }
  }

  buildBookFileKey(params: {
    tenantId: string | null;
    bookId: string;
    format: string;
    filename: string;
  }): string {
    const tenant = params.tenantId ? `tenants/${params.tenantId}` : 'global';
    const sanitizedFilename = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${tenant}/books/${params.bookId}/formats/${params.format.toLowerCase()}/${Date.now()}-${sanitizedFilename}`;
  }

  buildCoverKey(params: {
    bookId: string;
    side: 'front' | 'back';
    filename: string;
  }): string {
    const sanitizedFilename = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `global/books/${params.bookId}/covers/${params.side}/${Date.now()}-${sanitizedFilename}`;
  }

  buildPersonalFileKey(userId: string, filename: string): string {
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `personal/${userId}/${uuidv4()}-${sanitized}`;
  }

  buildSampleKey(params: { bookId: string; filename: string }): string {
    const sanitizedFilename = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `global/books/${params.bookId}/sample/${Date.now()}-${sanitizedFilename}`;
  }

  // ── LEGACY METHODS (Required for backward compatibility) ──────────────────

  /** The public (custom-domain) URL for an object key. Only covers, samples and branding are
   *  reachable there; everything else is read through presigned links. */
  publicUrlFor(key: string): string {
    return `${this.cdnBaseUrl}/${key}`;
  }

  async generatePresignedUploadUrl(
    bucket: string,
    fileType: string,
    contentType: string,
    expiresIn = 3600,
    options: { keyPrefix?: string; extension?: string } = {},
  ): Promise<{ url: string; key: string }> {
    this.assertConfigured();
    try {
      const extension = options.extension ?? fileType.split('/').pop();
      const key = `${options.keyPrefix ?? 'uploads'}/${uuidv4()}.${extension}`;
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        // ServerSideEncryption stripped as R2 treats it differently by default,
        // and MinIO may reject AES256 if not configured
      });
      const url = await getSignedUrl(this.client, command, { expiresIn });
      this.logger.log(`Generated presigned URL for ${key} in bucket ${bucket}`);
      return { url, key };
    } catch (err: any) {
      this.logger.error(
        `Failed to generate presigned URL: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  async generatePresignedDownloadUrl(
    bucket: string,
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    this.assertConfigured();
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: 'inline',
        ResponseContentType: key.endsWith('.pdf')
          ? 'application/pdf'
          : key.endsWith('.epub')
            ? 'application/epub+zip'
            : undefined,
      });
      const url = await getSignedUrl(this.client, command, { expiresIn });
      this.logger.log(`Generated download URL for ${key} in bucket ${bucket}`);
      return url;
    } catch (err: any) {
      this.logger.error(
        `Failed to generate download URL: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      await this.client.send(command);
      this.logger.log(`Deleted ${key} from bucket ${bucket}`);
    } catch (err: any) {
      this.logger.error(`Failed to delete object: ${err.message}`, err.stack);
      throw err;
    }
  }
}
