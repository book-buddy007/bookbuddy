import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FlashcardsService {
  constructor(private prisma: PrismaService) {}

  async createDeck(
    userId: string,
    tenantId: string | null,
    data: {
      title: string;
      description?: string;
      color?: string;
      bookId?: string;
    },
  ) {
    return this.prisma.flashcardDeck.create({
      data: {
        userId,
        tenantId,
        title: data.title,
        description: data.description,
        color: data.color,
        bookId: data.bookId,
      },
    });
  }

  async getDecks(userId: string) {
    return this.prisma.flashcardDeck.findMany({
      where: { userId },
      include: { _count: { select: { cards: true } } },
    });
  }

  async createCard(
    userId: string,
    data: {
      deckId: string;
      frontContent: string;
      backContent: string;
      type?: string;
    },
  ) {
    // verify deck owner
    const deck = await this.prisma.flashcardDeck.findUnique({
      where: { id: data.deckId },
    });
    if (!deck || deck.userId !== userId)
      throw new NotFoundException('Deck not found');

    const card = await this.prisma.flashcard.create({
      data: {
        deckId: data.deckId,
        frontContent: data.frontContent,
        backContent: data.backContent,
        type: data.type || 'basic',
      },
    });

    // Initialize review stats for this user
    await this.prisma.flashcardReview.create({
      data: {
        cardId: card.id,
        userId: userId,
        nextReviewDate: new Date(),
      },
    });

    return card;
  }

  async getCardsForReview(userId: string, deckId: string) {
    const now = new Date();
    return this.prisma.flashcardReview.findMany({
      where: {
        userId,
        card: { deckId },
        nextReviewDate: { lte: now },
      },
      include: { card: true },
    });
  }

  // SuperMemo-2 (SM-2) algorithm
  async submitReview(userId: string, cardId: string, quality: number) {
    const review = await this.prisma.flashcardReview.findUnique({
      where: { userId_cardId: { userId, cardId } },
    });

    if (!review) throw new NotFoundException('Review record not found');

    let { repetition, interval, easinessFactor, totalReviews, failedReviews } =
      review;

    easinessFactor =
      easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easinessFactor < 1.3) easinessFactor = 1.3;

    if (quality < 3) {
      repetition = 0;
      interval = 1;
      failedReviews += 1;
    } else {
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easinessFactor);
      }
      repetition += 1;
    }
    totalReviews += 1;

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return this.prisma.flashcardReview.update({
      where: { id: review.id },
      data: {
        repetition,
        interval,
        easinessFactor,
        nextReviewDate,
        totalReviews,
        failedReviews,
      },
    });
  }
}
