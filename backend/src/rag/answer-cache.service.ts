import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { DialogueMode } from './dialogue-policy.service';
import { DEFAULT_ANSWER_LANGUAGE } from '../common/language/answer-language';

/**
 * Cache for completed Varta answers.
 *
 * Varta chat is the ONLY per-use cost in the reading layer — quizzes, digests
 * and simplifications all generate once and are stored. And its workload is
 * heavily repetitive in exactly the way a cache exploits: a class reads the
 * same chapter the night before a test and asks the same ten questions. Every
 * one of those currently pays for its own retrieval and its own completion.
 *
 * ── What may be cached, and why the rest may not ────────────────────────────
 *
 * ONLY `explain`. The other three dialogue policies build their prompt from
 * the asking student's own chat history — quiz_me looks for their pending
 * question, socratic counts their turns, debate checks whether they have
 * already been shown the opening. Serving one student's answer to another in
 * those modes would hand over the wrong half of a conversation. This is a
 * correctness boundary, not a tuning knob.
 *
 * NOT when the answer was scaffolded. A non-empty weakConceptLabels means §2
 * rewrote the prompt for one reader's specific gaps, so the result is personal
 * to them by construction.
 *
 * The key includes the curriculum scope, because two students at different
 * institutes can ask identical words and be entitled to different passages.
 * Omitting it would leak scoped content across institutes — the same class of
 * bug the retrieval filters exist to prevent.
 *
 * ── In-process, deliberately ────────────────────────────────────────────────
 *
 * No Redis dependency. A missing driver has broken a trio deploy before, and
 * the win here does not need cross-instance sharing: the repetition is
 * concentrated in short bursts on one book, which a single instance sees. If
 * this is ever fronted by several replicas, swapping the Map for Redis is a
 * change to this file alone.
 */

export interface CachedAnswer {
  content: string;
  citations: any[];
}

interface Entry {
  value: CachedAnswer;
  expiresAt: number;
}

const TTL_MS = parseInt(
  process.env.VARTA_ANSWER_CACHE_TTL_MS ?? `${30 * 60_000}`,
  10,
);
const MAX_ENTRIES = parseInt(process.env.VARTA_ANSWER_CACHE_MAX ?? '500', 10);

/**
 * Normalisation decides the hit rate. Case, surrounding whitespace, runs of
 * spaces and trailing punctuation are all noise: "What is opportunity cost?",
 * "what is opportunity cost" and "What Is Opportunity Cost ?" are one
 * question. Nothing beyond that is touched — no stemming, no stopword
 * removal — because two questions that differ by a real word are two
 * questions, and a cache that conflates them answers the wrong one.
 */
export function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[?!.\s]+$/, '');
}

export function buildAnswerKey(params: {
  bookId: string;
  mode: DialogueMode;
  query: string;
  scopeNodeIds?: string[];
  answerLanguage?: string;
}): string {
  // Scope is sorted before hashing so the same entitlement in a different
  // order is the same key rather than a silent miss.
  const scope = [...(params.scopeNodeIds ?? [])].sort().join(',');
  // answerLanguage MUST be in the key. This cache is shared across users (keyed
  // by book+query, not by userId), and the answer language is a per-user
  // preference — without this a 'hi'-preference student's cached answer would be
  // served to an 'en' student asking the identical question. Defaults to the
  // default preference for callers that don't pass one.
  const lang = params.answerLanguage ?? DEFAULT_ANSWER_LANGUAGE;
  const raw = `${params.bookId}|${params.mode}|${normalizeQuery(params.query)}|${scope}|${lang}`;
  return createHash('sha256').update(raw).digest('hex');
}

/** Only `explain` is free of per-user conversational state. */
export function isCacheableMode(mode: DialogueMode): boolean {
  return mode === 'explain';
}

@Injectable()
export class AnswerCacheService {
  private readonly logger = new Logger(AnswerCacheService.name);
  private readonly store = new Map<string, Entry>();
  private hits = 0;
  private misses = 0;

  get enabled(): boolean {
    return process.env.VARTA_ANSWER_CACHE_DISABLED !== 'true';
  }

  get(key: string): CachedAnswer | null {
    if (!this.enabled) return null;

    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }

    // Re-insert so Map iteration order stays least-recently-used first, which
    // is what makes the eviction below actually evict the coldest entry.
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key: string, value: CachedAnswer): void {
    if (!this.enabled) return;

    // An answer with no citations is either a refusal or something that went
    // wrong upstream. Caching it would pin that outcome for everyone who asks
    // the same question for the next half hour, including after the underlying
    // problem is fixed.
    if (!value.content.trim() || value.citations.length === 0) return;

    this.store.set(key, { value, expiresAt: Date.now() + TTL_MS });

    while (this.store.size > MAX_ENTRIES) {
      const oldest = this.store.keys().next();
      if (oldest.done) break;
      this.store.delete(oldest.value);
    }
  }

  /** Hit rate, for deciding whether the TTL and size are set sensibly. */
  stats() {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }
}
