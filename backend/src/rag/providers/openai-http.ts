import { ConfigService } from '@nestjs/config';

/**
 * Shared pieces of the OpenAI chat and embedding providers: where requests go, what an
 * error looks like, and which errors are worth retrying.
 */

/** A non-2xx answer from OpenAI, reduced to what a person can act on. */
export class OpenAiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
    /** From a Retry-After header, capped. Null when the server gave none. */
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'OpenAiHttpError';
  }
}

/**
 * Base address for OpenAI calls, without a trailing slash. Defaults to OpenAI itself;
 * `OPENAI_BASE_URL` points it at a proxy, an OpenAI-compatible gateway, or a local fake
 * server in tests.
 */
export function openAiBaseUrl(config: ConfigService): string {
  const raw = config.get<string>('OPENAI_BASE_URL')?.trim();
  return (raw || 'https://api.openai.com/v1').replace(/\/+$/, '');
}

const MAX_RETRY_AFTER_MS = 30_000;

/**
 * Turns a failed response into an OpenAiHttpError whose message says what to do about it
 * (wrong key, unknown model, out of credit) instead of dumping the raw response body.
 */
export async function toOpenAiHttpError(
  res: Response,
  what: string,
  model: string,
): Promise<OpenAiHttpError> {
  const text = await res.text().catch(() => '');
  let providerMessage = '';
  let code: string | null = null;
  try {
    const parsed = JSON.parse(text);
    providerMessage = String(parsed?.error?.message ?? '');
    code = (parsed?.error?.code ?? parsed?.error?.type ?? null) as string | null;
  } catch {
    providerMessage = text.slice(0, 200);
  }

  const retryAfterSeconds = Number(res.headers.get('retry-after'));
  const retryAfterMs =
    Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.min(retryAfterSeconds * 1000, MAX_RETRY_AFTER_MS)
      : null;

  let message: string;
  if (res.status === 401) {
    message = 'OpenAI rejected the API key. Check OPENAI_API_KEY.';
  } else if (res.status === 403) {
    message =
      'OpenAI refused this key for that request (permissions, project or region).';
  } else if (res.status === 404) {
    message = `OpenAI model "${model}" was not found, or this key cannot use it.`;
  } else if (code === 'insufficient_quota') {
    message = 'The OpenAI account has no credit left. Check its billing.';
  } else {
    message = `${what} failed (${res.status})${providerMessage ? `: ${providerMessage.slice(0, 200)}` : ''}`;
  }
  return new OpenAiHttpError(res.status, code, message, retryAfterMs);
}

/**
 * Whether trying the same request again could succeed: rate limits, server errors and
 * timeouts yes; a wrong key, an unknown model or an oversized input never will, and
 * retrying those only delays the real message by several seconds.
 */
export function isRetryable(err: unknown): boolean {
  if (err instanceof OpenAiHttpError) {
    if (err.code === 'insufficient_quota') return false;
    return [408, 409, 425, 429, 500, 502, 503, 504].includes(err.status);
  }
  // Network failures surface as TypeError ("fetch failed"); AbortSignal.timeout as TimeoutError.
  return (
    err instanceof Error &&
    (err.name === 'TypeError' || err.name === 'TimeoutError')
  );
}
