import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../aws/s3.service';
import { HubClientService, HubFile, HubWork } from './hub-client.service';
import { SharedLibraryError } from './shared-library.error';

/** What a hub-owned BookFormat row records in `metadata.hub`. */
export interface HubFormatMarker {
  workId: string;
  /** Hub-side file id and version when the row was last synced: for display and drift checks only. */
  fileId: string;
  version: string;
}

/** The marker on a BookFormat row, or null when the file is Book Buddy's own. */
export function hubMarkerOf(metadata: unknown): HubFormatMarker | null {
  const hub = (metadata as { hub?: Partial<HubFormatMarker> } | null)?.hub;
  return hub && typeof hub.workId === 'string' && hub.workId ? (hub as HubFormatMarker) : null;
}

const MANIFEST_TTL_MS = 60_000;
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const COVER_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const KIND_TO_FORMAT = { pdf: 'PDF', epub: 'EPUB' } as const;

/**
 * Books and files that PDLMS's hub owns.
 *
 * A hub-linked book's PDF and EPUB are NOT copied here: they are streamed. Linking only leaves a
 * marker (a BookFormat row with no file URL and `metadata.hub`), so the catalogue shows the format
 * and its size, and each read asks the hub for a fresh five-minute link. Book Buddy still decides who
 * may read (tier, institution, borrowing) before it asks.
 *
 * The one exception is the cover, copied once into Book Buddy's own public bucket: it is a small
 * display image the catalogue shows on every list, not the licensed text.
 */
