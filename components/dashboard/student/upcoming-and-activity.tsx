'use client';

import { Icon, type BBIconName } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';

function PanelShell({ icon, title, children }: { icon: BBIconName; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <Icon name={icon} size={22} />
        <h2 className="font-display text-lg font-extrabold tracking-[-0.02em]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

/* ───── Upcoming Panel ───── */
export interface UpcomingItem {
  id: string;
  title: string;
  subtitle: string;         // e.g. "Due tomorrow"
  priority?: 'high' | 'normal';
  /** Optional explicit status; otherwise derived from priority/subtitle. */
  overdue?: boolean;
}

export function UpcomingPanel({ items, isLoading }: { items: UpcomingItem[]; isLoading?: boolean }) {
  return (
    <PanelShell icon="calendar" title="Upcoming">
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <p className="py-4 text-center text-sm text-bb-muted">Nothing due. You&apos;re all caught up.</p>
      )}

      {!isLoading && items.length > 0 && (
        <ul className="divide-y divide-bb-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.title}</p>
                <p className="mt-0.5 text-xs text-bb-muted">{item.subtitle}</p>
              </div>
              {item.priority === 'high' && <StatusBadge status={item.overdue ? 'overdue' : 'due-soon'} />}
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}

/* ───── Activity Feed ───── */
export interface ActivityItem {
  id: string;
  message: string;          // e.g. "Highlighted 3 passages in Physics"
  type: 'highlight' | 'varta' | 'sanchika' | 'reading' | 'general';
  timestamp?: string;
}

const ACTIVITY_ICON: Record<ActivityItem['type'], BBIconName> = {
  highlight: 'highlight',
  varta: 'varta',
  sanchika: 'sanchika',
  reading: 'read',
  general: 'analytics',
};

export function ActivityFeed({ items, isLoading }: { items: ActivityItem[]; isLoading?: boolean }) {
  return (
    <PanelShell icon="analytics" title="Recent activity">
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-[10px]" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <p className="py-4 text-center text-sm text-bb-muted">Start reading to see your activity here.</p>
      )}

      {!isLoading && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-bb-surface-2">
                <Icon name={ACTIVITY_ICON[item.type]} size={18} />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm leading-snug">{item.message}</p>
                {item.timestamp && <p className="mt-0.5 text-xs text-bb-muted">{item.timestamp}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}
