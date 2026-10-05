import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TierGuard } from '../auth/tier.guard';
import { AiFeatureGuard } from '../ai-entitlement/ai-feature.guard';
import { AiFeatureGate } from '../ai-entitlement/ai-feature.decorator';
import { RagSearchService, parseReferences } from './rag-search.service';
import {
  notFoundMessage,
  referenceNotFoundMessage,
} from '../common/language/answer-language';
import { ContentSpineService } from './content-spine.service';
import { clientMessageForAiError } from './ai-client-errors';
import { CurriculumScopeClientService } from './curriculum-scope-client.service';
import {
  IRerankerProvider,
  RERANKER_PROVIDER,
} from './interfaces/reranker.provider.interface';
import { BookChatService } from './book-chat.service';
import {
  DialoguePolicyService,
  DIALOGUE_MODES,
  DialogueMode,
} from './dialogue-policy.service';
import { filterCitedOnly } from './citation-markers';
import {
  AnswerCacheService,
  buildAnswerKey,
  isCacheableMode,
} from './answer-cache.service';
import { MasteryAwareRetrievalService } from './mastery-retrieval.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserPreferencesService } from '../user-preferences/user-preferences.service';
import { Inject } from '@nestjs/common';
import {
  ILlmProvider,
  LLM_PROVIDER,
} from './interfaces/llm.provider.interface';

/**
 * How many retrieved excerpts the model actually reasons over.
 *
 * WHY THIS IS NOT 3. Retrieval over-fetches 20 candidates explicitly "for the
 * reranker" (rag-search.service.ts), but RerankService is a pass-through — it
 * re-sorts by the very RRF score Qdrant already sorted by and slices. So the
 * cut here was the whole selection step, and at 3 it discarded 17 candidates
 * that had already been fetched and paid for.
 *
 * Measured against production: asked "himalaya as great barrier" of
 * Fundamentals of Physical Geography, Varta answered that the excerpts did not
 * contain it — while the sentence sits on page 4 ("In India, Himalayas have
 * acted as great barriers…"). That chunk is BM25 rank 3 for the query, behind
 * two coastal/glacial chunks that repeat "barrier" as in *barrier bar*, and it
 * ranks poorly on dense because the chunk is overwhelmingly about geography as
 * a discipline with the Himalaya line as one passing clause. It was retrieved
 * and then thrown away by the cut.
 *
 * Eight costs nothing extra in retrieval — the candidates are already fetched —
 * only prompt tokens.
 *
 * A real reranker now sits behind RERANKER_PROVIDER (llm-rerank.service.ts),
 * which is what makes this number a genuine selection rather than a slice of
 * an unchanged order. Eight still holds with it enabled: the reranker decides
 * WHICH eight, not how many.
 */
const ANSWER_EXCERPTS = 8;

/**
 * The cap when the question explicitly names a figure or table, so the
 * referenced chunk can go first WITHOUT evicting a ranked excerpt.
 */
const ANSWER_EXCERPTS_WITH_REFERENCE = ANSWER_EXCERPTS + 2;

@Controller('api/books')
@UseGuards(BetterAuthGuard, RolesGuard, TierGuard, AiFeatureGuard)
export class BookChatController {
  private readonly logger = new Logger(BookChatController.name);

  constructor(
    private ragSearch: RagSearchService,
    private contentSpine: ContentSpineService,
    private curriculumScope: CurriculumScopeClientService,
    // By TOKEN, not by concrete class. Injecting RerankService directly meant
    // the RERANKER_PROVIDER binding in rag.module.ts was decorative — swapping
    // useClass there changed nothing on the answer path.
    @Inject(RERANKER_PROVIDER) private reranker: IRerankerProvider,
    private chatService: BookChatService,
    private dialoguePolicy: DialoguePolicyService,
    private masteryAwareRetrieval: MasteryAwareRetrievalService,
    private answerCache: AnswerCacheService,
    private prisma: PrismaService,
    private userPreferences: UserPreferencesService,
    @Inject(LLM_PROVIDER) private llmProvider: ILlmProvider,
  ) {}

