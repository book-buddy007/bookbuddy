import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Book Buddy's read-only window into DigiClassroom's Sanchika notes.
 *
 * DCP owns the notes (`user_notes` and friends in its own database); Book Buddy is a
 * client. The bridge is a shared schema, not HTTP — the same shape as
 * `rag/content-spine.service.ts`, and for the same reason: DCP's `/api/notes`
 * authenticates with a per-domain better-auth *cookie*, so calling it would
 * need a service token plus a user assertion and would couple the reader to
 * DCP's uptime. See `docs/context/SANCHIKA_TRIO_SHARING.md`.
 *
 * This connects as `book_buddy_sanchika_reader`, which holds USAGE on schema
 * `sanchika` and SELECT on the one view `sanchika.notes_by_subject` — and
 * nothing else. SELECT on `user_notes`, SELECT on `account` and INSERT into
 * `user_notes` are all rejected by Postgres, verified, not assumed. A bug here
 * cannot write to another app's data because the credential cannot.
 *
 * A SEPARATE POOL from Prisma on purpose: Prisma points at the `book_buddy`
 * database, and Postgres has no cross-database join.
 */
@Injectable()
export class SanchikaService implements OnModuleDestroy {
  private readonly logger = new Logger(SanchikaService.name);
  private pool: Pool | null = null;
  private warnedUnconfigured = false;

  constructor(private readonly prisma: PrismaService) {}

