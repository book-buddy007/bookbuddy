import { Injectable } from '@nestjs/common';
import { BookChatService } from './book-chat.service';
import {
  AnswerLanguage,
  answerLanguageDirective,
  DEFAULT_ANSWER_LANGUAGE,
} from '../common/language/answer-language';

export type DialogueMode = 'explain' | 'quiz_me' | 'socratic' | 'debate';
export const DIALOGUE_MODES: DialogueMode[] = [
  'explain',
  'quiz_me',
  'socratic',
  'debate',
];

const SOCRATIC_MAX_TURNS = 3;

/**
 * How long a gap ends a line of Socratic questioning.
 *
 * The budget is meant to stop ONE line of inquiry from looping forever, not to
 * ration the mode. Counting every Socratic turn a student has ever taken on a
 * book made it a lifetime allowance: after three, `turnNumber` could only ever
 * exceed the maximum, so the mode silently and permanently became Explain —
 * and it hit the students who used it most, first. A gap this long means the
 * student left and came back, which is a new question, not turn four.
 */
const SOCRATIC_SESSION_GAP_MS = 30 * 60_000;

/**
 * Turns in the CURRENT line of inquiry: walk back from the newest message
 * while each step is within the session gap, and stop at the first real break.
 *
 * Pure and exported so the boundary logic is testable without a database —
 * the bug it replaces was invisible precisely because it lived inside a query.
 * `messages` must be newest-first, as getRecentModeMessages returns them.
 */
export function countSessionTurns(
  messages: { role: string; createdAt: Date }[],
  gapMs: number = SOCRATIC_SESSION_GAP_MS,
): number {
  let turns = 0;
  let previous: Date | null = null;

  for (const m of messages) {
    if (previous && previous.getTime() - m.createdAt.getTime() > gapMs) break;
    previous = m.createdAt;
    if (m.role === 'ASSISTANT') turns += 1;
  }
  return turns;
}

/**
 * Reading Intelligence Layer §6 — wraps the existing Varta chat completion
 * call with selectable pedagogical behaviors. This is a prompt-layer change
 * only: same retrieval, same LLM, same SSE wire format.
 */
@Injectable()
export class DialoguePolicyService {
  constructor(private chatService: BookChatService) {}

  async buildSystemPrompt(
    mode: DialogueMode,
    book: { title: string; author: string },
    userId: string,
    bookId: string,
    weakConceptLabels: string[] = [],
    answerLanguage: AnswerLanguage = DEFAULT_ANSWER_LANGUAGE,
  ): Promise<string> {
    // The citation format is a CONTRACT with two other files and it has been
    // broken: this prompt used to ask for `[cite:CHUNK_ID]`, which nothing
    // parsed. The reader (VartaSidebar) matched markdown links to `#page-N`,
    // a format nothing emitted — so the page-jump pills never rendered and
    // the raw `[cite:...]` markers leaked into the answer prose instead.
    //
    // Numbered markers, matching the numbered excerpts built in
    // book-chat.controller.ts, are what both sides now speak. Keep the three
    // in step: prompt says [n], controller numbers the excerpts from 1 and
    // filters citations to the numbers actually used, reader linkifies them.
    let base =
      `You are a helpful reading assistant for the book "${book.title}" by ${book.author}. ` +
      `Answer ONLY from the provided excerpts. The excerpts are numbered — cite the number ` +
      `inline as [1], [2] immediately after each claim it supports. Cite only numbers that ` +
      `actually appear in the excerpts; never invent a number, and never write a page number yourself.` +
      // §Presentation — the reader renders GitHub-flavoured Markdown, so give it
      // structure instead of one dense block (the "tight packed" complaint).
      ` Format for easy reading: short paragraphs separated by blank lines, **bold** for key terms, ` +
      `and bullet or numbered lists when presenting steps or several points — never one solid wall of text.` +
      // §STEM — the reader renders KaTeX. Delimited LaTeX is what makes an
      // equation display as maths rather than as raw source.
      ` Write every mathematical, physical, or chemical expression as LaTeX: inline as $...$ and display ` +
      `equations on their own line as $$...$$ (for example $E = mc^2$, or $$6\\mathrm{CO_2} + 6\\mathrm{H_2O} ` +
      `\\rightarrow \\mathrm{C_6H_{12}O_6} + 6\\mathrm{O_2}$$). Never output a bare LaTeX command outside these delimiters.`;

    // §Multilingual — the learner's saved language, English or Hindi, and
    // nothing else. There is deliberately no "mirror the question's language"
    // fallback any more: an unnamed target language is what let a quiz come
    // back in Italian (see common/language/answer-language.ts). A student who
    // wants their question mirrored sets the preference to that language.
    base += answerLanguageDirective(answerLanguage);

    // §2 mastery-aware retrieval — when the query touches concepts the
    // student hasn't yet mastered, tell the model so it scaffolds the
    // explanation rather than assuming prior knowledge it doesn't have.
    if (weakConceptLabels.length > 0) {
      base += ` The student has not yet demonstrated mastery of: ${weakConceptLabels.join(', ')}. Scaffold your explanation of these — do not assume prior familiarity with them.`;
    }

    switch (mode) {
      case 'explain':
        return `${base} If the answer is not in the excerpts, tell the student you couldn't find it in the book — phrased in the answer language set above.`;

      case 'quiz_me':
        return this.buildQuizMePrompt(base, userId, bookId);

      case 'socratic':
        return this.buildSocraticPrompt(base, userId, bookId);

      case 'debate':
        return this.buildDebatePrompt(base, userId, bookId);
    }
  }

