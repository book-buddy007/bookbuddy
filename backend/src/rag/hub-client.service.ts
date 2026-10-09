import { Injectable, Logger } from '@nestjs/common';
import { SharedLibraryError } from './shared-library.error';

/** What the hub lists for a work. No passage text, storage key or URL ever appears in it. */
export interface HubWorkSummary {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  language: string | null;
  publisher: string | null;
  publishYear: number | null;
  pages: number | null;
  hasCover: boolean;
  formats: string[];
  searchable: boolean;
  passageCount: number;
}

export interface HubFile {
  fileId: string;
  kind: 'pdf' | 'epub' | 'cover' | 'back-cover' | 'audio';
  mimeType: string;
  sizeBytes: number | null;
  version: string;
}

export interface HubAudioTrack extends HubFile {
  kind: 'audio';
  gender: string;
  durationSeconds: number;
}

export interface HubAudioChapter {
  chapterId: string;
  title: string;
  sortOrder: number;
  sections: Array<{
    sectionId: string;
    title: string;
    sortOrder: number;
    type: string;
    durationSeconds: number | null;
    tracks: HubAudioTrack[];
  }>;
}

export interface HubManifest {
  revision: string;
  files: HubFile[];
  filesWithheld: 'drm' | null;
  audio?: HubAudioChapter[];
  chapters: Array<{ title: string; firstPage: number | null; lastPage: number | null; passages: number }>;
  pages: number | null;
}

export interface HubWork extends HubWorkSummary {
  description: string | null;
  /**
   * Where the work's passages are in the shared index, and the id they carry there. That id is the
   * embedder's (DigiClassroom's `content_item_id` in trio mode), NOT `id`. Null when they cannot be read.
   */
  index: { collection: string; contentItemId: string } | null;
  manifest: HubManifest;
}

export interface HubFileLink {
  url: string;
  expiresAt: string;
  mimeType: string;
  sizeBytes: number | null;
  version: string;
}

const APP_ID = /^[a-z0-9][a-z0-9_-]{1,31}$/;

/**
 * Book Buddy's client of the library hub that PDLMS runs (`/api/hub`, see PDLMS docs/library-hub.md).
 *
 *   HUB_URL     the hub's origin, e.g. https://api.pdlms.vinstitution.com   (empty = hub not used)
 *   HUB_SECRET  this app's own secret, made with PDLMS backend/scripts/hub-client-secret.js
 *   HUB_APP_ID  the id PDLMS holds this secret under (default "bookbuddy")
 *
 * The secret goes in a header, never the URL. No redirect is followed, because a redirect would hand
 * the secret to whatever address it names. The secret is never logged or returned, and neither is a
 * file link: it is a credential for a few minutes.
 */
@Injectable()
export class HubClientService {
  private readonly logger = new Logger(HubClientService.name);

  /** True when the hub is configured. Both the address and the secret are needed. */
  enabled(): boolean {
    return !!process.env.HUB_URL?.trim() && !!process.env.HUB_SECRET;
  }

  appId(): string {
    const id = (process.env.HUB_APP_ID ?? '').trim() || 'bookbuddy';
    if (!APP_ID.test(id)) {
      throw new SharedLibraryError(503, 'HUB_APP_ID is not a valid app id (a-z, 0-9, - and _, 2-32 characters).');
    }
    return id;
  }

