import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  Inject,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AiFeatureGuard } from '../ai-entitlement/ai-feature.guard';
import { AiFeatureGate } from '../ai-entitlement/ai-feature.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import { QuizSynthesisService } from './quiz-synthesis.service';
import { bookAnswerLanguage } from '../common/language/answer-language';
import { QuizAssistService } from './quiz-assist.service';
import { parsePageSpec } from './page-spec';
import { MasteryService } from './mastery.service';
import { ILlmProvider, LLM_PROVIDER } from '../rag/interfaces/llm.provider.interface';

const SYSTEM_TENANT = '__SYSTEM__';
const READER_ROLES = ['super-admin', 'admin', 'librarian', 'teacher', 'student'];

// A quiz run is short and randomised: every scope serves at most this many
// questions, sampled from the relevant saved pool, so a repeat attempt varies
// and a page selection returns a handful rather than a whole-book bank.
const QUIZ_RUN_SIZE = 5;

@UseGuards(BetterAuthGuard, RolesGuard, AiFeatureGuard)
@Controller()
export class QuizController {
  constructor(
    private prisma: PrismaService,
    private synthesis: QuizSynthesisService,
    private assist: QuizAssistService,
    private mastery: MasteryService,
    @Inject(LLM_PROVIDER) private llmProvider: ILlmProvider,
  ) {}

