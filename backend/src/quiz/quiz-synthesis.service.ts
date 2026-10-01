import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QdrantInitService } from '../rag/qdrant-init.service';
import { ILlmProvider, LLM_PROVIDER } from '../rag/interfaces/llm.provider.interface';
import {
  AnswerLanguage,
  bookAnswerLanguage,
  contentLanguageDirective,
  LANGUAGE_LABEL,
} from '../common/language/answer-language';
import { detectScript } from '../common/language/script-detect';

// Shared trio collection — same as Varta (rag-search.service.ts). Quiz retrieves
// chunk text by the trio point ids stored in BookChunkMapping (see below), so it
// must read from this collection; `book_buddy_books_v1` was deleted in the reset.
const COLLECTION = process.env.QDRANT_COLLECTION_NAME || 'trio_content_v1_openai3072';
/**
 * Chunks per generation window. A chapter is split into windows and each one
 * is asked for its own questions, which is what spreads them across the
 * chapter's pages instead of clustering on whichever passage the model found
 * most quotable.
 *
 * Twelve is a balance: small enough that a window covers only a few pages, big
 * enough that each still holds a coherent stretch of argument to ask about,
 * and that a chapter needs a handful of calls rather than dozens.
 */
const CHUNKS_PER_WINDOW = 12;

/**
 * Items requested per window. With ~12 chunks to a window this lands near two
 * questions per printed page across a chapter — enough that a student who read
 * three or four pages gets a real quiz rather than "no questions cover those
 * pages".
 *
 * Generation is one batched call per window plus a gate per surviving draft,
 * paid once per chapter and cached forever, so depth is close to free at read
 * time. It is not free at generation time, which is why this is not larger.
 */
const ITEMS_PER_WINDOW = 6;

/**
 * Below this, a chapter's bank is topped up on next request. Chapters
 * generated before windowed generation hold only a handful of items, clustered
 * on a few pages, which is exactly the "no questions cover those pages"
 * complaint that page-scoped quizzing surfaces.
 */
const MIN_USABLE_ITEMS_PER_CHAPTER = 8;

/**
 * How many questions a page-scoped request aims for. The reader picks a page
 * (or small range); we generate this many for it, save them keyed to that page,
 * and serve a random sample so a repeat — or a second reader — gets the same
 * page's questions shuffled rather than a whole-book bank of dozens.
 */
const ITEMS_PER_PAGE_REQUEST = 5;

interface RawChunk {
  qdrantPointId: string;
  chunkIndex: number;
  pageNumber: number | null;
  text: string;
}

interface DraftItem {
  type: 'mcq' | 'short_answer';
  prompt: string;
  choices: string[] | null;
  answer: string;
  concept: string | null;
  quote: string;
}