  private baseUrl(): string {
    const raw = process.env.HUB_URL?.trim();
    if (!raw) throw new SharedLibraryError(503, 'The library hub is not configured: set HUB_URL and HUB_SECRET.');
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new SharedLibraryError(503, 'HUB_URL is not a valid address.');
    }
    // The secret and the signed links cross this connection. Plain http is allowed only on a machine
    // that is not on the network at all.
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
      throw new SharedLibraryError(503, 'HUB_URL must be https (http is accepted only for localhost).');
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  }

  private secret(): string {
    const secret = process.env.HUB_SECRET;
    if (!secret) throw new SharedLibraryError(503, 'The library hub is not configured: HUB_SECRET is not set.');
    return secret;
  }

  private async call<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl()}/api/hub${path}`;
    const headers: Record<string, string> = {
      'X-Hub-App': this.appId(),
      'X-Hub-Secret': this.secret(),
      Accept: 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err: any) {
      // The path is safe to log; the headers and any link in a response are not.
      this.logger.error(`Library hub request ${method} ${path.split('?')[0]} failed: ${err?.message}`);
      throw new SharedLibraryError(0, 'Could not reach the library hub (PDLMS). Try again shortly.');
    }

    const text = await res.text().catch(() => '');
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      /* not JSON: the status is reported below */
    }

    if (res.ok) return json as T;

    if (res.status === 401) {
      throw new SharedLibraryError(502, 'The library hub rejected this app’s credentials. Check HUB_APP_ID and HUB_SECRET.');
    }
    if (res.status === 503) {
      throw new SharedLibraryError(503, 'The library hub is not enabled on the PDLMS server.');
    }
    if (res.status === 429) {
      throw new SharedLibraryError(429, 'The library hub is rate-limiting this app. Try again in a minute.');
    }
    // The hub's own reason is written for people (not found, ISBN mismatch, already linked).
    const message = Array.isArray(json.message) ? json.message.join('; ') : json.message;
    throw new SharedLibraryError(res.status || 502, message || `The library hub answered HTTP ${res.status}.`);
  }

  async listWorks(params: { q?: string; limit?: number; offset?: number }): Promise<{ items: HubWorkSummary[]; total: number }> {
    const qs = new URLSearchParams();
    if (params.q?.trim()) qs.set('q', params.q.trim().slice(0, 100));
    if (params.limit) qs.set('limit', String(Math.min(Math.max(Math.trunc(params.limit), 1), 50)));
    if (params.offset) qs.set('offset', String(Math.max(Math.trunc(params.offset), 0)));
    const json = await this.call<{ items?: HubWorkSummary[]; total?: number }>('GET', `/works${qs.size ? `?${qs}` : ''}`);
    return { items: Array.isArray(json.items) ? json.items : [], total: Number(json.total) || 0 };
  }

  async getWork(workId: string): Promise<HubWork> {
    return this.call<HubWork>('GET', `/works/${encodeURIComponent(workId)}`);
  }

  /** A signed link to one file, valid for about five minutes. Never stored or logged. */
  async fileLink(workId: string, fileId: string): Promise<HubFileLink> {
    const link = await this.call<HubFileLink>(
      'POST',
      `/works/${encodeURIComponent(workId)}/files/${encodeURIComponent(fileId)}/link`,
    );
    // Whatever the hub says, only an https link is ever passed on.
    let ok = false;
    try {
      ok = typeof link?.url === 'string' && new URL(link.url).protocol === 'https:';
    } catch {
      /* not a URL */
    }
    if (!ok) throw new SharedLibraryError(502, 'The library hub answered with a file link that cannot be used.');
    return link;
  }

  /** Records that this app's record `appRef` is the hub work. Safe to repeat; never re-points. */
  async linkWork(workId: string, appRef: string, isbn?: string | null): Promise<void> {
    await this.call('POST', `/works/${encodeURIComponent(workId)}/link`, { appRef, ...(isbn ? { isbn } : {}) });
  }

  /**
   * Tells the hub this app has stopped using the work: removes only this app's own link record, never
   * the work or its files. True when a link was removed, false when there was none (safe to repeat).
   * The hub refuses with 409 when the record is linked to a different work than the one named.
   */
  async unlinkWork(workId: string, appRef: string): Promise<boolean> {
    const out = await this.call<{ unlinked?: boolean }>(
      'DELETE',
      `/works/${encodeURIComponent(workId)}/link/${encodeURIComponent(appRef)}`,
    );
    return out.unlinked === true;
  }
}
