'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/store/useAuthStore';
import { EnhancedCard, EnhancedCardContent } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Brain, BookOpen, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1
          className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <Brain className="h-6 w-6 text-[var(--peacock-teal)]" />
          Quick Review
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Concepts you learned a while ago that could use a quick revisit, before you forget them.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900 text-center text-sm">
          {error}
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <EnhancedCard>
          <EnhancedCardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-slate-600 dark:text-slate-300 font-medium">You're all caught up!</p>
            <p className="text-sm text-slate-400">
              Nothing needs review right now — check back after you've read a bit more.
            </p>
          </EnhancedCardContent>
        </EnhancedCard>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <EnhancedCard key={item.id} className="hover:shadow-md transition-shadow">
            <EnhancedCardContent className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--deep-saffron)]">
                  {item.conceptLabel}
                </p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5 mt-0.5">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {item.bookTitle}
                  {item.chapterTitle && <span className="text-slate-400"> — {item.chapterTitle}</span>}
                </p>
              </div>
              <EnhancedButton
                size="sm"
                onClick={() => handleReview(item)}
                loading={actioningId === item.id}
                icon={<ArrowRight className="h-4 w-4" />}
                iconPosition="right"
                className="shrink-0"
              >
                Review
              </EnhancedButton>
            </EnhancedCardContent>
          </EnhancedCard>
        ))}
      </div>
    </div>
  );
}
