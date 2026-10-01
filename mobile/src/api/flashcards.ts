import { apiFetch } from './client';
import type { Flashcard, FlashcardDeck } from './types';

export function getDecks() {
  return apiFetch<FlashcardDeck[]>('/flashcards/decks');
}

export interface CreateDeckInput {
  title: string;
  description?: string;
  color?: string;
  bookId?: string;
}

export function createDeck(input: CreateDeckInput) {
  return apiFetch<FlashcardDeck>('/flashcards/decks', {
    method: 'POST',
    body: input,
  });
}

export interface CreateCardInput {
  deckId: string;
  frontContent: string;
  backContent: string;
  type?: string;
}

export function createCard(input: CreateCardInput) {
  return apiFetch<Flashcard>('/flashcards/cards', {
    method: 'POST',
    body: input,
  });
}

/** GET /flashcards/decks/:deckId/review — cards due for review. */
export function getCardsForReview(deckId: string) {
  return apiFetch<Flashcard[]>(`/flashcards/decks/${deckId}/review`);
}

/**
 * POST /flashcards/cards/:cardId/review — grade a card.
 *
 * `quality` is the SM-2 recall score and must be 0–5; the backend throws
 * outside that range. The review UI maps it to four buttons rather than asking
 * a reader to think in numbers.
 */
export function submitReview(cardId: string, quality: number) {
  return apiFetch<unknown>(`/flashcards/cards/${cardId}/review`, {
    method: 'POST',
    body: { quality },
  });
}
