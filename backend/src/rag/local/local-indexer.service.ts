import { Injectable, Logger } from '@nestjs/common';
import { v5 as uuidv5, v4 as uuidv4 } from 'uuid';
import { EmbeddingService } from '../embedding.service';
import { QdrantInitService } from '../qdrant-init.service';
import { buildSparseVector } from '../sparse-tokenizer';
import { Chunk, parseEnrichedMarkdown } from './enriched-markdown';
import {
  denseVectorName,
  qdrantCollectionName,
  sparseVectorName,
} from './index-config';

/** Point ids are derived from these, so the same input always maps to the same ids. */
const POINT_NAMESPACE = '6c3f0b64-6f0a-4a4e-9a0e-2b8f6d6f6b01';

const EMBED_BATCH = 64;
const UPSERT_BATCH = 64;

export interface ChapterInput {
  /** The BookFormat row id of this chapter's markdown. Stored as `content_asset_id`. */
  assetId: string;
  partIndex: number;
  markdown: string;
}

export interface IndexBookInput {
  bookId: string;
  tenantId: string;
  bookTitle: string;
  chapters: ChapterInput[];
  /** Refuse chapters whose frontmatter `validation_status` is not APPROVED. Off by default. */
  requireApproved?: boolean;
  runId?: string;
  onProgress?: (percent: number, message: string) => void | Promise<void>;
}

export interface ChapterReport {
  partIndex: number;
  chunks: number;
  validationStatus: string;
  warnings: string[];
  skipped: { page: number | null; reason: string }[];
}

export interface IndexBookResult {
  runId: string;
  totalChunks: number;
  chapters: ChapterReport[];
}

interface Prepared {
  chunk: Chunk;
  chapter: ChapterInput;
  meta: Record<string, string>;
  chunkIndex: number;
}

/**
 * What the embedding model reads: the chunk plus where it sits in the book. A passage like
 * "The curve slopes downward" means little alone; with its chapter and section in front it is
 * about the right thing. The stored `text` (what the tutor quotes and a citation previews) stays
 * the pure excerpt.
 */
export function contextualText(chunk: Chunk): string {
  const where = [chunk.chapter, chunk.sectionTitle]
    .filter((v, i, all) => !!v && all.indexOf(v) === i)
    .join(' - ');
  return where ? `${where}\n${chunk.text}` : chunk.text;
}

/**
 * Book Buddy's own indexer: enriched markdown in, searchable points out.
 *
 * It writes the same payload vocabulary the search, citation, graph and quiz code already read
 * (`content_item_id`, `page_start`, `chapter`, `retrieval_class`, `level`, `visibility`, ...), with a
 * dense vector and a keyword (`bm25`) vector per point. A book is its own "work", so
 * `content_item_id` is simply the book id.
 *
 * Re-indexing is safe to fail: the new run's points are written under a fresh `run_id`, and only
 * once every chapter is in are the previous run's points deleted. A run that fails part-way removes
 * its own points and leaves the book exactly as it was.
 */
