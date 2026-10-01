'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  WandSparkles,
  MessageCircle,
  HelpCircle,
  Target,
  Brain,
  ArrowLeft,
  Clock,
  BookOpen,
  CheckCircle2,
  XCircle,
  Sparkles,
} from '@/components/ui/icons';

/* Varta activity hub — a dedicated page (kept out of the reader's narrow drawer,
   which would be cluttered). Shows the signed-in student's Varta chat + quiz
   activity, scoped to one book (?bookId=) or across all books. Deliberately
   Varta-only: Graph, Digest, Notes and Sanchika are not counted. */

interface Labelled { label: string; mastery: number }
interface Activity {
  scope: 'book' | 'global';
  book: { id: string; title: string; author: string } | null;
  stats: {
    questionsAsked: number;
    modeBreakdown: Record<string, number>;
    quiz: { answered: number; correct: number; accuracy: number | null };
    mastery: { average: number | null; tracked: number; strongest: Labelled[]; weakest: Labelled[] };
  };
  usage: {
    series: { date: string; varta: number; quiz: number }[];
    trial: {
      isTrial: boolean;
      isPaid: boolean;
      trialEndsAt: string | null;
      remaining: { varta: number; quiz: number; limit: number } | null;
    };
  };
  recentChats: { bookId: string; bookTitle: string; mode: string; preview: string; createdAt: string }[];
  recentQuizzes: {
    bookId: string; bookTitle: string; chapterTitle: string; citedPage: number | null;
    prompt: string; correct: boolean; answeredAt: string;
  }[];
}

const MODE_LABEL: Record<string, string> = {
  explain: 'Explain', socratic: 'Socratic', debate: 'Debate', quiz_me: 'Quiz me',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
        <Icon className="h-4 w-4 text-indigo-500" /> {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function VartaHub() {
  const params = useSearchParams();
  const bookId = params.get('bookId') || params.get('id') || undefined;
  const [data, setData] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/students/me/varta-activity${bookId ? `?bookId=${encodeURIComponent(bookId)}` : ''}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch(() => setError('Could not load your Varta activity.'))
      .finally(() => setLoading(false));
  }, [bookId]);

  const maxUsage = useMemo(
    () => Math.max(1, ...(data?.usage.series.map((s) => s.varta + s.quiz) ?? [1])),
    [data],
  );

  if (loading) {
    return <div className="p-10 text-center text-slate-400">Loading your Varta activity…</div>;
  }
  if (error || !data) {
    return <div className="p-10 text-center text-red-500">{error ?? 'No data.'}</div>;
  }

  const { stats, usage, recentChats, recentQuizzes } = data;
  const accuracyPct = stats.quiz.accuracy != null ? `${Math.round(stats.quiz.accuracy * 100)}%` : '—';
  const masteryPct = stats.mastery.average != null ? `${Math.round(stats.mastery.average * 100)}%` : '—';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <WandSparkles className="h-6 w-6 text-indigo-500" /> Varta activity
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {data.scope === 'book' && data.book
                ? <>Your chats and quizzes in <span className="font-medium text-slate-700 dark:text-slate-300">{data.book.title}</span></>
                : 'Your chats and quizzes across every book'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {bookId && (
              <>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-600 text-white">This book</span>
                <Link href="/varta" className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900">
                  All books
                </Link>
              </>
            )}
            {bookId && (
              <Link href={`/reader?bookId=${bookId}&tab=varta`} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-indigo-300 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to reading
              </Link>
            )}
          </div>
        </div>

        {/* Trial banner */}
        {usage.trial.isTrial && usage.trial.remaining && (
          <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              Free trial — today you have <b>{usage.trial.remaining.varta}</b> Varta and{' '}
              <b>{usage.trial.remaining.quiz}</b> quiz questions left (of {usage.trial.remaining.limit} each).
            </span>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard icon={MessageCircle} label="Questions asked" value={String(stats.questionsAsked)} />
          <StatCard icon={HelpCircle} label="Quiz questions" value={String(stats.quiz.answered)} sub={`${stats.quiz.correct} correct`} />
          <StatCard icon={Target} label="Quiz accuracy" value={accuracyPct} />
          <StatCard icon={Brain} label="Avg. mastery" value={masteryPct} sub={`${stats.mastery.tracked} concepts`} />
        </div>

        {/* Usage over time */}
        <section className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Usage · last 30 days</h2>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-500" /> Varta</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-400" /> Quiz</span>
            </div>
          </div>
          <div className="flex items-end gap-[3px] h-24">
            {usage.series.map((s) => {
              const total = s.varta + s.quiz;
              const h = (total / maxUsage) * 100;
              const vH = total > 0 ? (s.varta / total) * 100 : 0;
              return (
                <div key={s.date} className="flex-1 flex flex-col justify-end group relative" title={`${s.date}: ${s.varta} varta, ${s.quiz} quiz`}>
                  <div className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse" style={{ height: `${Math.max(h, total > 0 ? 6 : 2)}%` }}>
                    <div className="bg-indigo-500" style={{ height: `${vH}%` }} />
                    <div className="bg-purple-400" style={{ height: `${100 - vH}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent conversations */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-indigo-500" /> Recent Varta conversations
            </h2>
            {recentChats.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No Varta questions yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentChats.map((c, i) => (
                  <li key={i}>
                    <Link
                      href={`/reader?bookId=${c.bookId}&tab=varta`}
                      className="block p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">{MODE_LABEL[c.mode] ?? c.mode}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{c.preview}</p>
                      {data.scope === 'global' && (
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><BookOpen className="h-3 w-3" /> {c.bookTitle}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent quizzes */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-indigo-500" /> Recent quiz answers
            </h2>
            {recentQuizzes.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No quiz attempts yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentQuizzes.map((q, i) => (
                  <li key={i} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-2">
                    {q.correct
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      : <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{q.prompt}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {data.scope === 'global' && <>{q.bookTitle} · </>}
                        {q.chapterTitle}{q.citedPage != null ? ` · pg. ${q.citedPage}` : ''} · {timeAgo(q.answeredAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Mastery */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-indigo-500" /> Concept mastery
            </h2>
            {stats.mastery.tracked === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Answer some quizzes to build mastery.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <MasteryList title="Strongest" items={stats.mastery.strongest} good />
                <MasteryList title="Needs work" items={stats.mastery.weakest} />
              </div>
            )}
          </section>

          {/* Mode breakdown */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">How you use Varta</h2>
            {Object.keys(stats.modeBreakdown).length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No conversations yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.modeBreakdown).sort((a, b) => b[1] - a[1]).map(([mode, count]) => {
                  const total = Object.values(stats.modeBreakdown).reduce((s, n) => s + n, 0);
                  return (
                    <div key={mode}>
                      <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                        <span>{MODE_LABEL[mode] ?? mode}</span><span>{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MasteryList({ title, items, good }: { title: string; items: Labelled[]; good?: boolean }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((m, i) => (
          <li key={i} className="text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-0.5">
              <span className="truncate pr-2">{m.label}</span>
              <span>{Math.round(m.mastery * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className={`h-full ${good ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.round(m.mastery * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VartaActivityPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading…</div>}>
      <VartaHub />
    </Suspense>
  );
}
