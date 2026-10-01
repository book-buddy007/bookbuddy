import { API_BASE_URL } from './config';
import { getToken, clearToken } from './tokenStore';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Attach the session token as a Bearer header. Default: true. */
  auth?: boolean;
  headers?: Record<string, string>;
};

/**
 * Thin fetch wrapper for the shared Book Buddy backend.
 *
 * Authentication is token-based: the Better Auth session token is sent as
 * `Authorization: Bearer <token>`, which the backend's BetterAuthGuard
 * accepts natively (no cookies, no WebView). This is what makes a true
 * native app possible against the same database as the web app.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true, headers = {} } = options;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = await getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      'Cannot reach the server. Check your connection and the API URL.',
      0,
      'NETWORK',
    );
  }

  // Session expired / invalid — clear the stored token so the UI can
  // redirect to login.
  if (res.status === 401 && auth) {
    await clearToken();
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : String(message),
      res.status,
      data?.code,
    );
  }

  return data as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