@Injectable()
export class HubFilesService {
  private readonly logger = new Logger(HubFilesService.name);
  private readonly manifests = new Map<string, { at: number; work: HubWork }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly hub: HubClientService,
  ) {}

  /** The hub's description of a work, cached for a minute so a reader opening a book costs one call. */
  private async work(workId: string, fresh = false): Promise<HubWork> {
    const hit = this.manifests.get(workId);
    if (!fresh && hit && Date.now() - hit.at < MANIFEST_TTL_MS) return hit.work;
    const work = await this.hub.getWork(workId);
    this.manifests.set(workId, { at: Date.now(), work });
    if (this.manifests.size > 200) {
      for (const [k, v] of this.manifests) if (Date.now() - v.at >= MANIFEST_TTL_MS) this.manifests.delete(k);
    }
    return work;
  }

  /** Drops what is remembered about a work, e.g. once a book has been unlinked from it. */
  forget(workId: string): void {
    this.manifests.delete(workId);
  }

  /**
   * A fresh link for one rendition of a hub-owned book. Never stored. If the hub no longer knows the
   * file id from the cached manifest (the file was replaced there), it is looked up once more.
   */
  async readLink(workId: string, kind: 'pdf' | 'epub'): Promise<{ url: string; expiresAt: string }> {
    for (const fresh of [false, true]) {
      const work = await this.work(workId, fresh);
      const file = work.manifest.files.find((f) => f.kind === kind);
      if (!file) {
        throw new SharedLibraryError(
          work.manifest.filesWithheld === 'drm' ? 403 : 404,
          work.manifest.filesWithheld === 'drm'
            ? 'The library does not share the files of this copy-protected book.'
            : `The library has no ${kind.toUpperCase()} file for this book.`,
        );
      }
      try {
        const link = await this.hub.fileLink(workId, file.fileId);
        return { url: link.url, expiresAt: link.expiresAt };
      } catch (err) {
        if (!fresh && err instanceof SharedLibraryError && err.status === 404) continue;
        throw err;
      }
    }
    throw new SharedLibraryError(404, 'The library no longer has that file.');
  }

  /**
   * After a book is linked: record its PDF and EPUB as hub-owned formats, and copy its cover if it
   * has none. Safe to repeat. A file the book already has of its own is left alone (it wins on
   * reading), and a failure here never undoes the link: the passages are what linking is for.
   */
  async syncFromWork(bookId: string, workId: string): Promise<{ formats: string[]; cover: boolean; audioTracks: number }> {
    const work = await this.work(workId, true);
    const formats: string[] = [];

    for (const file of work.manifest.files) {
      const type = KIND_TO_FORMAT[file.kind as 'pdf' | 'epub'];
      if (!type) continue;
      const where = { bookId_type_partIndex: { bookId, type, partIndex: 0 } };
      const existing = await this.prisma.bookFormat.findUnique({ where });
      if (existing?.fileUrl && !hubMarkerOf(existing.metadata)) continue; // Book Buddy's own file

      const data = {
        fileUrl: null,
        fileSize: file.sizeBytes,
        mimeType: file.mimeType,
        metadata: { hub: { workId, fileId: file.fileId, version: file.version } satisfies HubFormatMarker } as Prisma.InputJsonValue,
      };
      await this.prisma.bookFormat.upsert({ where, create: { bookId, type, partIndex: 0, ...data }, update: data });
      formats.push(type);
    }

    const audioTracks = await this.syncAudio(bookId, workId, work).catch((err) => {
      this.logger.warn(`Could not record the audio of work ${workId} for book ${bookId}: ${err?.message ?? err}`);
      return 0;
    });
    if (audioTracks > 0) formats.push('AUDIOBOOK');

    const cover = await this.copyCover(bookId, workId, work).catch((err) => {
      this.logger.warn(`Could not copy the cover of work ${workId} for book ${bookId}: ${err?.message ?? err}`);
      return false;
    });
    return { formats, cover, audioTracks };
  }

  /**
   * A fresh link for one audio track of a hub-owned book. Never stored. The track's hub file id is
   * stable (it is the hub's own track id), so no manifest is read first; the hub refuses an id that
   * does not belong to the work.
   */
  async audioLink(workId: string, fileId: string): Promise<{ url: string; expiresAt: string }> {
    const link = await this.hub.fileLink(workId, fileId);
    return { url: link.url, expiresAt: link.expiresAt };
  }

  /**
   * Mirrors the hub's audio structure into AudioChapter / AudioSection / AudioTrack rows, each marked
   * with the hub's id so a repeat run updates them in place (listeners' progress and bookmarks point at
   * these rows' ids and must survive) and drops only what the hub no longer lists. A track's file is
   * not copied: its row has an empty `fileUrl` and a `hubFileId`, and the presign route asks the hub for
   * a link on every play. No transcripts or word alignment come with it (the hub does not hold them).
   *
   * Audio the book has of its own wins, as for PDF and EPUB: nothing is recorded over it.
   * Returns the number of tracks the book now has from the hub.
   */
  private async syncAudio(bookId: string, workId: string, work: HubWork): Promise<number> {
    const ownChapters = await this.prisma.audioChapter.count({ where: { bookId, hubChapterId: null } });
    const ownFormat = await this.prisma.bookFormat.findUnique({
      where: { bookId_type_partIndex: { bookId, type: 'AUDIOBOOK', partIndex: 0 } },
      select: { fileUrl: true },
    });
    if (ownChapters > 0 || ownFormat?.fileUrl) return 0;

    const chapters = work.manifest.audio ?? [];
    let tracks = 0;

    await this.prisma.$transaction(
      async (tx) => {
        for (const c of chapters) {
          const chapter = await tx.audioChapter.upsert({
            where: { bookId_hubChapterId: { bookId, hubChapterId: c.chapterId } },
            create: { bookId, hubChapterId: c.chapterId, title: c.title, sortOrder: c.sortOrder },
            update: { title: c.title, sortOrder: c.sortOrder },
          });
          for (const s of c.sections) {
            const sizes = s.tracks.map((t) => t.sizeBytes).filter((n): n is number => typeof n === 'number');
            const sectionData = {
              title: s.title,
              sortOrder: s.sortOrder,
              sectionType: s.type === 'INTRO' ? ('INTRO' as const) : ('SECTION' as const),
              durationSeconds: s.durationSeconds,
              fileSizeBytes: sizes.length ? BigInt(Math.max(...sizes)) : null,
            };
            const section = await tx.audioSection.upsert({
              where: { chapterId_hubSectionId: { chapterId: chapter.id, hubSectionId: s.sectionId } },
              create: { chapterId: chapter.id, hubSectionId: s.sectionId, ...sectionData },
              update: sectionData,
            });
            for (const t of s.tracks) {
              const gender = t.gender.toUpperCase();
              if (gender !== 'MALE' && gender !== 'FEMALE') continue;
              const data = {
                fileUrl: '',
                durationSeconds: t.durationSeconds,
                fileSizeBytes: typeof t.sizeBytes === 'number' ? BigInt(t.sizeBytes) : null,
                hubFileId: t.fileId,
              };
              const existing = await tx.audioTrack.findFirst({ where: { sectionId: section.id, gender }, select: { id: true } });
              if (existing) await tx.audioTrack.update({ where: { id: existing.id }, data });
              else await tx.audioTrack.create({ data: { sectionId: section.id, gender, ...data } });
              tracks += 1;
            }
          }
        }

        // Whatever the hub no longer lists, and only what it supplied.
        const chapterIds = chapters.map((c) => c.chapterId);
        const sectionIds = chapters.flatMap((c) => c.sections.map((s) => s.sectionId));
        const fileIds = chapters.flatMap((c) => c.sections.flatMap((s) => s.tracks.map((t) => t.fileId)));
        await tx.audioTrack.deleteMany({ where: { section: { chapter: { bookId } }, hubFileId: { not: null, notIn: fileIds } } });
        await tx.audioSection.deleteMany({ where: { chapter: { bookId }, hubSectionId: { not: null, notIn: sectionIds } } });
        await tx.audioChapter.deleteMany({ where: { bookId, hubChapterId: { not: null, notIn: chapterIds } } });

        // The catalogue lists "audiobook" as a format from this row, as it does for a streamed PDF.
        const where = { bookId_type_partIndex: { bookId, type: 'AUDIOBOOK' as const, partIndex: 0 } };
        if (tracks > 0) {
          const data = {
            fileUrl: null,
            fileSize: null,
            metadata: { hub: { workId, fileId: 'audio', version: work.manifest.revision } satisfies HubFormatMarker } as Prisma.InputJsonValue,
          };
          await tx.bookFormat.upsert({ where, create: { bookId, type: 'AUDIOBOOK', partIndex: 0, ...data }, update: data });
        } else {
          await tx.bookFormat.deleteMany({ where: { bookId, type: 'AUDIOBOOK', fileUrl: null } });
        }
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    return tracks;
  }

  private async copyCover(bookId: string, workId: string, work: HubWork): Promise<boolean> {
    const file: HubFile | undefined = work.manifest.files.find((f) => f.kind === 'cover');
    if (!file) return false;
    const book = await this.prisma.book.findUnique({ where: { id: bookId }, select: { coverUrl: true, coverKey: true } });
    if (!book || book.coverUrl || book.coverKey) return false; // never replace a cover someone chose

    const link = await this.hub.fileLink(workId, file.fileId);
    const res = await fetch(link.url, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`the hub's storage answered HTTP ${res.status}`);
    const type = (res.headers.get('content-type') ?? file.mimeType).split(';')[0].trim().toLowerCase();
    const ext = COVER_TYPES[type];
    if (!ext) throw new Error(`unsupported cover type "${type}"`);
    const declared = Number(res.headers.get('content-length'));
    if (declared > MAX_COVER_BYTES) throw new Error('cover is larger than 5 MB');
    const body = Buffer.from(await res.arrayBuffer());
    if (body.length === 0 || body.length > MAX_COVER_BYTES) throw new Error('cover has an unusable size');

    const key = this.s3.buildCoverKey({ bookId, side: 'front', filename: `hub-cover.${ext}` });
    const { publicUrl } = await this.s3.putObject(key, body, type);
    await this.prisma.book.update({ where: { id: bookId }, data: { coverKey: key, coverUrl: publicUrl } });
    return true;
  }
}
