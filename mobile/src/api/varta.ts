import { apiFetch, ApiError } from './client';
import { API_BASE_URL } from './config';
import { getToken } from './tokenStore';

export interface Citation {
  chunkId: string;
  qdrantPointId?: string;
  pageNumber?: number;
  chapterTitle?: string;
  textPreview?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  createdAt: string;
}

/** GET /api/books/:bookId/chat-history — loads stored AI conversation history */
export function getChatHistory(bookId: string) {
  return apiFetch<ChatMessage[]>(`/api/books/${bookId}/chat-history`);
}

/** GET /api/books/:bookId/chunks/:chunkId/location — resolves citation details */
export function resolveCitationLocation(bookId: string, chunkId: string) {
  return apiFetch<Citation>(`/api/books/${bookId}/chunks/${encodeURIComponent(chunkId)}/location`);
}

export interface VartaAnswer {
  content: string;
  citations: Citation[];
  weakConceptLabels: string[];
}

/**
 * Ask Varta a question.
 *
 * `/chat` is a Server-Sent Events endpoint: it replies `text/event-stream` as
 * a sequence of `data: {...}` frames, NOT a JSON document. This used to go
 * through `apiFetch`, which runs the body through `safeJson` and gets null —
 * so the caller read `.content` off null, threw, and the catch showed
 * "Varta is processing your query. Please try again." Mobile chat could never
 * answer anything, and the failure message made it look like it was working.
 *
 * The frames are accumulated and returned as one answer rather than streamed.
 * React Native's fetch has no reliable ReadableStream, so incremental delivery
 * is not available here anyway; a correct answer that arrives at once beats a
 * stream that never parses. The wire format is shared with the web client —
 * see hooks/useBookChat.ts, which does stream it.
 */
export async function queryVartaAi(
  bookId: string,
  query: string,
  mode: string = 'explain',
): Promise<VartaAnswer> {
  const token = await getToken();
  const url =
    `${API_BASE_URL}/api/books/${bookId}/chat` +
    `?q=${encodeURIComponent(query)}&mode=${encodeURIComponent(mode)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0, 'NETWORK');
  }

  const body = await res.text();

  // Errors arrive before the stream opens and ARE plain JSON, so they still
  // need the ordinary treatment — including the trial gate the UI branches on.
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const parsed = JSON.parse(body);
      message = parsed?.message || parsed?.error || message;
      code = parsed?.reason;
    } catch {
      /* non-JSON error body — keep the status message */
    }
    throw new ApiError(Array.isArray(message) ? message.join(', ') : String(message), res.status, code);
  }

  return parseSseAnswer(body);
}

/**
 * Fold `data:` frames into one answer. Exported for testing — the parsing is
 * the part that was wrong, so it should not be reachable only through a
 * network call.
 *
 * An in-stream `error` frame is thrown: the endpoint reports failures that
 * happen after the headers are sent this way, and treating one as a normal
 * empty answer would present a broken response as a confident blank.
 */
export function parseSseAnswer(body: string): VartaAnswer {
  const answer: VartaAnswer = { content: '', citations: [], weakConceptLabels: [] };

  for (const line of body.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;

    let frame: any;
    try {
      frame = JSON.parse(payload);
    } catch {
      continue; // a partial or malformed frame should not lose the whole answer
    }

    if (frame.error) throw new ApiError(String(frame.error), 500, 'STREAM');
    if (typeof frame.content === 'string') answer.content += frame.content;
    if (Array.isArray(frame.citations)) answer.citations = frame.citations;
    if (Array.isArray(frame.weakConceptLabels)) answer.weakConceptLabels = frame.weakConceptLabels;
  }

  return answer;
}
