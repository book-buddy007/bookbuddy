'use client';

import { useEffect, useState } from 'react';
import { getGlobalCatalogBooks } from '@/lib/api/adminApi';

export interface CatalogBook {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  coverKey?: string;
  accessTier?: string;
}

/**
 * Client-side hook for fetching catalog books.
 * Wraps the adminApi `getGlobalCatalogBooks` function.
 */
export function useCatalogBooks(params: {
  search?: string;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { search = '', limit = 50, enabled = true } = params;
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setIsLoading(true);

    getGlobalCatalogBooks({ search, limit })
      .then(res => {
        if (cancelled) return;
        if (res.success && res.data) {
          // Handle both paginated { data: [...] } and plain array responses
          const items = Array.isArray(res.data) ? res.data : (res.data as any).data ?? [];
          setBooks(items);
        }
      })
      .catch(() => {
        // Silently fail — the parent component owns error display
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [search, limit, enabled]);

  return { books, isLoading };
}
