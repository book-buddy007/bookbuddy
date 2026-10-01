import { useQuery } from '@tanstack/react-query';
import { decryptReadUrl, DecryptedReadPayload } from '@/lib/utils/decrypt-read-url';

/**
 * useBookContent — Fetches and decrypts the presigned content URL.
 *
 * The backend now returns `{ encryptedUrl, expiresAt, format }` where
 * `encryptedUrl` is an AES-256-CBC ciphertext wrapping the real S3 URL.
 * This hook transparently decrypts it so consumer components (PdfShell,
 * EpubShell) receive a plain URL they can render directly.
 *
 * Fallback: If the response contains a plain `url` field (e.g. during
 * local development without DRM_SECRET_KEY), we use it as-is.
 *
 * Personal Library: When `personalFileId` is provided, fetches from
 * the personal-library endpoint instead of the books endpoint.
 * Personal files are never DRM-encrypted, so they always use the
 * plain `url` path.
 */

interface RawApiResponse {
  url?: string;           // Legacy / fallback (unencrypted)
  encryptedUrl?: string;  // DRM-encrypted payload
  expiresAt: string;
  format: string;
}

interface BookContentResult {
  url: string;
  expiresAt: string;
  format: string;
}

export function useBookContent(
  bookId: string | null,
  format: string | null,
  personalFileId?: string | null,
) {
  return useQuery<BookContentResult>({
    queryKey: ['book-content', bookId, format, personalFileId],
    queryFn: async () => {
      // Determine endpoint based on whether this is a personal file or institutional book
      const endpoint = personalFileId
        ? `/api/proxy/personal-library/${personalFileId}/read-url`
        : `/api/v1/books/${bookId}/read-url?format=${format}`;

      const res = await fetch(endpoint, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || `Failed to get content URL (${res.status})`);
      }

      const data: RawApiResponse = await res.json();

      // Personal files are never DRM-encrypted — skip decryption
      if (personalFileId) {
        if (data.url) {
          return { url: data.url, expiresAt: data.expiresAt, format: data.format };
        }
        throw new Error('No content URL in response');
      }

      // If the backend returned an encrypted payload, decrypt it
      if (data.encryptedUrl) {
        try {
          const decrypted: DecryptedReadPayload = decryptReadUrl(data.encryptedUrl);
          return {
            url: decrypted.url,
            expiresAt: decrypted.expiresAt,
            format: decrypted.format,
          };
        } catch (err) {
          console.error('[DRM] Decryption failed, falling back:', err);
          // If decryption fails and there's no plain URL, throw
          if (!data.url) {
            throw new Error('Content URL decryption failed');
          }
        }
      }

      // Fallback: plain URL from legacy / dev mode
      if (data.url) {
        return {
          url: data.url,
          expiresAt: data.expiresAt,
          format: data.format,
        };
      }

      throw new Error('No content URL in response');
    },
    enabled: !!(bookId || personalFileId) && !!format,
    staleTime: 45 * 60 * 1000,        // 45 min — mark stale before expiry
    refetchInterval: 45 * 60 * 1000,   // Auto-refresh every 45 min
    refetchIntervalInBackground: false, // Don't refresh when tab is hidden
    retry: 2,
  });
}
