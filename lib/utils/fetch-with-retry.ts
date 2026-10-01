/**
 * Utility to perform fetch requests with exponential backoff retries.
 * Useful for mitigating intermittent network failures, backend cold starts, or ECONNREFUSED errors.
 */

export interface FetchWithRetryOptions extends RequestInit {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (error: Error, attempt: number) => void;
}

export async function fetchWithRetry(url: string, options: FetchWithRetryOptions = {}): Promise<Response> {
    const {
        maxRetries = 3,
        baseDelayMs = 500,
        maxDelayMs = 5000,
        onRetry,
        ...fetchOptions
    } = options;

    let attempt = 0;

    while (true) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s absolute timeout per request

            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal as AbortSignal,
            });

            clearTimeout(timeoutId);

            // If we get a 502/503/504 Gateway/Service error, treat it as a transient failure and retry
            if (response.status >= 502 && response.status <= 504 && attempt < maxRetries) {
                throw new Error(`Server returned transient error status: ${response.status}`);
            }

            return response;
        } catch (error) {
            if (attempt >= maxRetries) {
                throw error;
            }

            attempt++;

            if (onRetry) {
                onRetry(error as Error, attempt);
            } else {
                console.warn(`Fetch to ${url} failed (Attempt ${attempt}/${maxRetries}): ${error instanceof Error ? error.message : String(error)}. Retrying...`);
            }

            // Exponential backoff with jitter
            const jitter = Math.random() * 200;
            const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1) + jitter, maxDelayMs);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
