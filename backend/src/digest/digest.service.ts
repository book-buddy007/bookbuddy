import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  bookAnswerLanguage,
  contentLanguageDirective,
} from '../common/language/answer-language';
import { QdrantInitService } from '../rag/qdrant-init.service';
import { ILlmProvider, LLM_PROVIDER } from '../rag/interfaces/llm.provider.interface';
import { ITtsProvider, TTS_PROVIDER } from '../rag/interfaces/tts.provider.interface';

// The shared trio collection — same as graph extraction and Varta retrieval.
// The point ids in BookChunkMapping are this collection's ids, so the recap
// fallback must retrieve from here; `book_buddy_books_v1` was deleted in the reset.
const COLLECTION = process.env.QDRANT_COLLECTION_NAME || 'trio_content_v1_openai3072';
const FALLBACK_CHUNK_SAMPLE = 6; // when there's no §3 community summary to ground on

export interface DigestLine {
  speaker: string;
  line: string;
}

/**
 * Reading Intelligence Layer §8 — auto-generated multi-voice chapter digest.
 * Script generation is grounded in the §3 chapter-level community summary
 * where one exists; falls back to a sample of the chapter's raw chunk text
 * (same Qdrant-retrieve technique as §2/§10) for books/chapters the graph
 * hasn't covered, rather than refusing to generate a digest at all.
 *
 * TTS is a genuinely separate concern from script generation — see
 * ITtsProvider/NullTtsProvider. A digest with status SCRIPT_READY (no
 * audioUri) is a complete, useful result on its own, not a partial failure.
 */
@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private prisma: PrismaService,
    private qdrantInit: QdrantInitService,
    @Inject(LLM_PROVIDER) private llmProvider: ILlmProvider,
    @Inject(TTS_PROVIDER) private ttsProvider: ITtsProvider,
  ) {}

  /** Idempotent — returns the cached digest if one already exists for this (book, chapter, voicePair). */
  async generateDigest(bookId: string, chapterTitle: string, voicePair = 'default') {
    const existing = await this.prisma.chapterDigest.findUnique({
      where: { bookId_chapterTitle_voicePair: { bookId, chapterTitle, voicePair } },
    });
    if (existing) return existing;

    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { title: true, author: true, language: true },
    });
    if (!book) throw new NotFoundException('Book not found');

    const grounding = await this.buildGroundingContext(bookId, chapterTitle);
    if (!grounding) {
      throw new NotFoundException(`No content found for chapter "${chapterTitle}" of this book.`);
    }

    const script = await this.generateScript(book, chapterTitle, grounding);

    let digest: Awaited<ReturnType<typeof this.prisma.chapterDigest.create>>;
    try {
      digest = await this.prisma.chapterDigest.create({
        data: {
          bookId,
          chapterTitle,
          voicePair,
          scriptJson: script as any,
          status: 'SCRIPT_READY',
        },
      });
    } catch (e: any) {
      // Concurrency: the findUnique above and this create are not atomic, and
      // generateScript() (an LLM call) sits between them for seconds — so a
      // double-click or retry runs two requests that both pass the existence
      // check and race to create the same (bookId, chapterTitle, voicePair).
      // The unique index is the backstop; on P2002 the row now exists, so
      // return it instead of surfacing a 500. Keeps the method idempotent
      // under concurrency, not just on sequential repeats.
      if (e?.code === 'P2002') {
        const raced = await this.prisma.chapterDigest.findUnique({
          where: { bookId_chapterTitle_voicePair: { bookId, chapterTitle, voicePair } },
        });
        if (raced) return raced;
      }
      throw e;
    }

    // Best-effort audio rendering — a missing/failing TTS provider degrades
    // to a script-only digest, it doesn't fail the whole request. The script
    // itself (already persisted above) is the useful, reliable part.
    try {
      const audio = await this.ttsProvider.synthesize(script, voicePair);
      if (audio) {
        return this.prisma.chapterDigest.update({
          where: { id: digest.id },
          data: { audioUri: audio.audioUri, status: 'AUDIO_READY' },
        });
      }
    } catch (e: any) {
      this.logger.warn(`TTS rendering failed for digest ${digest.id}, leaving script-only: ${e.message}`);
      return this.prisma.chapterDigest.update({ where: { id: digest.id }, data: { status: 'AUDIO_FAILED' } });
    }

    return digest;
  }

  async getStatus(bookId: string, chapterTitle: string, voicePair = 'default') {
    const digest = await this.prisma.chapterDigest.findUnique({
      where: { bookId_chapterTitle_voicePair: { bookId, chapterTitle, voicePair } },
      select: { status: true, audioUri: true, generatedAt: true },
    });
    if (!digest) return { status: 'NOT_GENERATED' as const };
    return digest;
  }

  private async generateScript(
    book: { title: string; author: string; language?: string | null },
    chapterTitle: string,
    grounding: string,
  ): Promise<DigestLine[]> {
    const prompt =
      `You are writing a short two-person dialogue script recapping a chapter of a book, for a student ` +
      `reviewing what they just read. Chapter: "${chapterTitle}" from "${book.title}" by ${book.author}.\n\n` +
      `Chapter material:\n${grounding}\n\n` +
      `Write a natural, engaging dialogue between two personas, "Host" and "Guest", discussing the chapter's ` +
      `key points — 6 to 10 lines total, alternating speakers. Ground every substantive claim in the material ` +
      `above; do not invent plot points or facts not present in it. Return ONLY a JSON array of objects with ` +
      `"speaker" ("Host" or "Guest") and "line" (string) fields. No markdown, no preamble, no explanation — ` +
      `just the JSON array.

` +
      // A digest is cached per (book, chapter, voicePair) and served to every
      // reader, so it follows the BOOK's language. Named explicitly rather than
      // left to follow the chapter material, which is how a quiz elsewhere in
      // this codebase ended up in Italian.
      contentLanguageDirective(bookAnswerLanguage(book.language));

    let full = '';
    await this.llmProvider.chatStream([{ role: 'user', content: prompt }], (t) => {
      full += t;
    });

    const cleaned = full.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '');
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('Digest script generation returned non-JSON output from the LLM.');
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Digest script generation returned an empty or malformed script.');
    }
    return parsed
      .filter((l: any) => l && typeof l.speaker === 'string' && typeof l.line === 'string')
      .map((l: any) => ({ speaker: l.speaker, line: l.line }));
  }

  /** §3 community summary if one exists for this chapter, else a sample of the chapter's raw chunk text. */
  private async buildGroundingContext(bookId: string, chapterTitle: string): Promise<string | null> {
    const community = await this.prisma.graphCommunity.findFirst({
      where: { bookId, level: 'chapter', members: { some: { node: { firstChapter: chapterTitle } } } },
      select: { summary: true },
    });
    if (community) return community.summary;

    const chunks = await this.prisma.bookChunkMapping.findMany({
      where: { bookId, chapterTitle },
      orderBy: { chunkIndex: 'asc' },
      take: FALLBACK_CHUNK_SAMPLE,
      select: { qdrantPointId: true },
    });
    if (chunks.length === 0) return null;

    const qdrant = this.qdrantInit.getClient();
    const points = await qdrant.retrieve(COLLECTION, {
      ids: chunks.map((c) => c.qdrantPointId),
      with_payload: true,
    });
    const texts = points.map((p) => (p.payload as any)?.text).filter(Boolean);
    if (texts.length === 0) return null;
    return texts.join('\n\n');
  }
}