  @Get(':bookId/chat')
  @Roles('super-admin', 'admin', 'librarian', 'teacher', 'student')
  @AiFeatureGate('varta')
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) // 20 req/min per user
  async streamChat(
    @Param('bookId') bookId: string,
    @Query('q') query: string,
    @Query('mode') modeParam: string | undefined,
    @Req() req: any,
    @Res() res: Response,
  ) {
    // ── Validation (BEFORE headers are sent → proper HTTP errors) ──
    if (!query?.trim()) {
      throw new ForbiddenException('Query parameter "q" is required.');
    }
    const mode: DialogueMode = (modeParam as DialogueMode) ?? 'explain';
    if (!DIALOGUE_MODES.includes(mode)) {
      throw new ForbiddenException(
        `"mode" must be one of: ${DIALOGUE_MODES.join(', ')}`,
      );
    }

    // Book exists + is embedded
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');
    if (book.embeddingStatus !== 'READY') {
      throw new ForbiddenException('This book has not been AI-embedded yet.');
    }

    // Object-level authorization: bind the caller to the book's tenant. The
    // global catalog (__SYSTEM__) is readable by everyone; any tenant-scoped
    // book requires an ACTIVE membership in that tenant. Without this, a user in
    // tenant A could chat-extract a book in tenant B by id, since the search
    // below is scoped to the *book's* tenant, not the caller's.
    const SYSTEM_TENANT = '__SYSTEM__';
    if (book.tenantId && book.tenantId !== SYSTEM_TENANT) {
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: {
          userId: req.user.id,
          tenantId: book.tenantId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenException('You do not have access to this book.');
      }
    }

    // Per-user daily message quota check
    await this.chatService.checkDailyQuota(req.user.id);

    // Per-tenant token quota check (estimate ~1k tokens for a typical query+context)
    const estimatedQueryTokens = Math.min(
      Math.round(query.length / 4) + 1000, // rough estimate: query chars + context
      this.chatService.maxQueryTokens,
    );
    const quotaResult = await this.chatService.checkAndIncrementTenantQuota(
      book.tenantId,
      estimatedQueryTokens,
    );

    // ── Set SSE headers (point of no return — no HTTP errors after this) ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx compatibility
    res.flushHeaders();

    try {
      // Send quota warning as first SSE event if applicable
      if (quotaResult.warning) {
        res.write(
          `data: ${JSON.stringify({ quotaWarning: quotaResult.warning, done: false })}\n\n`,
        );
      }

      // ── Cache lookup, before any paid work ──
      //
      // Placed after the quota checks on purpose: a cached answer still counts
      // against the student's daily message allowance, because from their side
      // it is a question asked and answered. What it skips is the embedding
      // call, the retrieval, and the completion — the parts that cost money.
      const scopeNodeIds = await this.curriculumScope.getScopeForUser(
        req.user.id,
      );
      // The saved answer-language preference (English or Hindi; default English).
      // Read here, before the cache key, because the shared answer cache MUST be
      // keyed by it — see buildAnswerKey — or a forced-language answer would leak
      // to a student who never asked for it.
      const answerLanguage = await this.userPreferences.getAnswerLanguage(
        req.user.id,
      );
      const cacheKey = isCacheableMode(mode)
        ? buildAnswerKey({ bookId, mode, query, scopeNodeIds, answerLanguage })
        : null;

      if (cacheKey) {
        const cached = this.answerCache.get(cacheKey);
        if (cached) {
          // Replayed as the same frame sequence a fresh answer produces, so the
          // client needs no knowledge that a cache exists. Sent whole rather
          // than re-chunked: the content is already complete, and faking a
          // typing delay to disguise a fast answer would be theatre.
          res.write(
            `data: ${JSON.stringify({ content: cached.content, done: false })}\n\n`,
          );
          res.write(
            `data: ${JSON.stringify({ content: '', done: true, citations: cached.citations, weakConceptLabels: [] })}\n\n`,
          );
          res.end();

          this.chatService
            .saveMessages(
              req.user.id,
              bookId,
              book.tenantId,
              query,
              cached.content,
              cached.citations,
              mode,
            )
            .catch((err) =>
              console.error('Failed to save cached chat message:', err),
            );
          return;
        }
      }

      // ── Search Qdrant (tenant-isolated, pre-scoped to the student's institute
      // curriculum where one is configured — see curriculum-scope-client.service.ts
      // for why this fails open rather than blocking search on a hub hiccup.
      // scopeNodeIds is resolved above, since the cache key depends on it) ──
      //
      // Which canonical work this book is. Book Buddy's bookId means nothing to the
      // shared collection, so without this the search cannot be scoped to the
      // book the student is actually reading — and rag-search refuses rather
      // than answer from the whole library and cite something else.
      const contentItemId =
        await this.contentSpine.resolveContentItemId(bookId);
      const chunks = await this.ragSearch.search(query, {
        tenantId: book.tenantId,
        bookId,
        contentItemId: contentItemId ?? undefined,
        topK: 5,
        scopeNodeIds,
      });

      // ── Rerank ──
      const reranked = await this.reranker.rerank(
        query,
        chunks as any,
        ANSWER_EXCERPTS,
      );

      // ── §2 mastery-aware retrieval: splice in passages anchored to
      // concepts the student is weak on, even if they didn't rank highly on
      // pure similarity. Feature-flagged and best-effort — a miss or an
      // error here silently falls back to plain retrieval. ──
      const { chunks: augmented, weakConceptLabels } = this
        .masteryAwareRetrieval.enabled
        ? await this.masteryAwareRetrieval.augment(
            bookId,
            req.user.id,
            query,
            reranked as any,
          )
        : { chunks: reranked, weakConceptLabels: [] as string[] };

      // ── Figure/table lookup ──
      // A question that names a figure or table by number ("what is in figure
      // 8.3?") is answered from the wrong chunks, because the figure's own
      // passage ranks below the surrounding prose on semantic similarity. Pull
      // the labelled chunk in explicitly and put it first, so "explain the
      // book's figures" actually reaches the figure. Best-effort — a failure
      // here just leaves the normal retrieval untouched.
      let contextChunks: any[] = augmented;
      try {
        const refChunks = await this.ragSearch.findByReference(query, {
          tenantId: book.tenantId,
          bookId,
          contentItemId: contentItemId ?? undefined,
          scopeNodeIds,
        });
        if (refChunks.length > 0) {
          const seen = new Set(augmented.map((c: any) => c.qdrantPointId));
          const extra = refChunks.filter(
            (c: any) => !seen.has(c.qdrantPointId),
          );
          // Referenced figure first, then the ranked excerpts. The cap has to
          // sit ABOVE ANSWER_EXCERPTS, not below it: at a flat 6 against a cut
          // of 8 this branch would silently hand the model FEWER excerpts than
          // the ordinary path, so naming a figure would make every other part
          // of the question harder to answer.
          contextChunks = [...extra, ...augmented].slice(
            0,
            ANSWER_EXCERPTS_WITH_REFERENCE,
          );
        }
      } catch {
        /* best-effort — normal retrieval already stands on its own */
      }

      // WHICH excerpts actually reached the model, by printed page.
      //
      // Retrieval already logs how many candidates it found, which is the least
      // useful half of the question: "20 hit(s)" looks healthy while the model
      // answers "not in the book", because the hits are logged BEFORE the cut
      // that discards most of them. Diagnosing that required rebuilding the
      // query by hand against production Qdrant. The selected pages are what
      // makes a wrong answer checkable against the book directly.
      this.logger.debug(
        `answering from ${contextChunks.length} excerpt(s): pages [` +
          `${contextChunks.map((c: any) => c.pageNumber ?? '?').join(', ')}]`,
      );

      // ── Build LLM prompt — §6 dialogue policy selects the system instruction ──
      // answerLanguage was read above (it also keys the answer cache).
      const systemPrompt = await this.dialoguePolicy.buildSystemPrompt(
        mode,
        book,
        req.user.id,
        bookId,
        weakConceptLabels,
        answerLanguage,
      );

      // Numbered from 1, and the number is the ONLY handle the model is given.
      // It used to be labelled with the opaque `[chunk:<id>]`, which the model
      // was asked to echo back as `[cite:<id>]` — a long token it had every
      // incentive to paraphrase or truncate, and which no client parsed. A
      // small integer is cheap to reproduce exactly and trivial to validate
      // against the served set below.
      const contextBlock = contextChunks
        .map(
          (c: any, i: number) =>
            `[${i + 1}] (Page ${c.pageNumber ?? 'Unknown'})\n${c.text || c.content}`,
        )
        .join('\n\n');

      // ── Stream LLM response ──
      let fullContent = '';

      const messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Book excerpts:\n${contextBlock}\n\nQuestion: ${query}`,
        },
      ];

      // The client hanging up must STOP the generation, not merely stop us
      // writing into a dead socket. The Stop button aborts only the browser's
      // fetch, so without this the provider ran the answer to completion and
      // every one of those tokens was billed for something nobody would ever
      // read — on every Stop press, every tab close, and every time a phone
      // backgrounds the page, which on mobile is constant.
      //
      // The 60s budget is preserved but now shares one signal with the
      // client-gone case, and the previous `req.socket ? ... : undefined`
      // guard is gone: it silently ran with NO timeout whenever that was
      // falsy, which is the opposite of what a fallback should do.
      const abort = new AbortController();
      const onClientGone = () => abort.abort();
      res.on('close', onClientGone);
      const timeout = setTimeout(() => abort.abort(), 60_000);

      try {
        await this.llmProvider.chatStream(
          messages,
          (token) => {
            fullContent += token;
            res.write(
              `data: ${JSON.stringify({ content: token, done: false })}\n\n`,
            );
          },
          abort.signal,
        );
      } finally {
        clearTimeout(timeout);
        res.off('close', onClientGone);
      }

      // Client already gone: there is no one to send the terminal frame to, and
      // writing to a closed socket throws. Persist what was generated — those
      // tokens were paid for, so the partial answer belongs in history rather
      // than being dropped — then stop.
      if (res.writableEnded || res.destroyed) {
        if (fullContent) {
          this.chatService
            .saveMessages(
              req.user.id,
              bookId,
              book.tenantId,
              query,
              fullContent,
              [],
              mode,
            )
            .catch((err) =>
              console.error('Failed to save aborted chat message:', err),
            );
        }
        return;
      }

      // Never leave the bubble blank. A small model sometimes returns an empty
      // completion instead of emitting the "I couldn't find this" fallback the
      // prompt asks for — which rendered as an empty answer with no error. Send
      // an honest line so the reader always sees a response, and record it.
      if (!fullContent.trim()) {
        const refs = parseReferences(query);
        // Keyed by the learner's saved language, not by detecting the question's
        // script — the answer language no longer follows the question.
        const fallback =
          refs.length > 0
            ? referenceNotFoundMessage(
                answerLanguage,
                refs.map((r) => r.label).join(' or '),
              )
            : notFoundMessage(answerLanguage);
        res.write(
          `data: ${JSON.stringify({ content: fallback, done: false })}\n\n`,
        );
        fullContent = fallback;
      }

      // Final event: citations metadata, keyed by the same 1-based number the
      // model was shown in contextBlock so the client can resolve `[2]` to a page.
      const servedCitations = contextChunks.map((c: any, i: number) => ({
        index: i + 1,
        chunkId: c.citationId || `${c.bookId}:${c.chunkIndex ?? 0}`,
        qdrantPointId: c.qdrantPointId,
        pageNumber: c.pageNumber,
        chapterTitle: c.chapterTitle,
        textPreview: c.textPreview,
      }));

      // Only what the model actually cited, not everything retrieval happened
      // to return — see citation-markers.ts for why that distinction is the
      // whole point, and for the three-file format contract this participates in.
      const citations = filterCitedOnly(servedCitations, fullContent);

      // weakConceptLabels surfaces §2's scaffolding decision to the client —
      // previously computed but never sent, so the UI had no way to show
      // when/why a response was scaffolded for a concept the student hasn't
      // mastered yet. Empty when the feature is off or found no intersection.
      res.write(
        `data: ${JSON.stringify({ content: '', done: true, citations, weakConceptLabels })}\n\n`,
      );
      res.end();

      // Cache only an answer that is safe to hand to the next student. A
      // scaffolded one was rewritten for this reader's specific gaps (§2), so
      // it is personal by construction even though the mode is cacheable; the
      // service separately refuses answers with no citations.
      if (cacheKey && weakConceptLabels.length === 0) {
        this.answerCache.set(cacheKey, { content: fullContent, citations });
      }

      // Persist chat history asynchronously — don't block response
      this.chatService
        .saveMessages(
          req.user.id,
          bookId,
          book.tenantId,
          query,
          fullContent,
          citations,
          mode,
        )
        .catch((err) => console.error('Failed to save chat message:', err));
    } catch (err) {
      // Stream-safe error: send as SSE event, then close.
      //
      // The full error goes to the log; the student gets a short message that says what they
      // can do. A raw provider error can name the model, the account's billing state or a
      // masked key, and tells a student nothing they can act on.
      this.logger.error(
        `Varta chat failed for book ${bookId}: ${err?.message}`,
        err?.stack,
      );
      res.write(
        `data: ${JSON.stringify({ error: clientMessageForAiError(err), done: true })}\n\n`,
      );
      res.end();
    }
  }

  // ── Chat History ──
  @Get(':bookId/chat-history')
  @Roles('super-admin', 'admin', 'librarian', 'teacher', 'student')
  async getChatHistory(@Param('bookId') bookId: string, @Req() req: any) {
    return this.chatService.getHistory(req.user.id, bookId);
  }

  // ── Citation Resolution ──
  @Get(':bookId/chunks/:chunkId/location')
  @Roles('super-admin', 'admin', 'librarian', 'teacher', 'student')
  async resolveChunkLocation(
    @Param('bookId') bookId: string,
    @Param('chunkId') chunkId: string,
  ) {
    const mapping = await this.prisma.bookChunkMapping.findUnique({
      where: { qdrantPointId: chunkId },
    });
    if (!mapping || mapping.bookId !== bookId) {
      throw new NotFoundException('Chunk not found for this book');
    }
    return {
      pageNumber: mapping.pageNumber,
      chapterTitle: mapping.chapterTitle,
      textPreview: mapping.textPreview,
      chunkIndex: mapping.chunkIndex,
      citationId: `${mapping.bookId}:${mapping.chunkIndex}`,
    };
  }

  // ── GDPR: Delete all AI chat data ──
  @Delete('ai-history')
  @Roles('super-admin', 'admin', 'librarian', 'teacher', 'student')
  async deleteAllAiHistory(@Req() req: any) {
    const { count } = await this.prisma.bookChatMessage.deleteMany({
      where: { userId: req.user.id },
    });
    return { deleted: count };
  }
}