@Injectable()
export class LocalIndexerService {
  private readonly logger = new Logger(LocalIndexerService.name);

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly qdrantInit: QdrantInitService,
  ) {}

  /** Parse and chunk without touching Qdrant or OpenAI: used to validate before spending money. */
  prepare(input: IndexBookInput): { prepared: Prepared[]; reports: ChapterReport[] } {
    const prepared: Prepared[] = [];
    const reports: ChapterReport[] = [];
    let chunkIndex = 0;

    const ordered = [...input.chapters].sort((a, b) => a.partIndex - b.partIndex);
    for (const chapter of ordered) {
      const parsed = parseEnrichedMarkdown(chapter.markdown);
      for (const chunk of parsed.chunks) {
        prepared.push({ chunk, chapter, meta: parsed.meta, chunkIndex: chunkIndex++ });
      }
      reports.push({
        partIndex: chapter.partIndex,
        chunks: parsed.chunks.length,
        validationStatus: (parsed.meta.validation_status || 'UNKNOWN').toUpperCase(),
        warnings: parsed.warnings,
        skipped: parsed.skipped,
      });
    }
    return { prepared, reports };
  }

  async indexBook(input: IndexBookInput): Promise<IndexBookResult> {
    const runId = input.runId ?? uuidv4();
    const { prepared, reports } = this.prepare(input);

    if (input.requireApproved) {
      const notApproved = reports.filter((r) => r.validationStatus !== 'APPROVED');
      if (notApproved.length > 0) {
        throw new Error(
          `Not indexed: ${notApproved.length} chapter(s) are not marked validation_status: APPROVED ` +
            `(${notApproved.map((r) => `part ${r.partIndex} is ${r.validationStatus}`).join(', ')}).`,
        );
      }
    } else {
      const notApproved = reports.filter((r) => r.validationStatus !== 'APPROVED');
      if (notApproved.length > 0) {
        this.logger.warn(
          `Indexing ${notApproved.length} chapter(s) whose validation_status is not APPROVED ` +
            `(${notApproved.map((r) => `part ${r.partIndex}: ${r.validationStatus}`).join(', ')}).`,
        );
      }
    }
    for (const r of reports) {
      for (const w of r.warnings) this.logger.warn(`Part ${r.partIndex}: ${w}`);
    }

    if (prepared.length === 0) {
      throw new Error(
        'Nothing to index: the markdown produced no chunks (empty, or only markers and skipped content).',
      );
    }

    const qdrant = this.qdrantInit.getClient();
    const collection = qdrantCollectionName();
    const dense = denseVectorName();
    const sparse = sparseVectorName();
    const progress = async (pct: number, msg: string) => {
      await input.onProgress?.(pct, msg);
    };

    try {
      // 1. Embed everything first. If the key is wrong or the budget is gone, this fails before
      //    anything has been written.
      const vectors: number[][] = [];
      for (let i = 0; i < prepared.length; i += EMBED_BATCH) {
        const batch = prepared.slice(i, i + EMBED_BATCH);
        const out = await this.embedding.embedBatch(
          batch.map((p) => contextualText(p.chunk)),
        );
        vectors.push(...out);
        await progress(
          Math.round(((i + batch.length) / prepared.length) * 70),
          `Embedded ${Math.min(i + batch.length, prepared.length)} of ${prepared.length} passages`,
        );
      }

      // 2. Write the new run's points.
      for (let i = 0; i < prepared.length; i += UPSERT_BATCH) {
        const batch = prepared.slice(i, i + UPSERT_BATCH);
        const points = batch.map((p, j) => {
          const keywords = buildSparseVector(contextualText(p.chunk));
          const vector: Record<string, unknown> = { [dense]: vectors[i + j] };
          if (keywords.indices.length > 0) vector[sparse] = keywords;
          return {
            id: uuidv5(`${input.bookId}:${runId}:${p.chunkIndex}`, POINT_NAMESPACE),
            vector: vector as any,
            payload: this.payloadFor(input, runId, p),
          };
        });
        await qdrant.upsert(collection, { wait: true, points });
        await progress(
          70 + Math.round(((i + batch.length) / prepared.length) * 25),
          `Stored ${Math.min(i + batch.length, prepared.length)} of ${prepared.length} passages`,
        );
      }

      // 3. Only now remove what the previous run left behind.
      await qdrant.delete(collection, {
        wait: true,
        filter: {
          must: [{ key: 'content_item_id', match: { value: input.bookId } }],
          must_not: [{ key: 'run_id', match: { value: runId } }],
        },
      });
    } catch (err) {
      await this.discardRun(input.bookId, runId, collection);
      throw err;
    }

    this.logger.log(
      `Indexed "${input.bookTitle}" (${input.bookId}): ${prepared.length} chunks from ${reports.length} chapter(s), run ${runId}.`,
    );
    return { runId, totalChunks: prepared.length, chapters: reports };
  }

  /** Removes every point of one run: used when that run failed part-way. Best effort. */
  private async discardRun(bookId: string, runId: string, collection: string) {
    try {
      await this.qdrantInit.getClient().delete(collection, {
        wait: true,
        filter: {
          must: [
            { key: 'content_item_id', match: { value: bookId } },
            { key: 'run_id', match: { value: runId } },
          ],
        },
      });
    } catch (cleanupErr: any) {
      this.logger.error(
        `Could not clean up the failed run ${runId} for book ${bookId}: ${cleanupErr?.message}. ` +
          `Its points are tagged run_id=${runId} and are never retrieved while an earlier run exists.`,
      );
    }
  }

  private payloadFor(input: IndexBookInput, runId: string, p: Prepared) {
    const { chunk, chapter, meta } = p;
    const payload: Record<string, unknown> = {
      // What every search filters on.
      level: 0,
      visibility: 'public', // access is enforced per book and per tenant before any search runs
      tenant_id: input.tenantId,
      content_item_id: input.bookId, // a book is its own work
      content_asset_id: chapter.assetId,
      retrieval_class: chunk.retrievalClass,
      // Position and citation.
      chunk_index: p.chunkIndex,
      chapter: chunk.chapter,
      text: chunk.text,
      run_id: runId,
      // Descriptive.
      book_id: input.bookId,
      book_title: input.bookTitle,
      part_index: chapter.partIndex,
    };
    if (chunk.pageStart != null) payload.page_start = chunk.pageStart;
    if (chunk.pageEnd != null) payload.page_end = chunk.pageEnd;
    if (chunk.sectionTitle) payload.section_title = chunk.sectionTitle;
    if (chunk.blockType) payload.block_type = chunk.blockType;
    if (chunk.label) payload.label = chunk.label;
    for (const key of ['subject', 'class_level', 'language', 'chapter_number', 'validation_status']) {
      if (meta[key]) payload[key] = meta[key];
    }
    return payload;
  }
}
