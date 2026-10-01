'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';

interface ResurfacingQueueItem {
  id: string;
  bookId: string;
  bookTitle: string;
  conceptId: string;
  conceptLabel: string;
  page: number | null;
  chapterTitle: string | null;
  scheduledAt: string;
  sentAt: string | null;
  actioned: boolean;
}

export default function ReviewPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<ResurfacingQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchQueue = useCallback(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    apiClient
      .get('/students/me/resurfacing-queue')
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError('Could not load your review queue.'))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleReview = async (item: ResurfacingQueueItem) => {
    setActioningId(item.id);
    try {
      await apiClient.post(`/students/me/resurfacing-queue/${item.id}/actioned`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      const query = item.page ? `?bookId=${item.bookId}&page=${item.page}&tab=graph` : `?bookId=${item.bookId}&tab=graph`;
      router.push(`/reader${query}`);
    } catch {
      setActioningId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        className="mb-0"
        eyebrow="Student"
        title="Quick review"
        description="Concepts you learned a while ago that could use a quick revisit, before you forget them."
      />

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[76px] rounded-[18px]" />
          ))}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-[18px] bg-bb-danger-soft px-5 py-4 text-sm font-semibold text-bb-danger-ink"
        >
          <Icon name="alert-circle" size={20} />
          <span className="flex-1">{error}</span>
          <button onClick={fetchQueue} className="underline">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          icon="check-circle"
          title="You're all caught up"
          description="Nothing needs review right now. Check back after you've read a bit more."
        />
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-[18px] bg-bb-surface p-4 shadow-e1 sm:px-5"
          >
            <div className="min-w-0">
              <Chip icon="sanchika" className="mb-1.5 max-w-full">
                <span className="truncate">{item.conceptLabel}</span>
              </Chip>
              <p className="truncate text-sm font-semibold">
                {item.bookTitle}
                {item.chapterTitle && <span className="font-normal text-bb-muted"> · {item.chapterTitle}</span>}
              </p>
            </div>
            <Button size="sm" className="shrink-0" onClick={() => handleReview(item)} disabled={actioningId === item.id}>
              {actioningId === item.id ? <Icon name="loader" size={16} className="animate-spin" /> : null}
              Review <Icon name="arrow-right" size={16} />
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
