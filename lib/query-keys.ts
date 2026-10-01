// React Query Keys Centralization for Catalog Module

export const catalogKeys = {
  all: ['catalog'] as const,
  books: () => [...catalogKeys.all, 'books'] as const,
  bookList: (filters: Record<string, any>) => [...catalogKeys.books(), { filters }] as const,
  bookDetails: (bookId: string) => [...catalogKeys.books(), bookId] as const,
  
  // Super-admin catalog page query keys
  stats: () => [...catalogKeys.all, 'stats'] as const,
  list: (filters: Record<string, any>) => [...catalogKeys.all, 'list', { filters }] as const,
  lists: () => [...catalogKeys.all, 'lists'] as const,
  pending: (filters?: Record<string, any>) => [...catalogKeys.all, 'pending', { filters }] as const,
  bin: (filters?: Record<string, any>) => [...catalogKeys.all, 'bin', { filters }] as const,
  publishers: () => [...catalogKeys.all, 'publishers'] as const,

  taxonomy: ['taxonomy'] as const,
  categories: (type?: string, parentId?: string) => [...catalogKeys.taxonomy, 'categories', { type, parentId }] as const,
  tags: (search?: string) => [...catalogKeys.taxonomy, 'tags', { search }] as const,
  
  dashboard: ['catalog-dashboard'] as const,
  recentMedia: () => [...catalogKeys.dashboard, 'recentMedia'] as const,
  trending: (limit?: number) => [...catalogKeys.dashboard, 'trending', { limit }] as const,
  recommendations: (limit?: number) => [...catalogKeys.dashboard, 'recommendations', { limit }] as const,
};
