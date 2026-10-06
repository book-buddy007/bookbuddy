import { OpenAiHttpError } from './providers/openai-http';

/**
 * What a student is shown when Varta cannot answer.
 *
 * The raw error is for the server log: it can name the provider, the model, the account's
 * billing state or a masked key, none of which belongs on a student's screen or helps them.
 * Each category says what they can do about it (wait, try again, tell someone).
 */
export const AI_MESSAGES = {
  unavailable:
    "Varta isn't available right now. Please let your administrator know if this keeps happening.",
  busy: 'Varta is busy right now. Please try again in a minute.',
  slow: 'That took too long to answer. Please try again.',
  search:
    "Varta couldn't search this book just now. Please try again in a moment.",
  generic: 'Something went wrong while answering. Please try again.',
} as const;

export function clientMessageForAiError(err: unknown): string {
  if (err instanceof OpenAiHttpError) {
    if (err.status === 429 && err.code !== 'insufficient_quota') {
      return AI_MESSAGES.busy;
    }
    if (err.status === 408 || err.status >= 500) return AI_MESSAGES.busy;
    // Wrong key, unknown model, no credit, refused: only an administrator can fix these.
    return AI_MESSAGES.unavailable;
  }

  const name = err instanceof Error ? err.name : '';
  const message = err instanceof Error ? err.message : String(err ?? '');

  if (name === 'AbortError' || name === 'TimeoutError') return AI_MESSAGES.slow;
  if (/not configured|OPENAI_API_KEY|CLOUDFLARE_AI_TOKEN/i.test(message)) {
    return AI_MESSAGES.unavailable;
  }
  if (/Retrieval is unavailable/i.test(message)) return AI_MESSAGES.search;
  // The book lives in the shared library and it cannot be reached: the cause is for the log.
  if (name === 'SharedIndexUnavailableError') return AI_MESSAGES.search;
  return AI_MESSAGES.generic;
}