  private getPool(): Pool | null {
    if (this.pool) return this.pool;
    const connectionString = process.env.TRIO_SANCHIKA_DATABASE_URL;
    if (!connectionString) {
      if (!this.warnedUnconfigured) {
        this.warnedUnconfigured = true;
        this.logger.warn(
          'TRIO_SANCHIKA_DATABASE_URL is not set — the reader\'s Sanchika panel will ' +
            'report itself unconfigured instead of showing DigiClassroom notes.',
        );
      }
      return null;
    }
    // Small: this pool serves one panel's polling, and Book Buddy should not hold a
    // large share of DCP's connections for it.
    this.pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 30_000 });
    this.pool.on('error', (err) => this.logger.error(`sanchika pool error: ${err.message}`));
    return this.pool;
  }

  /**
   * The two keys this Book Buddy user may be matched by on the DCP side.
   *
   * THE CLIENT NEVER SUPPLIES THESE. They are derived here from the
   * authenticated session's user id, because a request parameter naming whose
   * notes to fetch is a request parameter for reading someone else's notes.
   *
   * `subjectId` is the Vidyaverse OIDC `sub` — the canonical cross-app
   * identity, taken from this user's better-auth `Account` row with
   * `providerId='vidyaverse'`.
   *
   * `emailKey` is the fallback, and it exists because phase 1 measured the
   * alternative: a `sub`-only join returned 0 of 4 notes, since every note
   * owner in DCP signed up with a password and has no `sub` at all. It is
   * populated ONLY when Book Buddy has verified this address. The DCP-side view
   * applies the mirror-image condition (`email_key` is NULL unless DCP verified
   * it too), so a match on email means both apps independently proved the
   * person controls that mailbox. Dropping either half of that would let an
   * unverified signup on one side read a stranger's notes on the other.
   */
  private async resolveIdentity(
    userId: string,
  ): Promise<{ subjectId: string | null; emailKey: string | null }> {
    const [account, user] = await Promise.all([
      this.prisma.account.findFirst({
        where: { userId, providerId: 'vidyaverse' },
        select: { accountId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, emailVerified: true },
      }),
    ]);

    return {
      subjectId: account?.accountId ?? null,
      emailKey:
        user?.emailVerified && user.email ? user.email.trim().toLowerCase() : null,
    };
  }

  /**
   * This user's DCP notes, newest first.
   *
   * `bookId` scopes to notes DCP recorded as belonging to this book — phase 2
   * is read-only, so today that only matches notes a *future* Book Buddy write would
   * have tagged (`source_type='book_buddy_reader'`, `source_query='<bookId>:<page>'`,
   * per the design doc). Notes written in DCP proper are untagged and only
   * appear under the "all notes" toggle. That is the honest behaviour, not a
   * gap: pretending an unrelated note belongs to the book being read would be
   * worse than showing it in the list it actually belongs to.
   */
  async listNotes(
    userId: string,
    opts: { bookId?: string; limit?: number } = {},
  ): Promise<{
    notes: SanchikaNoteRow[];
    linked: boolean;
    configured: boolean;
  }> {
    const pool = this.getPool();
    if (!pool) return { notes: [], linked: false, configured: false };

    const { subjectId, emailKey } = await this.resolveIdentity(userId);
    // Neither key: this user cannot be matched to anyone in DCP. An empty list
    // is the truthful answer — `linked: false` lets the panel say so rather
    // than imply the person has no notes.
    if (!subjectId && !emailKey) {
      return { notes: [], linked: false, configured: true };
    }

    const limit = Math.min(Math.max(opts.limit ?? 100, 1), 200);

    // `subject_id = $1 OR email_key = $2` with NULLs passed through is safe:
    // NULL = <anything> is NULL, never true, so a missing key matches no rows
    // rather than matching every row with a NULL key.
    const params: unknown[] = [subjectId, emailKey];
    // `AT TIME ZONE 'UTC'` is load-bearing, not decoration. DCP's timestamps are
    // `timestamp WITHOUT time zone` holding UTC wall-clock, and node-pg parses a
    // naked timestamp as the *reading server's* local time — so a note written a
    // moment ago rendered as "6 hours ago" on an IST machine, and would be wrong
    // by a different amount on every host. This pins the interpretation to UTC,
    // which is what DCP actually wrote, and hands back a timestamptz.
    let sql = `SELECT id, title, content, content_format, subject, chapter, tags,
                      source_type, source_query, is_favorite, is_pinned,
                      created_at AT TIME ZONE 'UTC' AS created_at,
                      updated_at AT TIME ZONE 'UTC' AS updated_at
                 FROM sanchika.notes_by_subject
                WHERE (subject_id IS NOT NULL AND subject_id = $1)
                   OR (email_key  IS NOT NULL AND email_key  = $2)`;

    if (opts.bookId) {
      params.push(`${opts.bookId}:%`);
      params.push(opts.bookId);
      sql += ` AND (source_query LIKE $${params.length - 1} OR source_query = $${params.length})`;
    }

    sql += ` ORDER BY is_pinned DESC, updated_at DESC LIMIT ${limit}`;

    try {
      const res = await pool.query<RawNoteRow>(sql, params);
      return { notes: res.rows.map(toNote), linked: true, configured: true };
    } catch (err: any) {
      // Fail CLOSED and loudly. Returning a partial or unfiltered list would be
      // returning someone else's notes.
      this.logger.error(`Could not list Sanchika notes for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) await this.pool.end().catch(() => undefined);
  }
}

interface RawNoteRow {
  id: string;
  title: string | null;
  content: string | null;
  content_format: string | null;
  subject: string | null;
  chapter: string | null;
  tags: unknown;
  source_type: string | null;
  source_query: string | null;
  is_favorite: boolean | null;
  is_pinned: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface SanchikaNoteRow {
  id: string;
  title: string;
  content: string;
  contentFormat: string;
  subject: string | null;
  chapter: string | null;
  tags: string[];
  sourceType: string | null;
  sourceQuery: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

function toNote(r: RawNoteRow): SanchikaNoteRow {
  return {
    id: r.id,
    title: r.title ?? 'Untitled Note',
    content: r.content ?? '',
    // DCP writes Tiptap output, so this is HTML unless it says otherwise. The
    // client sanitises before rendering either way — see SanchikaSidebar.
    contentFormat: r.content_format ?? 'html',
    subject: r.subject,
    chapter: r.chapter,
    // `tags` is a json column in DCP and has held both an array and a string.
    tags: Array.isArray(r.tags) ? (r.tags as string[]).filter((t) => typeof t === 'string') : [],
    sourceType: r.source_type,
    sourceQuery: r.source_query,
    isFavorite: r.is_favorite ?? false,
    isPinned: r.is_pinned ?? false,
    createdAt: r.created_at ? r.created_at.toISOString() : null,
    updatedAt: r.updated_at ? r.updated_at.toISOString() : null,
  };
}
