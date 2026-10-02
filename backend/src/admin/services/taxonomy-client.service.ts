import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TaxonomyNodeDTO {
  id: string;
  domain: string;
  nodeType: string;
  name: string;
  slug: string;
  parentId: string | null;
  ancestorIds: string[];
  sortOrder: number;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  children?: TaxonomyNodeDTO[];
}

export interface BookTaxonomyLinkDTO {
  nodeId: string;
  isPrimary: boolean;
  node: Pick<
    TaxonomyNodeDTO,
    'id' | 'name' | 'slug' | 'nodeType' | 'domain' | 'ancestorIds'
  >;
}

/**
 * Turn whatever the taxonomy service put in `error` into a readable sentence.
 *
 * Handles the shapes actually seen: a plain string, a nested `{ message }`, a
 * Prisma-style `{ name, message }`, and an arbitrary object. Falls back to the
 * status code rather than to "[object Object]", which is what the previous
 * `new Error(body.error)` produced for anything that was not a string.
 */
function describeRemoteError(error: unknown, status: number): string {
  const fallback = `Taxonomy service returned ${status}`;
  if (error == null) return fallback;
  if (typeof error === 'string') return error || fallback;
  if (typeof error === 'object') {
    const e = error as Record<string, unknown>;
    for (const k of [
      'message',
      'error',
      'detail',
      'details',
      'code',
    ] as const) {
      const v = e[k];
      if (typeof v === 'string' && v.trim()) return v;
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== '{}') return `${fallback}: ${json.slice(0, 400)}`;
    } catch {
      /* circular — fall through */
    }
  }
  return fallback;
}

/**
 * HTTP client for the shared cross-repo Taxonomy Service, hosted inside Vidyaverse
 * (see `taxonomy` schema in Vidyaverse Pro's Postgres, module
 * `backend/src/modules/taxonomy` there).
 *
 * This is Book Buddy's first outbound call from the NestJS backend to Vidyaverse — the
 * existing hub integrations (entitlements, OIDC federation) all live on the Next.js
 * side. Kept here rather than there because book tagging is owned end-to-end by
 * SuperAdminCatalogService, which is NestJS; splitting one admin action across two
 * runtimes would be worse than a first cross-runtime precedent.
 *
 * Read failures (tree fetch, for populating a tagging picker) fail soft — an empty
 * tree, not a thrown error, so a hub hiccup degrades the picker rather than crashing
 * the book editor. Write failures (setLinks) throw — an admin saving a tag needs to
 * know it did not save, not be told it succeeded when it did not.
 */
@Injectable()
export class TaxonomyClientService {
  private readonly logger = new Logger(TaxonomyClientService.name);
  private readonly baseUrl: string | null;
  private readonly apiKey: string | null;
  private readonly appKey = 'bookbuddy';

  constructor(private config: ConfigService) {
    const issuer =
      this.config.get<string>('VIDYAVERSE_ISSUER') ??
      this.config.get<string>('TAXONOMY_SERVICE_URL');
    this.baseUrl = issuer
      ? `${issuer.replace(/\/$/, '')}/api/v1/taxonomy`
      : null;
    this.apiKey = this.config.get<string>('TAXONOMY_SERVICE_API_KEY') ?? null;

    if (!this.baseUrl || !this.apiKey) {
      this.logger.warn(
        'Taxonomy service is not configured (VIDYAVERSE_ISSUER/TAXONOMY_SERVICE_API_KEY unset) — taxonomy features disabled.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error(
        'Taxonomy service is not configured in this environment.',
      );
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          'x-taxonomy-api-key': this.apiKey,
          ...(init?.headers ?? {}),
        },
        signal: controller.signal,
      });
      const body = (await res.json()) as {
        success: boolean;
        data?: T;
        error?: unknown;
      };
      if (!res.ok || !body.success) {
        // `error` is TYPED as a string and is not always one — the taxonomy
        // service returns a serialized error object for a Prisma failure, and
        // `new Error(someObject)` produces the message "[object Object]".
        //
        // That is how a precise, actionable reason ("The table
        // `taxonomy.book_taxonomy_links` does not exist in the current
        // database") reached GlitchTip as "Error: [object Object]" — an alert
        // that tells you something broke and destroys the only part worth
        // reading. Coerce deliberately rather than trusting the annotation.
        throw new Error(describeRemoteError(body.error, res.status));
      }
      return body.data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Full nested tree for a domain — used to render the tagging picker. Fails soft. */
  async getTree(domain: string): Promise<TaxonomyNodeDTO[]> {
    if (!this.isConfigured()) return [];
    try {
      return await this.request<TaxonomyNodeDTO[]>(
        `/tree?domain=${encodeURIComponent(domain)}`,
      );
    } catch (err) {
      this.logger.warn(
        `getTree(${domain}) failed, returning empty: ${(err as Error).message}`,
      );
      return [];
    }
  }

  /** Current tags for a book. Fails soft — an unreachable hub means "show nothing tagged", not a crash. */
  async getBookLinks(bookId: string): Promise<BookTaxonomyLinkDTO[]> {
    if (!this.isConfigured()) return [];
    try {
      return await this.request<BookTaxonomyLinkDTO[]>(
        `/books/${this.appKey}/${encodeURIComponent(bookId)}/links`,
      );
    } catch (err) {
      this.logger.warn(
        `getBookLinks(${bookId}) failed, returning empty: ${(err as Error).message}`,
      );
      return [];
    }
  }

  /** Replace a book's full tag set. Throws on failure — the caller must know a save didn't take. */
  async setBookLinks(
    bookId: string,
    links: Array<{ nodeId: string; isPrimary?: boolean }>,
  ): Promise<BookTaxonomyLinkDTO[]> {
    return this.request<BookTaxonomyLinkDTO[]>(
      `/books/${this.appKey}/${encodeURIComponent(bookId)}/links`,
      {
        method: 'PUT',
        body: JSON.stringify({ links }),
      },
    );
  }
}
