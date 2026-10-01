import { X, Clock, Gauge, Flame, Target, BookOpen } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { useReaderStore } from '@/store/useReaderStore';

/* ── Reading stats (audit fixes 2 and 7) ───────────────────────────────
   These numbers used to live in a floating strip pinned at bottom:5rem,
   edge-to-edge on mobile, above the FAB and below nothing — one of the
   four things fighting for the thumb zone. Its labels were 10px
   uppercase at 0.7 opacity, which is the exact pattern fix 7 calls out.

   They are on-demand now: the progress line in the bottom bar opens
   this, and it is a sheet that sits *above* the bar rather than over it,
   so the bar it was launched from is still reachable. Labels are 12px at
   full opacity. */

interface ReaderProgressSheetProps {
  currentPage: number;
  totalPages: number;
  percentComplete: number;
  minutesLeft: number;
  sessionSeconds: number;
  wordsPerMin: number;
  isDarkMode?: boolean;
}

function formatSessionTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ReaderProgressSheet({
  currentPage,
  totalPages,
  percentComplete,
  minutesLeft,
  sessionSeconds,
  wordsPerMin,
  isDarkMode = false,
}: ReaderProgressSheetProps) {
  const activePanel = useReaderStore((s) => s.activePanel);
  const closePanel = useReaderStore((s) => s.closePanel);
  const currentStreak = useReaderStore((s) => s.currentStreak);
  const dailyGoalProgress = useReaderStore((s) => s.dailyGoalProgress);

  const isOpen = activePanel === 'progress';

  const stats = [
    { icon: BookOpen, label: 'Progress', value: `${percentComplete}%`, sub: `page ${currentPage} of ${totalPages}` },
    { icon: Clock, label: 'Left in book', value: `${minutesLeft} min`, sub: 'at your current pace' },
    { icon: Gauge, label: 'This session', value: formatSessionTime(sessionSeconds), sub: `≈${wordsPerMin} words/min` },
    { icon: Flame, label: 'Streak', value: `${currentStreak}`, sub: currentStreak === 1 ? 'day' : 'days' },
    { icon: Target, label: 'Daily goal', value: `${Math.round(dailyGoalProgress)}%`, sub: 'of today’s target' },
  ];

  return (
    <div
      role="dialog"
      aria-label="Reading stats"
      aria-hidden={!isOpen}
      inert={!isOpen}
      /* bottom-[76px] clears the bottom bar rather than covering it —
         fix 2 asks for sheets that push the bar, never sit on top of
         it. */
      className={[
        'absolute left-0 right-0 bottom-[76px] z-[44]',
        'mx-2 rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden',
        'transition-all duration-300',
        isDarkMode
          ? 'bg-[var(--night-ink)]/97 border-[var(--gold)]/15 text-slate-200'
          : 'bg-white/97 border-[var(--accent-primary)]/20 text-slate-800',
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--accent-primary)]/12 dark:border-[var(--gold)]/10">
        <h2 className="text-base font-bold tracking-tight text-[var(--accent-contrast)] dark:text-[var(--gold)]">
          Reading stats
        </h2>
        <Button variant="ghost" size="icon" onClick={closePanel} aria-label="Close reading stats" className="rounded-full hit-target">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
        {stats.map(({ icon: Icon, label, value, sub }) => (
          <li
            key={label}
            className="rounded-xl px-3 py-2.5 bg-[var(--accent-soft)]/60 dark:bg-[var(--gold)]/[0.06] border border-[var(--accent-primary)]/12 dark:border-[var(--gold)]/10"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Icon className="h-3.5 w-3.5 text-[var(--accent-strong)] dark:text-[var(--accent-primary-dark)]" aria-hidden="true" />
              {label}
            </div>
            <div className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">{sub}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
