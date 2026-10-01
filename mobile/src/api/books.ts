import { apiFetch } from './client';
import type { Book, Category, Paginated, ReadUrlResponse } from './types';

export interface BookQuery {
  search?: string;
  category?: string;
  format?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function toQueryString(params: Record<string, unknown> | BookQuery): string {
  const q = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** GET /books — public paginated catalog (global approved books). */
export function listBooks(query: BookQuery = {}) {
  return apiFetch<Paginated<Book>>(`/books${toQueryString(query)}`, {
    auth: false,
  });
}

/** GET /books/categories?type=GENRE */
export function listCategories(type = 'GENRE') {
  return apiFetch<Category[]>(`/books/categories?type=${type}`, { auth: false });
}

/** GET /books/:id — public book detail. */
export function getBook(id: string) {
  return apiFetch<Book>(`/books/${id}`, { auth: false });
}

/** GET /books/:id/read-url — authenticated presigned content URL. */
export function getReadUrl(id: string, format: string) {
  return apiFetch<ReadUrlResponse>(`/books/${id}/read-url?format=${format}`);
}

/** POST /books/:id/borrow — authenticated borrow. */
export function borrowBook(id: string) {
  return apiFetch<{ success: boolean; message: string; dueDate: string }>(
    `/books/${id}/borrow`,
    { method: 'POST' },
  );
}

/** POST /books/:id/return — returns a borrowed title. */
export function returnBook(id: string) {
  return apiFetch<{ success: boolean; message: string }>(
    `/books/${id}/return`,
    { method: 'POST' },
  );
}
