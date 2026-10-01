'use client';

import Link from 'next/link';
import { BookOpen, Sparkles, Highlighter, Headphones, Play, ArrowRight } from '@/components/ui/icons';
import type { ReactNode } from 'react';

/* ───── Shared Card Shell ───── */
function StreamCard({
  eyebrow,
  title,
  accent = 'saffron',
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: 'saffron' | 'teal' | 'gold' | 'indigo';
  icon: ReactNode;
  children: ReactNode;
}) {
  const accentMap = {
    saffron: 'from-[var(--deep-saffron)]/8 border-[var(--deep-saffron)]/15 dark:border-[var(--deep-saffron)]/20',
    teal: 'from-[var(--peacock-teal)]/8 border-[var(--peacock-teal)]/15 dark:border-[var(--peacock-teal)]/20',
    gold: 'from-[var(--gold)]/8 border-[var(--gold)]/15 dark:border-[var(--gold)]/20',
    indigo: 'from-[var(--indigo-deep)]/8 border-[var(--indigo-deep)]/15 dark:border-[var(--indigo-deep)]/20',
  };

  return (
    <article
      className={`
        group relative flex flex-col rounded-2xl border
        bg-gradient-to-br ${accentMap[accent]} to-white/80 dark:to-slate-800/80
        p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1
        backdrop-blur-md overflow-hidden relative
      `}
    >
      {/* Subtle watermark icon */}
      <div className="absolute -bottom-4 -right-4 opacity-[0.04] dark:opacity-[0.06] pointer-events-none">
        <div className="w-24 h-24">{icon}</div>
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
          {eyebrow}
        </p>
        <h3
          className="text-base font-semibold text-slate-900 dark:text-white mb-3"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h3>
        <div className="flex-1 space-y-3 text-sm text-slate-600 dark:text-slate-400">
          {children}
        </div>
      </div>
    </article>
  );
}

/* ───── Reading Stream ───── */
function ReadingStreamCard({ minutesReadToday, booksOpened }: {
  minutesReadToday?: number;
  booksOpened?: { title: string; chapter: string; percent: number }[];
}) {
  const books = booksOpened || [];
  return (
    <StreamCard eyebrow="Reading" title="Today's progress" accent="saffron" icon={<BookOpen className="w-full h-full" />}>
      <p className="font-medium text-slate-700 dark:text-slate-300">
        You read <span className="text-[var(--deep-saffron)] font-bold">{minutesReadToday ?? 0} min</span> across {books.length} book{books.length !== 1 ? 's' : ''}.
      </p>
      {books.length > 0 && (
        <ul className="space-y-1.5">
          {books.slice(0, 3).map((b, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="truncate">{b.title}</span>
              <span className="shrink-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                {b.chapter} · {b.percent}%
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/reader"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--deep-saffron)] hover:text-[var(--saffron)] transition-colors mt-2"
      >
        Open reader <ArrowRight className="h-3 w-3" />
      </Link>
    </StreamCard>
  );
}

/* ───── Varta Stream ───── */
function VartaAIStreamCard({ recentQuestions }: {
  recentQuestions?: { question: string; source: string }[];
}) {
  const questions = recentQuestions || [];
  return (
    <StreamCard eyebrow="Varta" title="Recent questions" accent="teal" icon={<Sparkles className="w-full h-full" />}>
      {questions.length > 0 ? (
        <div className="space-y-2">
          {questions.slice(0, 2).map((q, i) => (
            <div key={i}>
              <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                &ldquo;{q.question}&rdquo;
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Answered · {q.source}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p>Ask your textbook anything — Varta answers with page-accurate citations.</p>
      )}
      <Link
        href="/reader?tab=varta"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--peacock-teal)] hover:text-teal-600 dark:hover:text-teal-400 transition-colors mt-2"
      >
        Ask a new question <ArrowRight className="h-3 w-3" />
      </Link>
    </StreamCard>
  );
}

/* ───── Sanchika Stream ───── */
function SanchikaStreamCard({ highlights, flashcards, explanations }: {
  highlights?: number;
  flashcards?: number;
  explanations?: number;
}) {
  return (
    <StreamCard eyebrow="Sanchika" title="Your smart notebook" accent="gold" icon={<Highlighter className="w-full h-full" />}>
      <p>All your highlights, flashcards, and saved explanations in one place.</p>
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
        {highlights ?? 0} highlights · {flashcards ?? 0} flashcard sets · {explanations ?? 0} saved explanations
      </p>
      <Link
        href="/reader?tab=sanchika"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--deep-saffron)] hover:text-[var(--saffron)] transition-colors mt-2"
      >
        Open Sanchika <ArrowRight className="h-3 w-3" />
      </Link>
    </StreamCard>
  );
}

/* ───── Audio / TTS Stream ───── */
function AudioStreamCard({ currentBook, timestamp, speed }: {
  currentBook?: string;
  timestamp?: string;
  speed?: string;
}) {
  return (
    <StreamCard eyebrow="Audio & TTS" title="Listen on the go" accent="indigo" icon={<Headphones className="w-full h-full" />}>
      <p>Continue your audiobook or text‑to‑speech session.</p>
      {currentBook && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/60 dark:border-slate-600/50 p-3">
          <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
            {currentBook}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
            {timestamp ?? '00:00:00'} · {speed ?? '1.0x'} speed
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
            <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-[var(--peacock-teal)] to-teal-500 transition-all duration-500" />
          </div>
        </div>
      )}
      <div className="flex gap-2 mt-1">
        <button className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--peacock-teal)] text-sm font-semibold text-white hover:bg-teal-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--peacock-teal)]/50 focus:ring-offset-2">
          <Play className="h-3.5 w-3.5" /> Resume
        </button>
        <button className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          Switch to reading
        </button>
      </div>
    </StreamCard>
  );
}

/* ───── Grid Wrapper ───── */
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
  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2
          className="text-xl font-semibold text-slate-900 dark:text-slate-100"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Your study streams
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl bg-white/60 dark:bg-slate-800/40 p-5 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 animate-pulse h-48" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2
        className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Your study streams
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <ReadingStreamCard
          minutesReadToday={data?.reading?.minutesReadToday}
          booksOpened={data?.reading?.booksOpened}
        />
        <VartaAIStreamCard
          recentQuestions={data?.vartaAI?.recentQuestions}
        />
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
    </section>
  );
}
