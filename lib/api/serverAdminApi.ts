import { cookies } from 'next/headers';
import { SECURE_SESSION_COOKIE, SESSION_COOKIE } from '@/lib/auth-cookies';

const BASE = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3333';

async function fetchServerAdmin<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  // Using better-auth's standard session cookie name
  const tokenCookie = 
    cookieStore.get(SESSION_COOKIE) || 
    cookieStore.get(SECURE_SESSION_COOKIE) || 
    cookieStore.get('token');
  const token = tokenCookie?.value;

  const url = `${BASE}${path}`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
    // Next.js 15 cache behavior: no-store for admin data
    cache: 'no-store',
  });
  
  if (!res.ok) throw new Error(`Server fetch failed: ${res.status} for ${url}`);
  const json = await res.json();
  // Unwrap adminApi { success: true, data: { ... } } structure if present
  if (json.success !== undefined && json.data) return json.data;
  return json;
}

export const serverAdminApi = {
  getBook: (bookId: string) => fetchServerAdmin<any>(`/api/super-admin/catalog/books/${bookId}`),
};