  // Same object-level authorization as GraphController/BookChatController —
  // duplicated rather than shared across modules for the same three-line-check
  // reason noted there.
  private async authorizeBookAccess(bookId: string, req: any) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    if (book.tenantId && book.tenantId !== SYSTEM_TENANT) {
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: { userId: req.user.id, tenantId: book.tenantId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenException('You do not have access to this book.');
      }
    }
    return book;
  }

  @Get('books/:bookId/chapters/:chapterTitle/quiz')
  @Roles(...READER_ROLES)
  @AiFeatureGate('quiz')
  async getQuiz(
    @Param('bookId') bookId: string,
    @Param('chapterTitle') chapterTitle: string,
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    const items = await this.synthesis.getOrGenerate(bookId, decodeURIComponent(chapterTitle));
    // A random RUN_SIZE slice of the chapter's bank — a short quiz that varies
    // between attempts, not the whole bank at once. Never ship the answer key
    // with the question set; grading happens server-side on submission.
    return this.synthesis.sample(items, QUIZ_RUN_SIZE).map(({ answer, ...rest }) => rest);
  }

  /**
   * Whole-book scope. Same contract as the chapter route: answers stripped,
   * generated on demand and cached per chapter underneath.
   */
  @Get('books/:bookId/quiz')
  @Roles(...READER_ROLES)
  @AiFeatureGate('quiz')
  async getBookQuiz(
    @Param('bookId') bookId: string,
    @Query('pages') pagesSpec: string | undefined,
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);

    // No page selection ⇒ the explicit whole-book scope: a random RUN_SIZE
    // slice of the book's bank (generated/cached per chapter underneath).
    if (!pagesSpec?.trim()) {
      const items = await this.synthesis.getOrGenerateForBook(bookId);
      return this.synthesis.sample(items, QUIZ_RUN_SIZE).map(({ answer, ...rest }) => rest);
    }

    // PRINTED page numbers. The client converts from reader pages using the
    // offset that /books/:id/page-map only returns when it can prove the
    // mapping — see that method for why a guessed offset is worse than no
    // feature.
    const { pages, invalid } = parsePageSpec(pagesSpec);
    if (pages.length === 0) {
      throw new BadRequestException(
        `Could not read a page selection from "${pagesSpec}". Use numbers, ranges, or both — for example 183-190, 195.`,
      );
    }

    // Page-scoped: generate a short quiz for JUST these pages (or serve the
    // ones already saved for them, shuffled), instead of generating the whole
    // book and filtering it down — which is what returned dozens of questions
    // for a single-page selection.
    const items = await this.synthesis.getOrGenerateForPages(bookId, pages);
    const stripped = items.map(({ answer, ...rest }) => rest);

    // Reported rather than silently returned as an empty list: "no questions"
    // and "no questions ON THOSE PAGES" are different answers, and the second
    // one is actionable.
    return {
      items: stripped,
      requestedPages: pages,
      invalidFragments: invalid,
      matched: stripped.length,
    };
  }

  /**
   * Grade ONE item, for the tap-and-see-green/red flow.
   *
   * This exists because the answer key must never reach the client: the
   * obvious way to make an option turn green instantly is to ship the correct
   * answer with the question, which also ships it to anyone reading the
   * network tab. A single round trip per tap keeps the key server-side, and
   * MCQ grading is a string compare so it returns immediately.
   *
   * It is also where the mastery loop finally closes. `submitAttempt` recorded
   * BKT evidence, but a student answering one question at a time never called
   * it — so conversational and one-at-a-time quizzing produced no mastery
   * signal at all. Same recording path, per item.
   */
  @Post('books/:bookId/quiz/items/:itemId/answer')
  @Roles(...READER_ROLES)
  async answerItem(
    @Param('bookId') bookId: string,
    @Param('itemId') itemId: string,
    @Body() body: { answer?: string },
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    const item = await this.loadItem(bookId, itemId);

    const submitted = body?.answer ?? '';
    const correct = this.normalize(submitted) === this.normalize(item.answer);

    await this.prisma.quizAttempt.create({
      data: { userId: req.user.id, itemId: item.id, answer: submitted, correct },
    });

    if (item.conceptId) {
      const numChoices = Array.isArray(item.choices) ? (item.choices as unknown[]).length : null;
      await this.mastery.recordAttempt({
        userId: req.user.id,
        bookId,
        conceptId: item.conceptId,
        correct,
        numChoices,
      });
    }

    return { correct, correctAnswer: item.answer, citedPage: item.citedPage };
  }

  /** Why the right answer is right — generated once per item, then cached. */
  @Post('books/:bookId/quiz/items/:itemId/explain')
  @Roles(...READER_ROLES)
  @AiFeatureGate('quiz')
  async explainItem(
    @Param('bookId') bookId: string,
    @Param('itemId') itemId: string,
    @Req() req: any,
  ) {
    const book = await this.authorizeBookAccess(bookId, req);
    const item = await this.loadItem(bookId, itemId);
    // Same language the item bank was generated in — the explanation sits
    // directly under the question, so it must not arrive in another language.
    return { explanation: await this.assist.explain(item, bookAnswerLanguage((book as any).language)) };
  }

  /**
   * The question, its answer, and any explanation already shown, in the other
   * language. `text` comes from the client so that whatever the student is
   * actually looking at is what gets translated — including an explanation
   * that was generated after the question was served.
   */
  @Post('books/:bookId/quiz/items/:itemId/translate')
  @Roles(...READER_ROLES)
  @AiFeatureGate('quiz')
  async translateItem(
    @Param('bookId') bookId: string,
    @Param('itemId') itemId: string,
    @Body() body: { text?: string },
    @Req() req: any,
  ) {
    const book = await this.authorizeBookAccess(bookId, req);
    const item = await this.loadItem(bookId, itemId);

    const text = body?.text?.trim()
      ? body.text.trim()
      : [item.prompt, ...(Array.isArray(item.choices) ? (item.choices as string[]) : [])].join('\n');

    // Keyed by content, not just item id: the same item translated with an
    // explanation attached is different text from the bare question.
    const key = `${item.id}:${createHash('sha256').update(text).digest('hex').slice(0, 16)}`;
    return this.assist.translate(key, text, (book as any).language);
  }

  private async loadItem(bookId: string, itemId: string) {
    const item = await this.prisma.quizItem.findUnique({ where: { id: itemId } });
    if (!item || item.bookId !== bookId) {
      throw new NotFoundException('Question not found for this book');
    }
    return item;
  }

  @Post('books/:bookId/chapters/:chapterTitle/quiz/attempt')
  @Roles(...READER_ROLES)
  async submitAttempt(
    @Param('bookId') bookId: string,
    @Param('chapterTitle') chapterTitle: string,
    @Body() body: { answers?: { itemId: string; answer: string }[] },
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    const answers = body?.answers;
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new BadRequestException('"answers" must be a non-empty array.');
    }

    const results: Array<{ itemId: string; correct: boolean; correctAnswer: string }> = [];

    for (const submitted of answers) {
      const item = await this.prisma.quizItem.findUnique({ where: { id: submitted.itemId } });
      if (!item || item.bookId !== bookId || item.chapterTitle !== decodeURIComponent(chapterTitle)) {
        continue; // silently skip items that don't belong here rather than fail the whole batch
      }

      const correct = await this.grade(item, submitted.answer ?? '');

      await this.prisma.quizAttempt.create({
        data: { userId: req.user.id, itemId: item.id, answer: submitted.answer ?? '', correct },
      });

      if (item.conceptId) {
        const numChoices = Array.isArray(item.choices) ? (item.choices as unknown[]).length : null;
        await this.mastery.recordAttempt({
          userId: req.user.id,
          bookId,
          conceptId: item.conceptId,
          correct,
          numChoices,
        });
      }

      results.push({ itemId: item.id, correct, correctAnswer: item.answer });
    }

    return results;
  }

  @Get('students/me/mastery')
  @Roles(...READER_ROLES)
  async getMyMastery(@Query('bookId') bookId: string, @Req() req: any) {
    if (!bookId) throw new BadRequestException('"bookId" query parameter is required.');
    await this.authorizeBookAccess(bookId, req);
    return this.mastery.getMasteryVector(req.user.id, bookId);
  }

  // Deferred piece of §4 — the spec's literal route is
  // /institutions/:id/mastery-report?classId=..., but Vidyaverse's academic
  // hub (§15.2 of TRIO_CONTEXT.md) deliberately has no roster/enumeration
  // endpoint — GET /api/v1/academic/my-class is self-scoped only, by design,
  // to prevent exactly the "list every student in class X" query a real
  // classId filter would need. Adding that roster endpoint is a cross-repo,
  // security-sensitive change to a different app's backend, not something to
  // bolt on unilaterally here. This ships a coarser but immediately-buildable
  // substitute: gradeLevel (already synced into User.gradeLevel locally,
  // §15.2) instead of a precise class/section id.
  @Get('institutions/:tenantId/mastery-report')
  @Roles('super-admin', 'admin', 'librarian', 'teacher')
  async getClassMasteryReport(
    @Param('tenantId') tenantId: string,
    @Query('gradeLevel') gradeLevelParam: string,
    @Query('bookId') bookId: string,
    @Req() req: any,
  ) {
    if (!bookId) throw new BadRequestException('"bookId" query parameter is required.');
    const gradeLevel = parseInt(gradeLevelParam, 10);
    if (!gradeLevelParam || Number.isNaN(gradeLevel)) {
      throw new BadRequestException('"gradeLevel" query parameter is required and must be a number.');
    }
    await this.authorizeTeacherAccess(tenantId, req);
    return this.mastery.getClassMasteryReport(tenantId, gradeLevel, bookId);
  }

  // Reports are class/institution-wide, so this checks the caller's role
  // WITHIN this specific tenant (teacher/admin/librarian), not just that
  // they're a member of it — a student who's ACTIVE in the tenant must not
  // be able to pull a class-wide mastery breakdown of their peers.
  private async authorizeTeacherAccess(tenantId: string, req: any) {
    if (req.user.role === 'super-admin') return;

    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { userId: req.user.id, tenantId, status: 'ACTIVE' },
      select: { role: true },
    });
    if (!membership || !['admin', 'librarian', 'teacher'].includes(membership.role)) {
      throw new ForbiddenException('You do not have teacher-level access to this institution.');
    }
  }

  // ── Grading ──────────────────────────────────────────────────────────

  private async grade(
    item: { type: string; answer: string; prompt: string },
    submitted: string,
  ): Promise<boolean> {
    if (item.type === 'mcq') {
      // Deterministic — an MCQ answer is one of a fixed set of choice strings.
      return this.normalize(submitted) === this.normalize(item.answer);
    }

    // Short-answer: naive string matching would mark correct paraphrases
    // wrong, so this is graded by the same LLM the quiz was generated with.
    return this.gradeShortAnswer(item.prompt, item.answer, submitted);
  }

  private normalize(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private async gradeShortAnswer(prompt: string, reference: string, submitted: string): Promise<boolean> {
    if (!submitted.trim()) return false;

    const gradingPrompt =
      `Question: ${prompt}\n` +
      `Reference answer: ${reference}\n` +
      `Student answer: ${submitted}\n\n` +
      `Does the student answer convey the same meaning as the reference answer, even if worded ` +
      `differently? Return ONLY a JSON object: {"correct": true|false}`;

    try {
      let full = '';
      await this.llmProvider.chatStream([{ role: 'user', content: gradingPrompt }], (t) => {
        full += t;
      });
      const cleaned = full.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '');
      const parsed = JSON.parse(cleaned);
      return Boolean(parsed.correct);
    } catch {
      // Fail closed on a grading failure — an ungraded attempt shouldn't
      // silently count as correct.
      return false;
    }
  }
}
