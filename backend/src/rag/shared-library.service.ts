import { Injectable, Logger } from '@nestjs/common';

export class SharedLibraryError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SharedLibraryError';
  }

  /** A refusal (4xx) will be refused again; only a network or server failure is worth retrying. */
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

export interface SharedWork {
  contentItemId: string;
  title: string;
  isbn: string | null;
  edition: string | null;
  lang: string | null;
  chunks: number;
  pageStart: number | null;
  pageEnd: number | null;
  linkedApps: string[];
}

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/**
 * Book Buddy's side of the conversation with DigiClassroom, which owns the shared library.
 *
 * Browse the public works already embedded there, and link a Book Buddy book to one so Varta
 * answers from those passages instead of Book Buddy embedding the book a second time.
 *
 * Every call carries the shared service secret, so no redirect is followed: a redirect would
 * hand the secret to whatever address it points at. The secret is never logged or returned.
 */
@Injectable()
export class SharedLibraryService {
  private readonly logger = new Logger(SharedLibraryService.name);

  /**
   * Where DigiClassroom's internal endpoints live: TRIO_API_BASE if set, otherwise the ingest
   * address without its last segment (TRIO_INGEST_URL is `<base>/trio-ingest`).
   */
  baseUrl(): string {
    const explicit = process.env.TRIO_API_BASE?.trim();
    if (explicit) return explicit.replace(/\/+$/, '');
    const ingest = process.env.TRIO_INGEST_URL?.trim();
    if (ingest) return ingest.replace(/\/+$/, '').replace(/\/trio-ingest$/, '');
    throw new SharedLibraryError(
      503,
      'The shared library is not configured: set TRIO_INGEST_URL (or TRIO_API_BASE) and TRIO_SERVICE_SECRET.',
    );
  }

  private secret(): string {
    const secret = process.env.TRIO_SERVICE_SECRET;
    if (!secret) {
      throw new SharedLibraryError(503, 'The shared library is not configured: TRIO_SERVICE_SECRET is not set.');
    }
    return secret;
  }

  private async call(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<any> {
    const url = `${this.baseUrl()}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: init.method,
        headers: {
          'X-Trio-Service-Secret': this.secret(),
          ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err: any) {
      if (err instanceof SharedLibraryError) throw err;
      this.logger.error(`Shared library request to ${path} failed: ${err?.message}`);
      throw new SharedLibraryError(0, 'Could not reach the shared library (DigiClassroom). Try again shortly.');
    }

    const text = await res.text().catch(() => '');
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      /* not JSON: report the status below */
    }

    if (res.ok && json.success) return json;

    if (res.status === 401) {
      throw new SharedLibraryError(502, 'DigiClassroom rejected the service secret. Check TRIO_SERVICE_SECRET on both apps.');
    }
    // DigiClassroom's own reason is written for humans (not public, ISBN mismatch, already linked).
    throw new SharedLibraryError(res.status || 502, json.error || `DigiClassroom answered HTTP ${res.status}.`);
  }

  async listWorks(query?: string, limit = 50): Promise<SharedWork[]> {
    const params = new URLSearchParams();
    if (query?.trim()) params.set('q', query.trim().slice(0, 120));
    params.set('limit', String(Math.min(Math.max(Math.trunc(limit) || 50, 1), 100)));
    const json = await this.call(`/trio-works?${params}`, { method: 'GET' });
    return Array.isArray(json.works) ? json.works : [];
  }

  /** Links this book to an existing public work. Safe to repeat. */
  async linkWork(input: { contentItemId: string; bookId: string; isbn?: string | null }): Promise<void> {
    if (!isUuid(input.contentItemId)) {
      throw new SharedLibraryError(400, 'That is not a valid work id.');
    }
    await this.call('/trio-link', {
      method: 'POST',
      body: {
        contentItemId: input.contentItemId,
        sourceApp: 'bookbuddy',
        sourceLocalId: input.bookId,
        isbn: input.isbn ?? null,
      },
    });
  }
}
