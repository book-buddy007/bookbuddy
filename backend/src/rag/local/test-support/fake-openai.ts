import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';

/**
 * A stand-in for the two OpenAI endpoints Book Buddy uses, for tests that must exercise the real
 * provider code (HTTP, retries, streaming) without a real key or any cost.
 *
 *  - POST /embeddings        deterministic vectors built from hashed words, so texts that share
 *                            words really do score higher than texts that do not.
 *  - POST /chat/completions  a streamed reply, word by word, ending with [DONE].
 *
 * `script` lets a test make the next calls fail in specific ways, in order, before normal behaviour
 * resumes (a 401, a 429 with Retry-After, a 500, ...).
 */
export interface ScriptedResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface RecordedRequest {
  path: string;
  headers: IncomingMessage['headers'];
  body: any;
}

export interface FakeOpenAi {
  /** Value for OPENAI_BASE_URL. */
  url: string;
  requests: RecordedRequest[];
  /** Responses to give the next requests, in order, before default behaviour resumes. */
  script: ScriptedResponse[];
  /** Text the chat endpoint streams back. */
  chatReply: string;
  close(): Promise<void>;
}

const fnv1a = (word: string): number => {
  let h = 0x811c9dc5;
  for (const byte of Buffer.from(word, 'utf8')) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
};

/** Hashed bag-of-words, L2-normalised. Deterministic; shared words mean higher cosine. */
export function fakeEmbedding(text: string, dimensions: number): number[] {
  const vec = new Array<number>(dimensions).fill(0);
  const words = text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [];
  for (const word of words) vec[fnv1a(word) % dimensions] += 1;
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

const readJson = (req: IncomingMessage): Promise<any> =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });

export async function startFakeOpenAi(): Promise<FakeOpenAi> {
  const state: FakeOpenAi = {
    url: '',
    requests: [],
    script: [],
    chatReply: 'Opportunity cost is the value of what you give up. [1]',
    close: async () => undefined,
  };

  const server: Server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const body = await readJson(req);
    state.requests.push({ path: req.url ?? '', headers: req.headers, body });

    const scripted = state.script.shift();
    if (scripted) {
      res.writeHead(scripted.status, {
        'Content-Type': 'application/json',
        ...(scripted.headers ?? {}),
      });
      res.end(JSON.stringify(scripted.body ?? {}));
      return;
    }

    if (req.url === '/v1/embeddings') {
      const inputs: string[] = Array.isArray(body.input) ? body.input : [body.input];
      const dimensions: number = body.dimensions ?? 3072;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          object: 'list',
          model: body.model,
          // Out of order on purpose: the provider must sort by `index`.
          data: inputs
            .map((text, index) => ({
              object: 'embedding',
              index,
              embedding: fakeEmbedding(text, dimensions),
            }))
            .reverse(),
        }),
      );
      return;
    }

    if (req.url === '/v1/chat/completions') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      for (const token of state.chatReply.split(/(?<= )/)) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: token } }] })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: `no route ${req.url}` } }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  state.url = `http://127.0.0.1:${port}/v1`;
  state.close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  return state;
}
