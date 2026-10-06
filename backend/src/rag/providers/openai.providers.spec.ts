import { OpenAiEmbeddingProvider } from './openai.embedding.provider';
import { OpenAiLlmProvider } from './openai.llm.provider';
import { ResilientLlmProvider } from './resilient.llm.provider';
import { OpenAiHttpError } from './openai-http';
import { AI_MESSAGES, clientMessageForAiError } from '../ai-client-errors';
import { FakeOpenAi, startFakeOpenAi } from '../local/test-support/fake-openai';

const config = (env: Record<string, string>) =>
  ({ get: (key: string, fallback?: string) => env[key] ?? fallback }) as any;

describe('OpenAI providers against a fake OpenAI server', () => {
  let fake: FakeOpenAi;
  const baseEnv = () => ({
    OPENAI_API_KEY: 'sk-test-key',
    OPENAI_BASE_URL: fake.url,
    EMBEDDING_DIMENSIONS: '64',
    OPENAI_RETRY_BASE_MS: '1', // keep retry tests fast
  });

  beforeAll(async () => {
    fake = await startFakeOpenAi();
  });
  afterAll(() => fake.close());
  beforeEach(() => {
    fake.requests.length = 0;
    fake.script.length = 0;
    fake.chatReply = 'Hello there friend';
  });

  describe('embeddings', () => {
    it('sends the model, key and requested dimensions, and returns vectors in input order', async () => {
      const provider = new OpenAiEmbeddingProvider(config(baseEnv()));
      const vectors = await provider.embedBatch(['alpha beta', 'gamma delta', 'epsilon']);

      expect(vectors).toHaveLength(3);
      expect(vectors.every((v) => v.length === 64)).toBe(true);
      const req = fake.requests[0];
      expect(req.path).toBe('/v1/embeddings');
      expect(req.headers.authorization).toBe('Bearer sk-test-key');
      expect(req.body).toMatchObject({ model: 'text-embedding-3-large', dimensions: 64 });
      // The server answers in reverse; the provider restores input order by `index`.
      const again = await provider.embedBatch(['epsilon']);
      expect(vectors[2]).toEqual(again[0]);
    });

    it('splits large inputs into batches of at most 100', async () => {
      const provider = new OpenAiEmbeddingProvider(config(baseEnv()));
      const out = await provider.embedBatch(Array.from({ length: 250 }, (_, i) => `text ${i}`));
      expect(out).toHaveLength(250);
      expect(fake.requests.map((r) => r.body.input.length)).toEqual([100, 100, 50]);
    });

    it('embeds to the width asked for in one call without changing the default', async () => {
      const provider = new OpenAiEmbeddingProvider(config(baseEnv()));
      const [wide] = await provider.embedBatch(['x'], { dimensions: 128 });
      expect(wide).toHaveLength(128);
      expect(fake.requests[0].body).toMatchObject({ dimensions: 128 });

      const [normal] = await provider.embedBatch(['x']);
      expect(normal).toHaveLength(64);
      expect(fake.requests[1].body).toMatchObject({ dimensions: 64 });
    });

    it('refuses a per-call width a fixed-width model cannot produce, before spending anything', async () => {
      const provider = new OpenAiEmbeddingProvider(
        config({ ...baseEnv(), OPENAI_EMBED_MODEL: 'text-embedding-ada-002', EMBEDDING_DIMENSIONS: '3072' }),
      );
      const before = fake.requests.length;
      await expect(provider.embedBatch(['x'], { dimensions: 1024 })).rejects.toThrow(/cannot produce 1024-dimension/);
      expect(fake.requests.length).toBe(before);
    });

    it('omits `dimensions` for a model that does not support it', async () => {
      const provider = new OpenAiEmbeddingProvider(
        config({ ...baseEnv(), OPENAI_EMBED_MODEL: 'text-embedding-ada-002', EMBEDDING_DIMENSIONS: '3072' }),
      );
      await provider.embedBatch(['x']);
      expect(fake.requests[0].body).not.toHaveProperty('dimensions');
    });

    it('fails clearly, and without calling OpenAI, when no key is set', async () => {
      const provider = new OpenAiEmbeddingProvider(config({ ...baseEnv(), OPENAI_API_KEY: '' }));
      await expect(provider.embedBatch(['x'])).rejects.toThrow(/set OPENAI_API_KEY/);
      expect(fake.requests).toHaveLength(0);
    });

    it('does NOT retry a rejected key: one request, a message that says what to fix', async () => {
      fake.script.push({ status: 401, body: { error: { message: 'Incorrect API key provided: sk-test***' } } });
      const provider = new OpenAiEmbeddingProvider(config(baseEnv()));
      await expect(provider.embedBatch(['x'])).rejects.toThrow('OpenAI rejected the API key. Check OPENAI_API_KEY.');
      expect(fake.requests).toHaveLength(1);
    });

    it('does not retry an unknown model or an oversized input, and names the model', async () => {
      fake.script.push({ status: 404, body: { error: { message: 'model not found' } } });
      const provider = new OpenAiEmbeddingProvider(config(baseEnv()));
      await expect(provider.embedBatch(['x'])).rejects.toThrow(/model "text-embedding-3-large" was not found/);
      expect(fake.requests).toHaveLength(1);

      fake.requests.length = 0;
      fake.script.push({ status: 400, body: { error: { message: 'input too long', code: 'context_length_exceeded' } } });
      await expect(provider.embedBatch(['x'])).rejects.toThrow(/failed \(400\): input too long/);
      expect(fake.requests).toHaveLength(1);
    });

    it('does not retry an account with no credit left', async () => {
      fake.script.push({ status: 429, body: { error: { message: 'quota', code: 'insufficient_quota' } } });
      const provider = new OpenAiEmbeddingProvider(config(baseEnv()));
      await expect(provider.embedBatch(['x'])).rejects.toThrow(/no credit left/);
      expect(fake.requests).toHaveLength(1);
    });

    it('retries a rate limit and a server error, then succeeds', async () => {
      fake.script.push(
        { status: 429, body: { error: { message: 'slow down' } }, headers: { 'retry-after': '0' } },
        { status: 503, body: { error: { message: 'overloaded' } } },
      );
      const provider = new OpenAiEmbeddingProvider(config(baseEnv()));
      const out = await provider.embedBatch(['x']);
      expect(out).toHaveLength(1);
      expect(fake.requests).toHaveLength(3);
    });

    it('gives up after the retries and reports the last error', async () => {
      for (let i = 0; i < 6; i++) fake.script.push({ status: 500, body: { error: { message: 'boom' } } });
      const provider = new OpenAiEmbeddingProvider(config(baseEnv()));
      await expect(provider.embedBatch(['x'])).rejects.toThrow(/failed \(500\): boom/);
      expect(fake.requests).toHaveLength(4); // the first try plus three retries
    });

    it('rejects vectors of the wrong width instead of storing them', async () => {
      const provider = new OpenAiEmbeddingProvider(
        config({ ...baseEnv(), OPENAI_EMBED_MODEL: 'text-embedding-ada-002', EMBEDDING_DIMENSIONS: '999' }),
      );
      // The fake honours no `dimensions` for ada and answers 3072-wide vectors.
      await expect(provider.embedBatch(['x'])).rejects.toThrow(/3072-dimension vectors but 999 were expected/);
    });

    it('rejects a response with the wrong number of embeddings', async () => {
      fake.script.push({ status: 200, body: { data: [] } });
      const provider = new OpenAiEmbeddingProvider(config(baseEnv()));
      await expect(provider.embedBatch(['x', 'y'])).rejects.toThrow(/0 embedding\(s\) for 2 input/);
    });
  });

  describe('chat', () => {
    it('streams tokens in order using the configured model', async () => {
      fake.chatReply = 'Opportunity cost is what you give up.';
      const llm = new OpenAiLlmProvider(config({ ...baseEnv(), OPENAI_CHAT_MODEL: 'gpt-test-model' }));
      const tokens: string[] = [];
      await llm.chatStream([{ role: 'user', content: 'q' }], (t) => tokens.push(t));

      expect(tokens.join('')).toBe('Opportunity cost is what you give up.');
      expect(tokens.length).toBeGreaterThan(3);
      expect(fake.requests[0].body).toMatchObject({ model: 'gpt-test-model', stream: true });
    });

    it('defaults to gpt-4o-mini when no model is configured', async () => {
      const llm = new OpenAiLlmProvider(config(baseEnv()));
      await llm.chatStream([{ role: 'user', content: 'q' }], () => undefined);
      expect(fake.requests[0].body.model).toBe('gpt-4o-mini');
    });

    it('turns a rejected key into a clear error, not a raw response body', async () => {
      fake.script.push({ status: 401, body: { error: { message: 'Incorrect API key provided: sk-abc***xyz' } } });
      const llm = new OpenAiLlmProvider(config(baseEnv()));
      const err = await llm.chatStream([{ role: 'user', content: 'q' }], () => undefined).catch((e) => e);
      expect(err).toBeInstanceOf(OpenAiHttpError);
      expect(err.message).toBe('OpenAI rejected the API key. Check OPENAI_API_KEY.');
      expect(err.message).not.toMatch(/sk-/);
    });

    it('stops when the caller aborts', async () => {
      const llm = new OpenAiLlmProvider(config(baseEnv()));
      const controller = new AbortController();
      controller.abort();
      await expect(
        llm.chatStream([{ role: 'user', content: 'q' }], () => undefined, controller.signal),
      ).rejects.toThrow();
    });

    it('refuses without calling OpenAI when no key is set', async () => {
      const llm = new OpenAiLlmProvider(config({ ...baseEnv(), OPENAI_API_KEY: '' }));
      await expect(llm.chatStream([], () => undefined)).rejects.toThrow(/OPENAI_API_KEY/);
      expect(fake.requests).toHaveLength(0);
    });
  });

  describe('resilient chat (OpenAI first, Cloudflare as fallback)', () => {
    const make = (fallbackImpl: (...a: any[]) => Promise<void>) => {
      const primary = new OpenAiLlmProvider(config(baseEnv()));
      return new ResilientLlmProvider(primary, { chatStream: fallbackImpl } as any);
    };

    it('uses the fallback when the primary fails before answering', async () => {
      fake.script.push({ status: 500, body: { error: { message: 'down' } } });
      const fallback = jest.fn(async (_m: any, onChunk: (t: string) => void) => onChunk('from fallback'));
      const tokens: string[] = [];
      await make(fallback).chatStream([{ role: 'user', content: 'q' }], (t) => tokens.push(t));
      expect(tokens).toEqual(['from fallback']);
    });

    it("reports the primary's real error when the fallback is merely not configured", async () => {
      fake.script.push({ status: 401, body: { error: { message: 'bad key' } } });
      const fallback = jest.fn(async () => {
        throw new Error('Cloudflare fallback is not configured — set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN.');
      });
      const err = await make(fallback)
        .chatStream([{ role: 'user', content: 'q' }], () => undefined)
        .catch((e) => e);
      expect(err).toBeInstanceOf(OpenAiHttpError);
      expect(err.message).toMatch(/rejected the API key/);
    });

    it('does not switch models after the answer has started', async () => {
      const fallback = jest.fn();
      const primary = {
        chatStream: async (_m: any, onChunk: (t: string) => void) => {
          onChunk('partial');
          throw new Error('connection dropped');
        },
      };
      const resilient = new ResilientLlmProvider(primary as any, { chatStream: fallback } as any);
      const tokens: string[] = [];
      await expect(resilient.chatStream([], (t) => tokens.push(t))).rejects.toThrow('connection dropped');
      expect(tokens).toEqual(['partial']);
      expect(fallback).not.toHaveBeenCalled();
    });
  });
});

