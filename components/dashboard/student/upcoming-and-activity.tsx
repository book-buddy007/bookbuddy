'use client';

import { CalendarClock, Activity, Highlighter, Sparkles, BookOpen } from 'lucide-react';

/* ───── Upcoming Panel ───── */
export interface UpcomingItem {
  id: string;
  title: string;
  subtitle: string;         // e.g. "Due tomorrow · 9:00 AM"
  priority?: 'high' | 'normal';
}

export function UpcomingPanel({ items, isLoading }: { items: UpcomingItem[]; isLoading?: boolean }) {
  return (
    <section className="rounded-2xl bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="h-5 w-5 text-[var(--deep-saffron)]" />
        <h2
          className="text-base font-semibold text-slate-900 dark:text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Upcoming
        </h2>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between animate-pulse">
              <div>
                <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-1" />
                <div className="h-2.5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
          No upcoming items. You&apos;re all caught up! 🎉
        </p>
      )}

      {!isLoading && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {item.subtitle}
                </p>
              </div>
              {item.priority === 'high' && (
                <span className="shrink-0 rounded-full bg-[var(--deep-saffron)]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--deep-saffron)]">
                  High
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ───── Activity Feed ───── */
export interface ActivityItem {
  id: string;
  message: string;          // e.g. "Highlighted 3 passages in Physics"
  type: 'highlight' | 'varta' | 'sanchika' | 'reading' | 'general';
  timestamp?: string;
}

const ACTIVITY_ICON: Record<ActivityItem['type'], React.ReactNode> = {
  highlight: <Highlighter className="h-3.5 w-3.5 text-amber-500" />,
  varta: <Sparkles className="h-3.5 w-3.5 text-teal-500" />,
  sanchika: <BookOpen className="h-3.5 w-3.5 text-[var(--deep-saffron)]" />,
  reading: <BookOpen className="h-3.5 w-3.5 text-indigo-500" />,
  general: <Activity className="h-3.5 w-3.5 text-slate-400" />,
};

export function ActivityFeed({ items, isLoading }: { items: ActivityItem[]; isLoading?: boolean }) {
  return (
    <section className="rounded-2xl bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-[var(--peacock-teal)]" />
        <h2
          className="text-base font-semibold text-slate-900 dark:text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Recent activity
        </h2>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 animate-pulse">
              <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
          Start reading to see your activity here.
        </p>
      )}

      {!isLoading && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5">
              <div className="mt-0.5 shrink-0">
                {ACTIVITY_ICON[item.type]}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {item.message}
                </p>
                {item.timestamp && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {item.timestamp}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
