import { Icon, type BBIconName } from '@/components/ui/icon';
import { useReaderStore } from '@/store/useReaderStore';

/* ── Reading stats (audit fixes 2 and 7) ───────────────────────────────
   On demand: the progress text in the bottom bar opens this sheet, which sits
   *above* the bar (at the bar's measured height) so the bar stays reachable.
   Colours follow the reader theme. */

interface ReaderProgressSheetProps {
  currentPage: number;
  totalPages: number;
  percentComplete: number;
  minutesLeft: number;
  sessionSeconds: number;
  /** No longer shown: it divided the absolute page number by session minutes, so
   *  opening a book at page 200 reported thousands of words a minute. */
  wordsPerMin?: number;
  isDarkMode?: boolean;
  /** "Page" or "Location" (EPUBs). */
  unit?: string;
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
  unit = 'Page',
}: ReaderProgressSheetProps) {
  const activePanel = useReaderStore((s) => s.activePanel);
  const closePanel = useReaderStore((s) => s.closePanel);
  const currentStreak = useReaderStore((s) => s.currentStreak);
  const dailyGoalProgress = useReaderStore((s) => s.dailyGoalProgress);
  const bottomBarHeight = useReaderStore((s) => s.bottomBarHeight);

  const isOpen = activePanel === 'progress';
  const known = totalPages > 0;

  const stats: { icon: BBIconName; label: string; value: string; sub: string }[] = [
    { icon: 'read', label: 'Progress', value: known ? `${percentComplete}%` : '—', sub: known ? `${unit.toLowerCase()} ${currentPage} of ${totalPages}` : 'still counting pages' },
    { icon: 'calendar', label: 'Left in book', value: known ? `${minutesLeft} min` : '—', sub: 'at your current pace' },
    { icon: 'goals', label: 'This session', value: formatSessionTime(sessionSeconds), sub: 'reading time' },
    { icon: 'streak', label: 'Streak', value: `${currentStreak}`, sub: currentStreak === 1 ? 'day' : 'days' },
    { icon: 'analytics', label: 'Daily goal', value: `${Math.round(dailyGoalProgress)}%`, sub: 'of today’s target' },
  ];

  return (
    <div
      role="dialog"
      aria-label="Reading stats"
      aria-hidden={!isOpen}
      inert={!isOpen}
      style={{ bottom: bottomBarHeight + 8 }}
      className={[
        'absolute inset-x-2 z-[44] mx-auto max-w-2xl overflow-hidden rounded-bb-lg border border-[color:var(--rd-border)] bg-[color:var(--rd-panel)] text-[color:var(--rd-ink)] shadow-e2',
        'transition-[transform,opacity] duration-bb-ui',
        isOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      ].join(' ')}
    >
      <div className="flex items-center justify-between border-b border-[color:var(--rd-border)] px-4 py-2.5">
        <h2 className="font-display text-base font-extrabold tracking-[-0.01em]">Reading stats</h2>
        <button
          type="button"
          onClick={closePanel}
          aria-label="Close reading stats"
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-[color:var(--rd-track)] focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Icon name="close" size={18} fillLayer={false} />
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-5">
        {stats.map(({ icon, label, value, sub }) => (
          <li key={label} className="rounded-bb-md bg-[color:var(--rd-track)] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--rd-sub)]">
              <Icon name={icon} size={14} />
              {label}
            </div>
            <div className="mt-1 font-display text-xl font-bold tabular-nums">{value}</div>
            <div className="text-xs text-[color:var(--rd-sub)]">{sub}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
