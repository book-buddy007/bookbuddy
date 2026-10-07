import { Injectable, Logger } from '@nestjs/common';
import { SharedLibraryError } from './shared-library.error';
import { HubClientService, HubWorkSummary } from './hub-client.service';

// Re-exported: callers have always imported it from here.
export { SharedLibraryError };

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

/** A hub work in the shape the catalogue screens already understand. */
export function sharedWorkFromHub(w: HubWorkSummary): SharedWork {
  return {
    contentItemId: w.id,
    title: w.title,
    isbn: w.isbn,
    edition: null,
    lang: w.language,
    chunks: w.passageCount,
    pageStart: null,
    pageEnd: w.pages,
    linkedApps: [],
  };
}

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/**
 * Book Buddy's side of the conversation with the shared library.
 *
 * Two owners are supported. When HUB_URL and HUB_SECRET are set, the library is PDLMS's hub
 * (HubClientService): one secret for this app, books, files and manifests, and PDLMS's own index.
 * Otherwise it is DigiClassroom's older internal endpoints, below, exactly as before. The choice is
 * made per call from the configuration, so nothing is half-switched.
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

  constructor(private readonly hub: HubClientService) {}

  /** True when the shared library is PDLMS's hub. */
  usesHub(): boolean {
    return this.hub.enabled();
  }

  /** Who owns the library, in words for the admin screens. */
  ownerName(): 'PDLMS' | 'DigiClassroom' {
    return this.usesHub() ? 'PDLMS' : 'DigiClassroom';
  }

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
    if (this.usesHub()) {
      // Only works with embedded passages: linking exists to reuse them. A work the hub can serve
      // files for but has not embedded is not a candidate here.
      const { items } = await this.hub.listWorks({ q: query, limit: Math.min(Math.max(Math.trunc(limit) || 50, 1), 50) });
      return items.filter((w) => w.searchable).map(sharedWorkFromHub);
    }
    const params = new URLSearchParams();
    if (query?.trim()) params.set('q', query.trim().slice(0, 120));
    params.set('limit', String(Math.min(Math.max(Math.trunc(limit) || 50, 1), 100)));
    const json = await this.call(`/trio-works?${params}`, { method: 'GET' });
    return Array.isArray(json.works) ? json.works : [];
  }

  /**
   * One public work, confirmed by DigiClassroom (it must exist and be public). Used before Book
   * Buddy creates a record for it, so a typo or a restricted work is refused up front.
   *
   * Asks for the single work by id; if DigiClassroom has not been updated to understand that, it
   * answers with its list instead, and the work is picked out of that, never assumed.
   */
  async getWork(contentItemId: string): Promise<SharedWork> {
    if (!isUuid(contentItemId)) {
      throw new SharedLibraryError(400, 'That is not a valid work id.');
    }
    if (this.usesHub()) {
      const work = await this.hub.getWork(contentItemId).catch((err) => {
        if (err instanceof SharedLibraryError && err.status === 404) {
          throw new SharedLibraryError(404, 'That work is not in the shared library, or it has not been shared with Book Buddy.');
        }
        throw err;
      });
      if (!work.searchable) {
        throw new SharedLibraryError(409, 'That work has no embedded passages in the shared library yet, so there is nothing to link to.');
      }
      return sharedWorkFromHub(work);
    }
    const json = await this.call(`/trio-works?id=${encodeURIComponent(contentItemId)}&limit=100`, { method: 'GET' });
    const works: SharedWork[] = Array.isArray(json.works) ? json.works : [];
    const work = works.find((w) => w.contentItemId === contentItemId);
    if (!work) {
      throw new SharedLibraryError(404, 'That work is not in the shared library, or it is not public.');
    }
    return work;
  }

  /** Links this book to an existing public work. Safe to repeat. */
  async linkWork(input: { contentItemId: string; bookId: string; isbn?: string | null }): Promise<void> {
    if (!isUuid(input.contentItemId)) {
      throw new SharedLibraryError(400, 'That is not a valid work id.');
    }
    if (this.usesHub()) {
      await this.hub.linkWork(input.contentItemId, input.bookId, input.isbn);
      return;
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
