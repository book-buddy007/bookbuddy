import { fetchWithRetry } from './fetch-with-retry';

// Mocking the global fetch function
const originalFetch = global.fetch;

describe('fetchWithRetry utility', () => {
    afterEach(() => {
        global.fetch = originalFetch;
        jest.clearAllMocks();
    });

    it('should return successfully on the first attempt if no error occurs', async () => {
        const mockResponse = new Response(JSON.stringify({ success: true }), { status: 200 });
        global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);

        const result = await fetchWithRetry('http://test.com');
        expect(result).toBe(mockResponse);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error and succeed on subsequent attempt', async () => {
        const mockResponse = new Response(JSON.stringify({ success: true }), { status: 200 });

        // Fail first, succeed second
        global.fetch = jest.fn()
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockResolvedValueOnce(mockResponse);

        const onRetryMock = jest.fn();

        const result = await fetchWithRetry('http://test.com', {
            baseDelayMs: 10,
            maxDelayMs: 50,
            onRetry: onRetryMock
        });

        expect(result).toBe(mockResponse);
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(onRetryMock).toHaveBeenCalledTimes(1);
        expect(onRetryMock).toHaveBeenCalledWith(expect.any(TypeError), 1);
    });

    it('should throw an error after max retries are exhausted', async () => {
        // Always fail
        global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed'));

        const onRetryMock = jest.fn();

        await expect(fetchWithRetry('http://test.com', {
            maxRetries: 2,
            baseDelayMs: 10,
            onRetry: onRetryMock
        })).rejects.toThrow('fetch failed');

        // 1 initial try + 2 retries = 3 calls
        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(onRetryMock).toHaveBeenCalledTimes(2);
    });

    it('should retry on transient server errors (502, 503, 504) and succeed when fixed', async () => {
        const mockTransientError = new Response(null, { status: 503 });
        const mockSuccess = new Response(null, { status: 200 });

        global.fetch = jest.fn()
            .mockResolvedValueOnce(mockTransientError)
            .mockResolvedValueOnce(mockSuccess);

        const result = await fetchWithRetry('http://test.com', {
            baseDelayMs: 10,
        });

        expect(result).toBe(mockSuccess);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
