import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Bayesian Knowledge Tracing, not a rolling percent-correct average — this is
 * the standard adaptive-learning approach for distinguishing "wrong by a
 * careless slip" from "hasn't learned this yet," which an average cannot.
 *
 * Fixed literature-default parameters rather than per-concept fitted ones:
 * fitting P(T)/P(S)/P(G) from data needs a meaningful attempt history per
 * concept, which a freshly-launched feature doesn't have yet. These are
 * standard starting values for a first deployment; revisit once there's
 * enough attempt volume to fit them for real.
 */
const P_TRANSIT = 0.15; // probability of learning a concept after one exposure/attempt
const P_SLIP = 0.1; // probability of a wrong answer despite having learned the concept
const DEFAULT_GUESS = 0.2; // fallback for short_answer items (low blind-guess odds)

@Injectable()
export class MasteryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Update (or create) the mastery estimate for one concept after one
   * attempt. numChoices sets the guess probability for mcq items (1/N);
   * short_answer items use a low fixed guess rate since blind-guessing a
   * free-text answer correctly is unlikely.
   */
  async recordAttempt(params: {
    userId: string;
    bookId: string;
    conceptId: string;
    correct: boolean;
    numChoices?: number | null;
  }) {
    const { userId, bookId, conceptId, correct, numChoices } = params;
    const pGuess =
      numChoices && numChoices > 1 ? 1 / numChoices : DEFAULT_GUESS;

    const existing = await this.prisma.conceptMastery.findUnique({
      where: { userId_bookId_conceptId: { userId, bookId, conceptId } },
    });
    const priorL = existing?.mastery ?? 0.3;

    const nextL = this.update(priorL, correct, P_SLIP, pGuess, P_TRANSIT);

    return this.prisma.conceptMastery.upsert({
      where: { userId_bookId_conceptId: { userId, bookId, conceptId } },
      create: { userId, bookId, conceptId, mastery: nextL, attempts: 1 },
      update: { mastery: nextL, attempts: { increment: 1 } },
    });
  }

  /** The standard BKT posterior + learning-transit update, as a pure function. */
  private update(
    priorL: number,
    correct: boolean,
    pSlip: number,
    pGuess: number,
    pTransit: number,
  ): number {
    let posteriorL: number;
    if (correct) {
      const numerator = priorL * (1 - pSlip);
      posteriorL = numerator / (numerator + (1 - priorL) * pGuess);
    } else {
      const numerator = priorL * pSlip;
      posteriorL = numerator / (numerator + (1 - priorL) * (1 - pGuess));
    }
    const nextL = posteriorL + (1 - posteriorL) * pTransit;
    return Math.min(1, Math.max(0, nextL));
  }

  async getMasteryVector(userId: string, bookId: string) {
    const rows = await this.prisma.conceptMastery.findMany({
      where: { userId, bookId },
      include: { concept: { select: { label: true, type: true } } },
      orderBy: { mastery: 'asc' },
    });
    return rows.map((r) => ({
      conceptId: r.conceptId,
      label: r.concept.label,
      type: r.concept.type,
      mastery: r.mastery,
      attempts: r.attempts,
      lastUpdated: r.lastUpdated,
    }));
  }

  /**
   * Teacher-facing, class-aggregated view of mastery for one book — the
   * §4 mastery-report endpoint the spec describes, deferred until now
   * because it needs Vidyaverse-side class filtering to mean anything
   * (see quiz.controller.ts's route doc comment for why this is scoped by
   * gradeLevel, not the spec's literal classId).
   *
   * Per-concept: how many students in this grade/tenant/book have
   * attempted it, their average mastery, and how many are still weak
   * (mastery < WEAK_THRESHOLD, same bar §2/§7/§10 use) — sorted weakest
   * first, since that's what a teacher acts on.
   */
  async getClassMasteryReport(
    tenantId: string,
    gradeLevel: number,
    bookId: string,
  ) {
    const WEAK_THRESHOLD = 0.6;

    const rows = await this.prisma.conceptMastery.findMany({
      where: {
        bookId,
        user: {
          gradeLevel,
          tenantMemberships: { some: { tenantId, status: 'ACTIVE' } },
        },
      },
      include: { concept: { select: { label: true, type: true } } },
    });

    const byConcept = new Map<
      string,
      {
        label: string;
        type: string;
        masterySum: number;
        studentCount: number;
        weakCount: number;
      }
    >();
    for (const row of rows) {
      const entry = byConcept.get(row.conceptId) ?? {
        label: row.concept.label,
        type: row.concept.type,
        masterySum: 0,
        studentCount: 0,
        weakCount: 0,
      };
      entry.masterySum += row.mastery;
      entry.studentCount += 1;
      if (row.mastery < WEAK_THRESHOLD) entry.weakCount += 1;
      byConcept.set(row.conceptId, entry);
    }

    return Array.from(byConcept.entries())
      .map(([conceptId, e]) => ({
        conceptId,
        label: e.label,
        type: e.type,
        studentCount: e.studentCount,
        avgMastery: e.masterySum / e.studentCount,
        weakCount: e.weakCount,
      }))
      .sort((a, b) => a.avgMastery - b.avgMastery);
  }
}
