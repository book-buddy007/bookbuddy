import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * SecureLinksService — AES-256-CBC encryption for presigned content URLs.
 *
 * This service wraps presigned S3/R2 download URLs in an AES-256-CBC
 * ciphertext before they leave the backend.  The frontend decrypts
 * just-in-time before passing the URL to the PDF/EPUB viewer engine.
 *
 * Why AES-256-CBC?
 *  • Standard, well-audited algorithm available in Node's built-in `crypto`.
 *  • Zero external dependencies on the backend.
 *  • Compatible with `crypto-js` on the frontend for decryption.
 *
 * Threat model:
 *  The encryption key is shared between server and client, so this is
 *  obfuscation — not a cryptographic boundary.  Its purpose is to:
 *    1. Prevent casual extraction of presigned URLs from network logs.
 *    2. Make automated scraping significantly harder.
 *    3. Complement the real security layers: short-lived URLs, tier gating,
 *       and visible watermarking.
 */
@Injectable()
export class SecureLinksService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly logger = new Logger(SecureLinksService.name);

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>('DRM_SECRET_KEY');

    if (!rawKey || rawKey.length < 32) {
      this.logger.warn(
        'DRM_SECRET_KEY is missing or too short — using fallback key. ' +
          'Set a 32+ character hex string in your .env for production.',
      );
    }

    // Derive a 32-byte key.  If the env var is a hex string ≥ 64 chars,
    // use it directly; otherwise SHA-256 hash whatever we have.
    const keySource =
      rawKey || 'book-buddy-drm-fallback-key-change-me-in-production';
    if (/^[0-9a-f]{64}$/i.test(keySource)) {
      this.key = Buffer.from(keySource, 'hex');
    } else {
      this.key = crypto.createHash('sha256').update(keySource).digest();
    }
  }

  /**
   * Encrypt a JSON-serialisable payload into a Base64 string.
   *
   * Output format: `<iv-hex>:<ciphertext-base64>`
   * The IV is randomly generated per call for semantic security.
   */
  encryptPayload(payload: Record<string, unknown>): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    const json = JSON.stringify(payload);
    let encrypted = cipher.update(json, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Pack IV and ciphertext together so the client can split them
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a payload previously encrypted by `encryptPayload`.
   * Used internally for testing / validation.
   */
  decryptPayload<T = Record<string, unknown>>(encrypted: string): T {
    const [ivHex, ciphertext] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted) as T;
  }
}