describe('clientMessageForAiError: what a student sees', () => {
  const http = (status: number, code: string | null = null) => new OpenAiHttpError(status, code, 'internal detail');

  it('says "busy" for rate limits and provider outages', () => {
    expect(clientMessageForAiError(http(429))).toBe(AI_MESSAGES.busy);
    expect(clientMessageForAiError(http(503))).toBe(AI_MESSAGES.busy);
    expect(clientMessageForAiError(http(408))).toBe(AI_MESSAGES.busy);
  });

  it('says "unavailable" for problems only an administrator can fix', () => {
    expect(clientMessageForAiError(http(401))).toBe(AI_MESSAGES.unavailable);
    expect(clientMessageForAiError(http(404))).toBe(AI_MESSAGES.unavailable);
    expect(clientMessageForAiError(http(429, 'insufficient_quota'))).toBe(AI_MESSAGES.unavailable);
    expect(clientMessageForAiError(new Error('Embeddings are not configured: set OPENAI_API_KEY.'))).toBe(
      AI_MESSAGES.unavailable,
    );
  });

  it('maps timeouts, retrieval failures and anything else', () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    expect(clientMessageForAiError(abort)).toBe(AI_MESSAGES.slow);
    expect(clientMessageForAiError(new Error('Retrieval is unavailable: boom'))).toBe(AI_MESSAGES.search);
    expect(clientMessageForAiError(new Error('something odd'))).toBe(AI_MESSAGES.generic);
    expect(clientMessageForAiError(undefined)).toBe(AI_MESSAGES.generic);
  });

  it('never leaks provider detail, model names, keys or stack text', () => {
    const leaky = new OpenAiHttpError(401, null, 'Incorrect API key provided: sk-proj-abc***xyz for model gpt-4o-mini');
    const shown = clientMessageForAiError(leaky);
    expect(shown).not.toMatch(/sk-|gpt-|key|model|OpenAI/i);
  });
});