  /**
   * Active learning over passive delivery: the model asks a question about
   * the passage instead of answering the student's, then evaluates their
   * attempt and reveals the answer on the following turn — derived from
   * chat history, not a new state table.
   */
  private async buildQuizMePrompt(
    base: string,
    userId: string,
    bookId: string,
  ): Promise<string> {
    // take: 2, not 1 — saveMessages() writes the USER and ASSISTANT rows for
    // one turn in a single createMany, so they share an identical createdAt
    // (down to the millisecond, confirmed against real Postgres); take: 1
    // with no secondary sort key can non-deterministically return either
    // row, sometimes missing the pending ASSISTANT question entirely.
    const recent = await this.chatService.getRecentModeMessages(
      userId,
      bookId,
      'quiz_me',
      2,
    );
    const pendingQuestion = recent.find((m) => m.role === 'ASSISTANT');

    if (pendingQuestion) {
      return (
        `${base} You previously asked the student this question: "${pendingQuestion.content}". ` +
        `The student's current message is their attempt to answer it. Evaluate whether their attempt ` +
        `is correct, tell them clearly, then reveal and explain the full correct answer grounded in the excerpts. ` +
        `After this, you may ask a new question on the next turn.`
      );
    }

    return (
      `${base} Instead of directly answering the student's message, ask them ONE probing comprehension ` +
      `question about the excerpts that tests understanding of a key point relevant to what they asked about. ` +
      `Do not reveal or hint at the answer yet — the student will attempt it on their next turn.`
    );
  }

  /**
   * Guiding counter-questions toward self-derivation, with a turn budget so
   * a student who's genuinely stuck doesn't hit a frustration loop — after
   * SOCRATIC_MAX_TURNS in one line of inquiry, the policy gives a direct
   * explanation instead.
   *
   * The budget is per SESSION, not per book-lifetime. Counting every Socratic
   * turn ever taken meant `turnNumber` could only ever exceed the maximum once
   * a student had used the mode three times, so it degraded to Explain
   * permanently and silently. Fetches beyond the budget so the session
   * boundary is visible rather than truncated at exactly the limit.
   */
  private async buildSocraticPrompt(
    base: string,
    userId: string,
    bookId: string,
  ): Promise<string> {
    const recent = await this.chatService.getRecentModeMessages(
      userId,
      bookId,
      'socratic',
      SOCRATIC_MAX_TURNS * 4,
    );
    const turnNumber =
      countSessionTurns(recent as { role: string; createdAt: Date }[]) + 1;

    if (turnNumber > SOCRATIC_MAX_TURNS) {
      return (
        `${base} The student has been through ${SOCRATIC_MAX_TURNS} rounds of guided questioning without ` +
        `landing on the answer. Instead of another counter-question, give them a direct, complete explanation now.`
      );
    }

    return (
      `${base} This is Socratic turn ${turnNumber} of at most ${SOCRATIC_MAX_TURNS}. Do not state the answer ` +
      `directly. Instead, respond with a guiding counter-question grounded in the excerpts that leads the student ` +
      `toward deriving the answer themselves.`
    );
  }

  /**
   * §6.3 (NOVEL) — multi-agent LLM debate repurposed as a pedagogy device
   * rather than an accuracy tool. v1 heuristic per the spec: the model
   * self-identifies a genuinely contestable claim (no §3 graph dependency
   * yet — that upgrade, "which passages have real interpretive tension," is
   * deferred). The whole opening debate — both personas' 2-3 rounds — is
   * generated in a single assistant turn, not spread across multiple chat
   * turns like quiz_me/socratic; only the student's response to it needs
   * turn-aware framing.
   */
  private async buildDebatePrompt(
    base: string,
    userId: string,
    bookId: string,
  ): Promise<string> {
    // take: 2 — see buildQuizMePrompt's comment: the USER/ASSISTANT pair for
    // one turn shares an identical createdAt, so take: 1 can miss the prior
    // debate-opening ASSISTANT message depending on tie order.
    const recent = await this.chatService.getRecentModeMessages(
      userId,
      bookId,
      'debate',
      2,
    );
    const hasOpenedDebate = recent.some((m) => m.role === 'ASSISTANT');

    if (!hasOpenedDebate) {
      return (
        `${base} Identify ONE genuinely contestable claim in the excerpts — a point where two informed, ` +
        `textually-grounded readings legitimately disagree (e.g. a character's real motive, or a competing ` +
        `scientific or historical explanation), NOT a simple factual question with a single right answer. ` +
        `Then write a short debate between two personas, "Advocate A" and "Advocate B", each taking an ` +
        `opposing stance on that claim, grounding every point in the excerpts. Let them exchange 2-3 rounds ` +
        `of argument and rebuttal. After the exchange, explicitly invite the student to state and defend ` +
        `which position they find more convincing, and why.`
      );
    }

    return (
      `${base} The student has just stated their own position in an ongoing debate between "Advocate A" ` +
      `and "Advocate B" on a contestable claim from the excerpts. Have both advocates react to the ` +
      `student's position — affirming what holds up under the text, challenging what doesn't, still ` +
      `grounded in the excerpts — and invite the student to refine or further defend their view.`
    );
  }
}
