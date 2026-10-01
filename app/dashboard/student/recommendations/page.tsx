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
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function RecommendationsPage() {
  const { isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('all');

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDiscoveryData = async () => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      try {
        const [recsRes, trendsRes] = await Promise.all([
          apiClient.get('/books/recommendations').catch(() => ({ data: [] })),
          apiClient.get('/books/trending').catch(() => ({ data: [] }))
        ]);
        setRecommendations(recsRes.data || []);
        setTrendingBooks(trendsRes.data || []);
      } catch (error) {
        console.error("Failed to fetch discovery data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDiscoveryData();
  }, [isAuthenticated]);

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Student"
        title="Book recommendations"
        description="Personalised suggestions based on your reading history and interests."
        actions={
          <>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="computer-science">Computer Science</SelectItem>
                <SelectItem value="psychology">Psychology</SelectItem>
                <SelectItem value="mathematics">Mathematics</SelectItem>
                <SelectItem value="literature">Literature</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All formats</SelectItem>
                <SelectItem value="physical">Physical books</SelectItem>
                <SelectItem value="e-book">E-books</SelectItem>
                <SelectItem value="audio">Audiobooks</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          variant="featured"
          title="Recommendations"
          value={recommendations.length}
          description="Personalised for you"
          icon="sparkles"
          loading={isLoading}
        />
        <StatCard
          title="Trending books"
          value={trendingBooks.length}
          description="Popular this week"
          icon="trending-up"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Personalised for you</h2>
            <p className="text-[13px] text-bb-muted">Selected based on your reading history and interests</p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-44 rounded-[18px]" />
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <EmptyState
              icon="sparkles"
              title="Not enough history yet"
              description="Read or borrow a few books and your recommendations will appear here."
              action={
                <Button asChild>
                  <Link href="/catalog">Browse library</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {recommendations.map((book) => (
                <article key={book.id} className="flex gap-4 rounded-[18px] bg-bb-surface p-4 shadow-e1 sm:gap-5 sm:p-5">
                  <BookCover title={book.title} subject={book.category} coverUrl={book.coverUrl} width={96} />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-base font-semibold leading-snug">{book.title}</h3>
                        <p className="mt-0.5 truncate text-[13px] text-bb-muted">{book.author}</p>
                      </div>
                      {book.rating && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold">
                          <Icon name="star" size={16} /> {book.rating}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip>{book.category || 'General'}</Chip>
                      <Chip>{book.format || 'Digital'}</Chip>
                    </div>
                    <p className="line-clamp-2 text-sm text-bb-muted">
                      {book.description || 'A recommended book based on your learning profile.'}
                    </p>
                    {book.reason && (
                      <p className="flex items-start gap-2 rounded-xl bg-bb-accent-soft px-3 py-2 text-[13px] font-medium text-bb-accent-ink">
                        <Icon name="varta" size={16} className="mt-0.5 shrink-0" />
                        <span className="leading-snug">{book.reason}</span>
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2 pt-1">
                      <Button variant="outline" size="sm">
                        <Icon name="bookmark" size={16} /> Save
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/catalog/${book.id}`}>
                          Details <Icon name="arrow-right" size={16} />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Trending now</h2>
            <p className="text-[13px] text-bb-muted">Popular among students this week</p>
          </div>

          <div className="rounded-[22px] bg-bb-surface p-4 shadow-e1 sm:p-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : trendingBooks.length === 0 ? (
              <p className="py-6 text-center text-sm text-bb-muted">No trending books right now.</p>
            ) : (
              <ul className="divide-y divide-bb-border">
                {trendingBooks.map((book, i) => (
                  <li key={book.id}>
                    <Link
                      href={`/catalog/${book.id}`}
                      className="flex items-center gap-4 rounded-xl py-3 focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      <span className="w-6 shrink-0 text-center font-display text-lg font-extrabold text-bb-accent-ink">
                        {book.trendingRank || i + 1}
                      </span>
                      <BookCover title={book.title} subject={book.category} coverUrl={book.coverUrl} width={44} />
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-1 text-sm font-semibold">{book.title}</h3>
                        <p className="truncate text-xs text-bb-muted">{book.author}</p>
                      </div>
                      {book.rating && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold">
                          <Icon name="star" size={14} /> {book.rating}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[22px] bg-bb-surface p-4 shadow-e1 sm:p-5">
            <h3 className="mb-3 text-sm font-semibold">Find a specific topic</h3>
            <div className="flex gap-2">
              <SearchInput
                placeholder="Search titles, authors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button asChild className="shrink-0">
                <Link href="/catalog">Explore</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
