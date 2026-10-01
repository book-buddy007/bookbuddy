'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { BookCover } from '@/components/ui/book-cover';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const isCompleted = (item: any) => (item.progress ?? 0) >= 100 || item.status === 'COMPLETED';

export default function ReadingListPage() {
  const { isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [readingList, setReadingList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSavedBooks = async () => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      try {
        const response = await apiClient.get('/library/saved');
        setReadingList(response.data || []);
      } catch (err) {
        console.error("Failed to fetch reading list:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSavedBooks();
  }, [isAuthenticated]);

  const q = searchQuery.trim().toLowerCase();
  const visible = readingList.filter((item) => {
    const book = item.book || item;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'COMPLETED' ? isCompleted(item) : (item.status || 'reading') === selectedStatus);
    const matchesQuery =
      !q || (book.title ?? '').toLowerCase().includes(q) || (book.author ?? '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Student"
        title="Reading list"
        description="Manage your saved books and track reading progress."
        actions={
          <Button asChild>
            <Link href="/catalog">
              Browse library <Icon name="arrow-right" size={18} />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          variant="featured"
          title="Total books"
          value={readingList.length}
          description="Books in your list"
          icon="bookmark"
          loading={isLoading}
        />
        <StatCard
          title="In progress"
          value={readingList.filter((b) => b.status === 'reading').length}
          description="Books you're reading"
          icon="read"
          loading={isLoading}
        />
        <StatCard
          title="Completed"
          value={readingList.filter(isCompleted).length}
          description="Books finished"
          icon="check-circle"
          loading={isLoading}
        />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Your reading list</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              wrapperClassName="sm:w-72"
              placeholder="Search your reading list"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All books</SelectItem>
                <SelectItem value="reading">Currently reading</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-44 rounded-[18px]" />
            ))}
          </div>
        ) : readingList.length === 0 ? (
          <EmptyState
            icon="bookmark"
            title="Your reading list is empty"
            description="Save books from the library and they will show up here."
            action={
              <Button asChild>
                <Link href="/catalog">Browse library</Link>
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState icon="search" title="No matching books" description="Try a different search or status filter." />
        ) : (
          <div className="space-y-4">
            {visible.map((item) => {
              const book = item.book || item; // Fallback mapping
              const done = isCompleted(item);
              const status = done ? 'completed' : item.status || 'reading';
              const progress = Math.min(100, item.progress || 0);
              return (
                <article key={item.id} className="flex gap-4 rounded-[18px] bg-bb-surface p-4 shadow-e1 sm:gap-5 sm:p-5">
                  <BookCover title={book.title} subject={book.genre ?? book.category} coverUrl={book.coverUrl} width={96} />
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-base font-semibold leading-snug">{book.title}</h3>
                        <p className="mt-0.5 truncate text-[13px] text-bb-muted">{book.author}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {book.rating && (
                          <span className="inline-flex items-center gap-1 text-sm font-bold">
                            <Icon name="star" size={16} /> {book.rating}
                          </span>
                        )}
                        {status === 'completed' ? (
                          <StatusBadge status="returned" label="Completed" />
                        ) : status === 'planned' ? (
                          <StatusBadge status="pending" label="Planned" />
                        ) : (
                          <StatusBadge status="reserved" label="Reading" />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip>{book.genre || 'General'}</Chip>
                      <Chip>{book.format || 'Digital'}</Chip>
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-[13px] text-bb-muted">
                        <span className="font-semibold">{progress}% read</span>
                        <span>Added {new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                    <div className="mt-auto pt-1">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/reader?bookId=${book.id}`}>
                          {progress > 0 && !done ? 'Continue reading' : done ? 'Read again' : 'Start reading'}
                          <Icon name="arrow-right" size={16} />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
