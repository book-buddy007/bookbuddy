'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type BBIconName } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

/* ───── Shared card shell ───── */
function StreamCard({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: BBIconName;
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-[18px] bg-bb-surface p-5 shadow-e1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">{eyebrow}</p>
          <h3 className="mt-1 font-display text-lg font-extrabold tracking-[-0.02em]">{title}</h3>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-bb-accent-soft">
          <Icon name={icon} size={22} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 text-sm text-bb-muted">{children}</div>
    </article>
  );
}

function StreamLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-bb-accent-ink hover:underline"
    >
      {children} <Icon name="arrow-right" size={16} />
    </Link>
  );
}

/* ───── Reading ───── */
function ReadingStreamCard({ minutesReadToday, booksOpened }: {
  minutesReadToday?: number;
  booksOpened?: { title: string; chapter: string; percent: number }[];
}) {
  const books = booksOpened || [];
  return (
    <StreamCard eyebrow="Reading" title="Today's progress" icon="read">
      <p className="text-bb-text">
        You read <span className="font-bold">{minutesReadToday ?? 0} min</span> across {books.length} book
        {books.length !== 1 ? 's' : ''}.
      </p>
      {books.length > 0 && (
        <ul className="space-y-2.5">
          {books.slice(0, 3).map((b, i) => (
            <li key={i}>
              <div className="flex items-center justify-between gap-2 text-bb-text">
                <span className="truncate font-medium">{b.title}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-bb-muted">
                  {b.chapter} · {b.percent}%
                </span>
              </div>
              <Progress value={b.percent} className="mt-1.5 h-1.5" />
            </li>
          ))}
        </ul>
      )}
      <StreamLink href="/reader">Open reader</StreamLink>
    </StreamCard>
  );
}

/* ───── Varta ───── */
function VartaAIStreamCard({ recentQuestions }: {
  recentQuestions?: { question: string; source: string }[];
}) {
  const questions = recentQuestions || [];
  return (
    <StreamCard eyebrow="Varta" title="Recent questions" icon="varta">
      {questions.length > 0 ? (
        <div className="space-y-2.5">
          {questions.slice(0, 2).map((q, i) => (
            <div key={i}>
              <p className="line-clamp-1 font-medium text-bb-text">&ldquo;{q.question}&rdquo;</p>
              <p className="text-xs">Answered · {q.source}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>Ask your textbook anything. Varta answers with page-accurate citations.</p>
      )}
      <StreamLink href="/varta">Ask a new question</StreamLink>
    </StreamCard>
  );
}

/* ───── Sanchika ───── */
function SanchikaStreamCard({ highlights, flashcards, explanations }: {
  highlights?: number;
  flashcards?: number;
  explanations?: number;
}) {
  return (
    <StreamCard eyebrow="Sanchika" title="Your smart notebook" icon="sanchika">
      <p>All your highlights, flashcards, and saved explanations in one place.</p>
      <p className="text-xs font-semibold tabular-nums">
        {highlights ?? 0} highlights · {flashcards ?? 0} flashcard sets · {explanations ?? 0} saved explanations
      </p>
      <StreamLink href="/reader?tab=sanchika">Open Sanchika</StreamLink>
    </StreamCard>
  );
}

/* ───── Audio / TTS ───── */
function AudioStreamCard({ currentBook, timestamp, speed }: {
  currentBook?: string;
  timestamp?: string;
  speed?: string;
}) {
  return (
    <StreamCard eyebrow="Audio & TTS" title="Listen on the go" icon="audiobook">
      <p>Continue your audiobook or text-to-speech session.</p>
      {currentBook && (
        <div className="rounded-xl bg-bb-surface-2 p-3">
          <p className="truncate text-[13px] font-semibold text-bb-text">{currentBook}</p>
          <p className="text-xs tabular-nums">
            {timestamp ?? '00:00:00'} · {speed ?? '1.0x'} speed
          </p>
          <Progress value={45} className="mt-2 h-1.5" />
        </div>
      )}
      <div className="mt-auto flex gap-2 pt-1">
        <Button asChild size="sm" className="flex-1">
          <Link href="/player/v2">
            <Icon name="play" size={16} /> Resume
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href="/reader">Switch to reading</Link>
        </Button>
      </div>
    </StreamCard>
  );
}

/* ───── Grid wrapper ───── */
export interface StudyStreamsData {
  reading?: {
    minutesReadToday: number;
    booksOpened: { title: string; chapter: string; percent: number }[];
  };
  vartaAI?: {
    recentQuestions: { question: string; source: string }[];
  };
  sanchika?: {
    highlights: number;
    flashcards: number;
    explanations: number;
  };
  audio?: {
    currentBook: string;
    timestamp: string;
    speed: string;
  };
}

export function StudyStreamsGrid({ data, isLoading }: { data?: StudyStreamsData; isLoading?: boolean }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Your study streams</h2>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44 rounded-[18px]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <ReadingStreamCard
            minutesReadToday={data?.reading?.minutesReadToday}
            booksOpened={data?.reading?.booksOpened}
          />
          <VartaAIStreamCard recentQuestions={data?.vartaAI?.recentQuestions} />
          <SanchikaStreamCard
            highlights={data?.sanchika?.highlights}
            flashcards={data?.sanchika?.flashcards}
            explanations={data?.sanchika?.explanations}
          />
          <AudioStreamCard
            currentBook={data?.audio?.currentBook}
            timestamp={data?.audio?.timestamp}
            speed={data?.audio?.speed}
          />
        </div>
      )}
    </section>
  );
}