@Injectable()
export class QuizSynthesisService {
  private readonly logger = new Logger(QuizSynthesisService.name);
  /** Chapters already topped up in this process — see getOrGenerate. */
  private readonly topUpAttempted = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private qdrantInit: QdrantInitService,
    @Inject(LLM_PROVIDER) private llmProvider: ILlmProvider,
  ) {}

  /**
   * Cache-or-generate: returns existing items for this chapter if any exist,
   * otherwise generates, quality-gates, and persists a fresh bank before
   * returning it. Matches the spec's "generates on first request, caches
   * after" contract — no proactive background job, deliberately, to avoid
   * a second BullMQ queue for a feature that's cheap to generate lazily.
   */
  async getOrGenerate(bookId: string, chapterTitle: string) {
    const existing = await this.prisma.quizItem.findMany({
      where: { bookId, chapterTitle },
      orderBy: { createdAt: 'asc' },
    });

    /* Only items the reader can actually answer.
       Banks generated before the MCQ-only change contain short_answer items
       with a null `choices`, and the one-question-at-a-time UI renders its
       options from that array — so such an item appears with a prompt and
       nothing to tap, and the student cannot answer it or move past it. They
       are filtered here rather than deleted: dropping rows is a destructive
       write against production data, and hiding them costs nothing. */
    const usable = existing.filter((i) => this.isUsableItem(i));
    if (usable.length >= MIN_USABLE_ITEMS_PER_CHAPTER) return usable;

    /* THE STUDENT NEVER WAITS FOR A FULL BANK.
       Generating a chapter is one drafting call per window plus a quality gate
       per surviving draft — around twenty sequential model calls for a chapter
       this size. Awaiting all of that inside the HTTP request meant "Writing
       your questions…" for minutes and a browser that gave up first, while the
       work carried on server-side. Depth is a background concern; having
       something to answer is not. */
    if (usable.length > 0) {
      this.scheduleTopUp(bookId, chapterTitle, 0);
      return usable;
    }

    /* Cold start: nothing to show at all, so one window is generated inline —
       a few calls, seconds not minutes — and the rest follow behind. */
    const firstWindow = await this.generate(bookId, chapterTitle, { fromWindow: 0, maxWindows: 1 });
    this.scheduleTopUp(bookId, chapterTitle, 1);
    return firstWindow.filter((i: any) => this.isUsableItem(i));
  }

  /**
   * Fill out the rest of a chapter's bank without anyone waiting on it.
   *
   * `fromWindow` skips what was already generated, so the background pass
   * cannot duplicate the window served inline — the same question appearing
   * twice in one quiz is worse than a short bank.
   *
   * Guarded by an in-flight set: concurrent requests for the same chapter must
   * not each start a generation run, and a chapter whose generation keeps
   * yielding nothing is attempted once per process rather than on every
   * request, which would turn a quality problem into a spend problem.
   */
  private scheduleTopUp(bookId: string, chapterTitle: string, fromWindow: number): void {
    const key = `${bookId}::${chapterTitle}`;
    if (this.topUpAttempted.has(key)) return;
    this.topUpAttempted.add(key);

    void this.generate(bookId, chapterTitle, { fromWindow })
      .then((items) =>
        this.logger.log(`Background top-up added ${items.length} item(s) to "${chapterTitle}"`),
      )
      .catch((err) => {
        // Must not reject unhandled: this runs detached from any request, and
        // an unhandled rejection takes the process down with it.
        this.logger.error(`Background top-up failed for "${chapterTitle}": ${err.message}`);
      });
  }

  /** A four-option MCQ whose answer is one of the options. */
  private isUsableItem(item: any): boolean {
    if (item?.type !== 'mcq') return false;
    return Array.isArray(item.choices) && item.choices.length === 4;
  }

  /**
   * Every chapter's bank, for the whole-book scope.
   *
   * Chapters are generated on demand and cached, so the first whole-book quiz
   * on a fresh book pays for each chapter once and every later one is free.
   * Generated sequentially rather than in parallel: each chapter is a batched
   * LLM call plus a quality gate per item, and firing them all at once on a
   * ten-chapter book would spike the provider and the VPS together for no
   * gain the student can perceive.
   */
  async getOrGenerateForBook(bookId: string): Promise<any[]> {
    const chapters = await this.prisma.bookChunkMapping.findMany({
      where: { bookId },
      distinct: ['chapterTitle'],
      orderBy: { chunkIndex: 'asc' },
      select: { chapterTitle: true },
    });

    const all: any[] = [];
    for (const { chapterTitle } of chapters) {
      if (!chapterTitle) continue;
      all.push(...(await this.getOrGenerate(bookId, chapterTitle)));
    }
    return all;
  }

  private async generate(
    bookId: string,
    chapterTitle: string,
    opts: { fromWindow?: number; maxWindows?: number } = {},
  ) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return [];

    const chunks = await this.fetchChapterChunks(bookId, chapterTitle);
    if (chunks.length === 0) {
      this.logger.warn(`No chunks found for "${chapterTitle}" in book ${bookId} — nothing to generate from.`);
      return [];
    }

    const concepts = await this.prisma.graphNode.findMany({
      where: { bookId, firstChapter: chapterTitle },
      select: { id: true, label: true },
    });

    const conceptByLabel = new Map(concepts.map((c) => [c.label.toLowerCase(), c.id]));
    const persisted: any[] = [];

    /* Generated per WINDOW, not per chapter.

       One call over the whole chapter produced items clustered wherever the
       model found the most quotable prose — usually the opening pages — so a
       student who read pages 190-193 could get "no questions cover those
       pages" from a chapter with a full bank. Raising the item count alone
       does not fix that; it makes a bigger cluster. Splitting the chapter and
       asking for items from each part is what actually spreads them across
       the pages, which is what page-scoped quizzing needs.

       Windows are chunk-based rather than page-based because chunk boundaries
       are where the text actually divides; a page can hold several chunks or
       be split across two. */
    const allWindows: RawChunk[][] = [];
    for (let i = 0; i < chunks.length; i += CHUNKS_PER_WINDOW) {
      allWindows.push(chunks.slice(i, i + CHUNKS_PER_WINDOW));
    }

    // Slicing rather than regenerating from the start is what keeps the
    // background pass from duplicating whatever was served inline.
    const from = opts.fromWindow ?? 0;
    const windows =
      opts.maxWindows != null
        ? allWindows.slice(from, from + opts.maxWindows)
        : allWindows.slice(from);

    // The item bank is shared across every reader of this book, so it is
    // generated in the BOOK's language, never one student's preference.
    const language = bookAnswerLanguage(book.language);

    for (const windowChunks of windows) {
      persisted.push(
        ...(await this.generateFromWindow(
          bookId,
          chapterTitle,
          book.title,
          windowChunks,
          concepts,
          conceptByLabel,
          ITEMS_PER_WINDOW,
          language,
        )),
      );
    }

    const pagesCovered = new Set(persisted.map((i) => i.citedPage).filter((p) => p != null));
    this.logger.log(
      `Generated ${persisted.length} items for "${chapterTitle}" (book ${bookId}) across ` +
        `${windows.length} window(s) from #${from}, covering ${pagesCovered.size} page(s)`,
    );
    return persisted;
  }

  /**
   * Draft → ground → quality-gate → persist one window of chunks. Shared by the
   * chapter windows above and the page-scoped path below so both write items
   * with identical provenance (citedPage from the window's own text, never the
   * whole chapter's) and the same quality bar. Returns the persisted items.
   */
  private async generateFromWindow(
    bookId: string,
    chapterTitle: string,
    bookTitle: string,
    windowChunks: RawChunk[],
    concepts: { id: string; label: string }[],
    conceptByLabel: Map<string, string>,
    itemCount: number,
    language: AnswerLanguage,
    minChars = 200,
  ): Promise<any[]> {
    const windowText = windowChunks.map((c) => c.text).join('\n\n');
    if (windowText.trim().length < minChars) return []; // too thin to ask about

    const drafts = await this.draftItems(
      windowText,
      bookTitle,
      chapterTitle,
      concepts.map((c) => c.label),
      itemCount,
      language,
    );

    // Free check first — a quote not verbatim in the passage is a hallucination
    // a string search catches for nothing, before spending a gate call.
    const grounded = drafts
      .map((draft) => ({
        draft,
        provenance: this.resolveSpan(windowChunks, windowText, draft.quote),
      }))
      .filter((g) => {
        if (!g.provenance.quoteFound) {
          this.logger.debug(`Dropped item (quote not verbatim): "${g.draft.prompt.slice(0, 60)}..."`);
        }
        return g.provenance.quoteFound;
      });

    // Free script check before the paid gate: catches the Hindi/English half of
    // a language slip for nothing. (It cannot catch Italian — that is Latin
    // script too — which is what the gate's language question is for.)
    const onLanguage = grounded.filter((g) => {
      if (this.matchesScript(g.draft, language)) return true;
      this.logger.debug(`Dropped item (wrong script for ${language}): "${g.draft.prompt.slice(0, 60)}..."`);
      return false;
    });

    // Gates run concurrently — independent judgements on separate drafts.
    const gates = await Promise.all(onLanguage.map((g) => this.qualityGate(g.draft, windowText, language)));

    const out: any[] = [];
    for (let k = 0; k < onLanguage.length; k++) {
      const { draft, provenance } = onLanguage[k];
      const gate = gates[k];
      if (!gate.pass) {
        this.logger.debug(`Dropped item (quality gate ${gate.score.toFixed(2)}): "${draft.prompt.slice(0, 60)}..."`);
        continue;
      }
      const item = await this.prisma.quizItem.create({
        data: {
          bookId,
          chapterTitle,
          conceptId: draft.concept ? conceptByLabel.get(draft.concept.toLowerCase()) ?? null : null,
          type: draft.type,
          prompt: draft.prompt,
          choices: draft.choices ?? undefined,
          answer: draft.answer,
          citedPage: provenance.pageNumber ?? undefined,
          spanStart: provenance.spanStart ?? undefined,
          spanEnd: provenance.spanEnd ?? undefined,
          qdrantPointId: provenance.qdrantPointId ?? undefined,
          qualityScore: gate.score,
        },
      });
      out.push(item);
    }
    return out;
  }

  // ── Page-scoped quiz (the reader picks a page or small range) ─────────
  //
  // A reader who selects page 86 wants a short quiz ON page 86, not the whole
  // book's bank filtered down. So generate ~ITEMS_PER_PAGE_REQUEST questions
  // from just that page's chunks, save them (keyed by citedPage), and serve a
  // random sample — a second reader on the same page gets those saved questions
  // shuffled, not a fresh spend. This replaces "generate the whole book, then
  // filter by page", which produced the dozens-of-questions surprise.

  async getOrGenerateForPages(
    bookId: string,
    pages: number[],
    targetCount = ITEMS_PER_PAGE_REQUEST,
  ): Promise<any[]> {
    if (pages.length === 0) return [];

    const existing = await this.prisma.quizItem.findMany({
      where: { bookId, citedPage: { in: pages } },
      orderBy: { createdAt: 'asc' },
    });
    const usable = existing.filter((i) => this.isUsableItem(i));

    // Enough already saved for these pages — serve a random subset. This is the
    // "another reader asks for the same page" path: reuse, don't regenerate.
    if (usable.length >= targetCount) return this.sample(usable, targetCount);

    // Top up to the target from THIS page range's chunks only.
    const need = targetCount - usable.length;
    const fresh = await this.generateForPages(bookId, pages, need);
    const combined = [...usable, ...fresh.filter((i) => this.isUsableItem(i))];
    return this.sample(combined, targetCount);
  }

  private async generateForPages(bookId: string, pages: number[], need: number): Promise<any[]> {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) return [];

    const { chunks, chapterTitle } = await this.fetchPageChunks(bookId, pages);
    if (chunks.length === 0) {
      this.logger.warn(`No chunks on pages [${pages.join(', ')}] for book ${bookId} — nothing to generate.`);
      return [];
    }

    // A page (or small range) is one window. Cap the text so a wide range
    // doesn't send an oversized prompt; the char budget mirrors a chapter window.
    const CHAR_BUDGET = CHUNKS_PER_WINDOW * 700;
    const window: RawChunk[] = [];
    let used = 0;
    for (const c of chunks) {
      if (used + c.text.length > CHAR_BUDGET && window.length > 0) break;
      window.push(c);
      used += c.text.length;
    }

    // Keep the page's own chapter so items group with the rest of that chapter;
    // fall back to a range label when the pages carry no chapter metadata.
    const groupChapter =
      chapterTitle ?? `Pages ${pages[0]}${pages.length > 1 ? `–${pages[pages.length - 1]}` : ''}`;

    const concepts = groupChapter
      ? await this.prisma.graphNode.findMany({
          where: { bookId, firstChapter: groupChapter },
          select: { id: true, label: true },
        })
      : [];
    const conceptByLabel = new Map(concepts.map((c) => [c.label.toLowerCase(), c.id]));

    // Over-request a little: some drafts fail the verbatim-quote or quality gate,
    // and a single page has less material to recover from than a whole chapter.
    return this.generateFromWindow(
      bookId,
      groupChapter,
      book.title,
      window,
      concepts,
      conceptByLabel,
      need + 3,
      // The page bank is shared with every other reader of this page, so it
      // follows the book's language rather than the requesting student's.
      bookAnswerLanguage(book.language),
      120, // a single page can be short; don't refuse to ask about it
    );
  }

  /** Chunks whose printed page falls in the requested set, plus the chapter
      those pages belong to (for grouping the saved items). */
  private async fetchPageChunks(
    bookId: string,
    pages: number[],
  ): Promise<{ chunks: RawChunk[]; chapterTitle: string | null }> {
    const mappings = await this.prisma.bookChunkMapping.findMany({
      where: { bookId, pageNumber: { in: pages } },
      orderBy: { chunkIndex: 'asc' },
      select: { qdrantPointId: true, chunkIndex: true, pageNumber: true, chapterTitle: true },
    });
    if (mappings.length === 0) return { chunks: [], chapterTitle: null };

    const qdrant = this.qdrantInit.getClient();
    const points = await qdrant.retrieve(COLLECTION, {
      ids: mappings.map((m) => m.qdrantPointId),
      with_payload: true,
    });
    const textById = new Map(points.map((p) => [String(p.id), ((p.payload as any)?.text as string) ?? '']));

    const chunks = mappings
      .map((m) => ({
        qdrantPointId: m.qdrantPointId,
        chunkIndex: m.chunkIndex,
        pageNumber: m.pageNumber,
        text: textById.get(m.qdrantPointId) ?? '',
      }))
      .filter((c) => c.text.length > 0);

    return { chunks, chapterTitle: mappings.find((m) => m.chapterTitle)?.chapterTitle ?? null };
  }

  /** A random subset of at most `n`, so a quiz run is short and varies between
      attempts even when the saved pool is larger. Fisher-Yates on a copy. */
  sample<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  // ── LLM generation ──────────────────────────────────────────────────

  private async chatComplete(messages: { role: string; content: string }[]): Promise<string> {
    let full = '';
    await this.llmProvider.chatStream(messages, (token) => {
      full += token;
    });
    return full;
  }

  private async draftItems(
    text: string,
    bookTitle: string,
    chapterTitle: string,
    knownConcepts: string[],
    itemCount: number,
    language: AnswerLanguage,
  ): Promise<DraftItem[]> {
    const conceptHint =
      knownConcepts.length > 0
        ? `Known concepts already extracted from this chapter (use one of these exact labels for "concept" where relevant, or null if none fit): ${knownConcepts.join(', ')}.`
        : `No concept list is available — set "concept" to null for every item.`;

    // MCQ ONLY. Short-answer items were graded by a second LLM call against an
    // unrubriced reference answer — a cost on every submission and a source of
    // grader noise that fed straight into the BKT mastery estimate. A
    // four-choice question is graded by string equality: instant, free, and
    // the same verdict every time. It is also what makes the one-tap
    // green/red flow possible, since grading no longer needs a round trip to a
    // model.
    const systemPrompt =
      `You write multiple-choice comprehension questions for chapter "${chapterTitle}" of "${bookTitle}". ` +
      `Generate exactly ${itemCount} questions. Every question MUST be multiple choice with ` +
      `EXACTLY 4 options and EXACTLY ONE correct option.\n` +
      // Multilingual, but CLOSED. This used to say "in the same language as the
      // passage below" — an unnamed target the model had to infer. On a page of
      // Latin-derived anatomy labels (Clavicle, Scapula, Humerus) it inferred
      // ITALIAN and generated the whole quiz in it, and nothing downstream
      // checks language, so it reached the student. The target is now named.
      `${contentLanguageDirective(language)}\n` +
      `Write any mathematical or chemical expression as LaTeX ($...$ inline).\n` +
      `${conceptHint}\n` +
      `Return ONLY a JSON array, no prose, matching exactly this shape:\n` +
      `[{"type":"mcq","prompt":"...","choices":["A","B","C","D"],` +
      `"answer":"the full text of the correct option, copied exactly from choices",` +
      `"concept":"label or null",` +
      `"quote":"a short verbatim phrase from the passage that grounds the answer"}]\n` +
      `Rules:\n` +
      `- "answer" must be character-for-character identical to one of the four "choices".\n` +
      // Distractors are the difference between assessment and a coin flip. An
      // obviously absurd option turns a 4-way question into a 2-way guess,
      // which also breaks the 1/N guess probability BKT assumes.
      `- The three wrong options must be PLAUSIBLE — real misconceptions or facts from elsewhere in ` +
      `the passage — never nonsense, never joke answers, and never "none of the above".\n` +
      `- Do not make the correct option consistently the longest or most detailed.\n` +
      `- Vary difficulty: some recall, some application.\n` +
      `- Every question must be answerable strictly from the passage. "quote" MUST be copied verbatim — ` +
      `it locates the source, so paraphrasing breaks citation. It is the ONE field that stays in the ` +
      `passage's own words even if that is not ${LANGUAGE_LABEL[language]}.\n` +
      // Repeated last on purpose: the language rule is the one this prompt has
      // actually been observed to break, and the final instruction is the one a
      // model is most likely to still be holding when it starts writing.
      `- Every "prompt", every entry in "choices" and the "answer" must be written in ` +
      `${LANGUAGE_LABEL[language]}.`;

    const raw = await this.chatComplete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ]);

    return this.parseDrafts(raw);
  }

  /**
   * Structural validation, free and before any LLM call.
   *
   * The prompt asks for four plausible options with exactly one correct, but
   * nothing checked. A malformed item is worse than a missing one: three
   * options renders a broken question, an "answer" that matches no choice can
   * never be selected so the student is always wrong, and duplicate options
   * make two taps correct while only one scores. Each of those reaches the
   * student looking like a real question.
   */
  private isWellFormedMcq(d: any): boolean {
    if (!d || d.type !== 'mcq' || !d.prompt || !d.answer || !d.quote) return false;
    if (!Array.isArray(d.choices) || d.choices.length !== 4) return false;
    if (!d.choices.every((c: unknown) => typeof c === 'string' && c.trim().length > 0)) return false;

    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const normalized = d.choices.map(norm);

    // Duplicates would make more than one tap "the" correct answer.
    if (new Set(normalized).size !== 4) return false;

    // The answer must actually be selectable. Grading is string equality
    // against a choice, so an answer that matches nothing marks every student
    // wrong no matter what they pick.
    return normalized.includes(norm(d.answer));
  }

  /**
   * Is the draft written in the right SCRIPT? Free, synchronous, and only half
   * the language check — it separates Devanagari from Latin, so it catches a
   * Hindi book answered in English (or the reverse) and nothing else. A drift
   * from English into another Latin-script language passes here and is caught
   * by the quality gate's language question instead.
   *
   * `quote` is excluded on purpose: it is copied verbatim from the passage, so
   * it is legitimately in the source's script whatever the target language is.
   */
  private matchesScript(draft: DraftItem, language: AnswerLanguage): boolean {
    const text = [draft.prompt, ...(draft.choices ?? []), draft.answer].join(' ');
    const script = detectScript(text);
    // 'unknown' means no alphabetic characters at all (a purely numeric or
    // symbolic item) — nothing to judge, so don't drop it on a guess.
    if (script === 'unknown') return true;
    return language === 'hi' ? script !== 'latin' : script !== 'deva';
  }

  private parseDrafts(raw: string): DraftItem[] {
    const cleaned = raw.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '');
    try {
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((d) => this.isWellFormedMcq(d));
    } catch {
      return [];
    }
  }

  /**
   * Second LLM pass: is the draft's answer actually entailed by the source
   * text, or did the model hallucinate a plausible-sounding question? This
   * is what keeps the item bank grounded — the classic failure mode for
   * LLM-generated quizzes is questions that sound right but aren't
   * verifiable against the source.
   */
  private async qualityGate(
    draft: DraftItem,
    sourceText: string,
    language: AnswerLanguage,
  ): Promise<{ pass: boolean; score: number }> {
    const prompt =
      `Passage:\n${sourceText}\n\n` +
      `Question: ${draft.prompt}\n` +
      `Options: ${(draft.choices ?? []).join(' | ')}\n` +
      `Stated answer: ${draft.answer}\n\n` +
      `Answer two things about the question above. ` +
      `(1) Is the stated answer fully and correctly supported by the passage? ` +
      // The language check rides along on a call we are already paying for.
      // It is the only thing that catches a drift into a third language that
      // shares the Latin script — the Italian quiz got through precisely
      // because nothing downstream ever asked what language an item was in.
      `(2) Are the question and all of its options written in ${LANGUAGE_LABEL[language]}? ` +
      `Answer false to (2) if any part of it is in a different language. ` +
      `Return ONLY a JSON object: ` +
      `{"supported": true|false, "confidence": 0.0-1.0, "inLanguage": true|false}`;

    try {
      const raw = await this.chatComplete([{ role: 'user', content: prompt }]);
      const cleaned = raw.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '');
      const parsed = JSON.parse(cleaned);
      const score = typeof parsed.confidence === 'number' ? parsed.confidence : parsed.supported ? 0.7 : 0;
      // `inLanguage` is treated as true when the field is missing, so a model
      // that ignores the new key doesn't empty the bank; an explicit false is
      // what drops the item.
      const inLanguage = parsed.inLanguage !== false;
      if (!inLanguage) {
        this.logger.debug(`Dropped item (gate: not ${language}): "${draft.prompt.slice(0, 60)}..."`);
      }
      return { pass: Boolean(parsed.supported) && score >= 0.5 && inLanguage, score };
    } catch {
      // Fail closed — an unparseable gate response means we couldn't verify
      // the item, so it doesn't enter the live bank.
      return { pass: false, score: 0 };
    }
  }

  // ── Chunk fetching, scoped to one chapter ───────────────────────────

  /**
   * Chapter scope from Postgres, chunk text from the vector store by id.
   *
   * This used to `scroll` Qdrant filtering on `book_id` / `tenant_id` /
   * `chapter_title` — three payload keys that do not exist in the shared trio
   * collection, whose vocabulary is `content_item_id` / `chapter` and which
   * carries no tenant key at all. Measured against production: that filter
   * matched ZERO points. Every quiz generated since the collection migration
   * was therefore silently empty — no error, no items, just an empty bank,
   * for a book with 94 indexed chunks.
   *
   * Retrieving by id rather than filtering by payload is both correct and
   * cheaper. `BookChunkMapping` already stores `qdrantPointId`, `chapterTitle`
   * and `pageNumber` for every ingested chunk, so chapter scoping is an
   * indexed Postgres lookup and Qdrant does a plain id fetch — no payload
   * filter, no scroll pagination, and critically NO EMBEDDING CALL. Quiz reads
   * exactly the vectors Varta answers from; there is no second copy of this
   * book anywhere and nothing is re-embedded to generate a quiz.
   *
   * It is also the same access pattern digest.service.ts already uses
   * successfully against this collection, so the three siblings now agree.
   */
  private async fetchChapterChunks(bookId: string, chapterTitle: string): Promise<RawChunk[]> {
    const mappings = await this.prisma.bookChunkMapping.findMany({
      where: { bookId, chapterTitle },
      orderBy: { chunkIndex: 'asc' },
      select: { qdrantPointId: true, chunkIndex: true, pageNumber: true },
    });
    if (mappings.length === 0) return [];

    const qdrant = this.qdrantInit.getClient();
    const points = await qdrant.retrieve(COLLECTION, {
      ids: mappings.map((m) => m.qdrantPointId),
      with_payload: true,
    });
    const textById = new Map(
      points.map((p) => [String(p.id), ((p.payload as any)?.text as string) ?? '']),
    );

    // Ordered by chunkIndex from the Postgres side — `retrieve` gives no
    // ordering guarantee, and the drafting prompt is fed the joined text as a
    // continuous passage, so order is load-bearing rather than cosmetic.
    return mappings
      .map((m) => ({
        qdrantPointId: m.qdrantPointId,
        chunkIndex: m.chunkIndex,
        pageNumber: m.pageNumber,
        text: textById.get(m.qdrantPointId) ?? '',
      }))
      .filter((c) => c.text.length > 0);
  }

  // ── Provenance resolution (same best-effort approach as GraphExtractionService) ──

  private resolveSpan(
    chunks: RawChunk[],
    windowText: string,
    quote: string,
  ): {
    /** Whether the draft's quote appears verbatim in the source passage.
        False means the model invented it — the caller drops the item before
        paying for the semantic quality gate. */
    quoteFound: boolean;
    pageNumber: number | null;
    spanStart: number | null;
    spanEnd: number | null;
    qdrantPointId: string | null;
  } {
    const fallback = {
      quoteFound: false,
      pageNumber: chunks[0]?.pageNumber ?? null,
      spanStart: null,
      spanEnd: null,
      qdrantPointId: null,
    };
    if (!quote || quote.length < 3) return fallback;

    const idx = windowText.indexOf(quote);
    if (idx === -1) return fallback;

    let cursor = 0;
    for (const chunk of chunks) {
      const chunkEnd = cursor + chunk.text.length;
      if (idx >= cursor && idx < chunkEnd + 2) {
        return {
          quoteFound: true,
          pageNumber: chunk.pageNumber,
          spanStart: idx - cursor,
          spanEnd: idx - cursor + quote.length,
          qdrantPointId: chunk.qdrantPointId,
        };
      }
      cursor = chunkEnd + 2;
    }

    // The quote IS in the passage but straddles a chunk boundary, so it can't
    // be attributed to one point. Grounding is proven — keep the item, and
    // accept that only its precise provenance is unknown.
    return { ...fallback, quoteFound: true };
  }
}
