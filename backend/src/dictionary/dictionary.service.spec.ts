import { DictionaryService } from './dictionary.service';

type Reply = { status?: number; body?: unknown } | 'hang' | 'fail';

/** Routes by host, so each test says what each outside service does. */
function routeFetch(routes: { dictionaryapi?: Reply; wiktionary?: Reply; wikipedia?: Reply; mymemory?: Reply }) {
  const calls: string[] = [];
  const fn = jest.fn(async (input: any, init?: any) => {
    const url = String(input);
    calls.push(url);
    const host = new URL(url).host;
    const key = host.includes('dictionaryapi') ? 'dictionaryapi' : host.includes('wiktionary') ? 'wiktionary' : host.includes('wikipedia') ? 'wikipedia' : 'mymemory';
    const reply: Reply = routes[key as keyof typeof routes] ?? { status: 404, body: null };
    if (reply === 'fail') throw new Error('network down');
    if (reply === 'hang') {
      // A source that never answers: only its own timeout ends the wait, as in production.
      return new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('The operation was aborted due to timeout'))));
    }
    return { status: reply.status ?? 200, json: async () => reply.body ?? null } as any;
  });
  (global as any).fetch = fn;
  return { calls, fn };
}

const DICT_OK = [{ phonetic: '/dɪˈmɒkrəsi/', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'Government by the people.', example: 'A democracy.' }] }] }];
const WIKT_OK = { en: [{ partOfSpeech: 'Noun', language: 'English', definitions: [{ definition: 'Rule by the people, especially as a form of <a href="/wiki/government">government</a>, such as:\n<ol><li>A form of government where the people <a>elect</a> representatives.</li></ol>', examples: ['<i>A true democracy.</i>'] }] }] };
const WIKI_OK = { query: { pages: { '1': { title: 'Democracy', extract: 'Democracy is a form of government.' } } } };
const MEM_OK = { responseStatus: 200, responseData: { translatedText: 'लोकतंत्र' } };

function make(cached: any = null) {
  const prisma: any = {
    wordCache: {
      findUnique: jest.fn().mockResolvedValue(cached),
      upsert: jest.fn().mockResolvedValue({}),
      update: jest.fn(async ({ data }: any) => ({ ...cached, ...data })),
    },
  };
  return { service: new DictionaryService(prisma), prisma };
}

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  // The service logs a warning for every source that fails; the tests assert behaviour, not noise.
  jest.spyOn(require('@nestjs/common').Logger.prototype, 'warn').mockImplementation(() => undefined);
});

describe('DictionaryService.lookup: a source that is down must not hold the student up', () => {
  it('answers within the timeout when the main dictionary never responds, using Wiktionary for the definition', async () => {
    routeFetch({ dictionaryapi: 'hang', wiktionary: { body: WIKT_OK }, wikipedia: { body: WIKI_OK }, mymemory: { body: MEM_OK } });
    const { service } = make();
    const t0 = Date.now();
    const out = await service.lookup('Democracy');
    expect(Date.now() - t0).toBeLessThan(2500); // not the ~20 s the dead service used to cost
    expect(out.definition).toMatch(/^Rule by the people, especially as a form of government, such as: A form of government where the people elect representatives\.$/);
    expect(out.partOfSpeech).toBe('noun');
    expect(out.example).toBe('A true democracy.');
    expect(out.hindiTranslation).toBe('लोकतंत्र');
    expect(out.wikiExtract).toMatch(/form of government/);
  }, 10_000);

  it('still answers, without a definition, when both dictionaries fail', async () => {
    routeFetch({ dictionaryapi: 'fail', wiktionary: 'fail', wikipedia: { body: WIKI_OK }, mymemory: { body: MEM_OK } });
    const out = await make().service.lookup('democracy');
    expect(out.definition).toBeNull();
    expect(out.wikiExtract).toBeTruthy();
    expect(out.hindiTranslation).toBe('लोकतंत्र');
  });

  it('prefers the main dictionary when it answers, for its pronunciation', async () => {
    routeFetch({ dictionaryapi: { body: DICT_OK }, wiktionary: { body: WIKT_OK }, wikipedia: { status: 404 }, mymemory: { body: MEM_OK } });
    const out = await make().service.lookup('democracy');
    expect(out.definition).toBe('Government by the people.');
    expect(out.pronunciation).toBe('/dɪˈmɒkrəsi/');
  });

  it('gives every request a timeout and a User-Agent', async () => {
    const { fn } = routeFetch({ dictionaryapi: { body: DICT_OK }, wiktionary: { status: 404 }, wikipedia: { status: 404 }, mymemory: { body: MEM_OK } });
    await make().service.lookup('democracy');
    for (const call of fn.mock.calls) {
      expect((call[1] as any).signal).toBeInstanceOf(AbortSignal);
      expect((call[1] as any).headers['User-Agent']).toMatch(/BookBuddy/);
    }
  });
});

describe('DictionaryService.lookup: translation', () => {
  it('does not show or save MyMemory\'s quota warning as a translation', async () => {
    routeFetch({ dictionaryapi: { body: DICT_OK }, wikipedia: { status: 404 }, mymemory: { body: { responseStatus: 200, responseData: { translatedText: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY.' } } } });
    const { service, prisma } = make();
    const out = await service.lookup('democracy');
    expect(out.hindiTranslation).toBeNull();
    expect(prisma.wordCache.upsert.mock.calls[0][0].create.hindiTranslation).toBeNull();
  });

  it('also refuses a translation MyMemory marks as failed', async () => {
    routeFetch({ dictionaryapi: { body: DICT_OK }, wikipedia: { status: 404 }, mymemory: { body: { responseStatus: 429, responseData: { translatedText: 'lots of text' } } } });
    expect((await make().service.lookup('democracy')).hindiTranslation).toBeNull();
  });
});

describe('DictionaryService.lookup: what is a word and what is a sentence', () => {
  it('sends nothing outside for a long selection', async () => {
    const { fn } = routeFetch({});
    const out = await make().service.lookup('The price puzzle: what drives the market in a village where every farmer sells wheat on the same day?');
    expect(fn).not.toHaveBeenCalled();
    expect(out).toMatchObject({ selection: 'long', definition: null, wikiExtract: null, hindiTranslation: null });
  });

  it('translates a short phrase but does not ask a word dictionary or an encyclopaedia', async () => {
    const { calls } = routeFetch({ mymemory: { body: MEM_OK } });
    const { service, prisma } = make();
    const out = await service.lookup('opportunity cost of time');
    expect(out).toMatchObject({ selection: 'phrase', hindiTranslation: 'लोकतंत्र', definition: null });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/mymemory/);
    expect(prisma.wordCache.upsert).not.toHaveBeenCalled(); // phrases are not cached as words
  });

  it('treats up to three words as a term', async () => {
    const { calls } = routeFetch({ dictionaryapi: { body: DICT_OK }, wikipedia: { status: 404 }, mymemory: { body: MEM_OK } });
    await make().service.lookup('opportunity cost');
    expect(calls.some((c) => /dictionaryapi/.test(c))).toBe(true);
  });

  it('does not ask the English dictionaries about a Devanagari word', async () => {
    const { calls } = routeFetch({ wikipedia: { body: WIKI_OK }, mymemory: { body: { responseStatus: 200, responseData: { translatedText: 'democracy' } } } });
    const out = await make().service.lookup('लोकतंत्र');
    expect(calls.some((c) => /dictionaryapi|wiktionary/.test(c))).toBe(false);
    expect(out.translationLang).toBe('en');
  });
});

describe('DictionaryService.lookup: the cache', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    word: 'democracy', definition: 'Government by the people.', hindiTranslation: 'लोकतंत्र', wikiExtract: 'x', wikiUrl: 'u',
    pronunciation: null, partOfSpeech: null, example: null, updatedAt: new Date(), ...over,
  });

  it('returns a complete cached word without asking anyone', async () => {
    const { fn } = routeFetch({});
    const out = await make(row()).service.lookup('democracy');
    expect(out).toMatchObject({ cached: true, definition: 'Government by the people.' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('gives a word saved without a definition (looked up during an outage) another try, and keeps the new definition', async () => {
    routeFetch({ dictionaryapi: { body: DICT_OK } });
    const stale = row({ definition: null, updatedAt: new Date(Date.now() - 3_600_000) });
    const { service, prisma } = make(stale);
    const out = await service.lookup('democracy');
    expect(out.definition).toBe('Government by the people.');
    expect(prisma.wordCache.update).toHaveBeenCalledWith({
      where: { word: 'democracy' },
      data: expect.objectContaining({ definition: 'Government by the people.', pronunciation: '/dɪˈmɒkrəsi/' }),
    });
    // Only the definition was asked for again, not the translation or Wikipedia that the row already has.
  });

  it('asks for the missing definition only: not translation or Wikipedia', async () => {
    const { calls } = routeFetch({ dictionaryapi: { body: DICT_OK } });
    await make(row({ definition: null, updatedAt: new Date(Date.now() - 3_600_000) })).service.lookup('democracy');
    expect(calls.every((c) => /dictionaryapi|wiktionary/.test(c))).toBe(true);
  });

  it('does not retry a missing definition more than once every ten minutes, and does not wait on the sources then', async () => {
    const { fn } = routeFetch({});
    const fresh = row({ definition: null, updatedAt: new Date(Date.now() - 60_000) });
    const out = await make(fresh).service.lookup('democracy');
    expect(fn).not.toHaveBeenCalled();
    expect(out.cached).toBe(true);
    expect(out.definition).toBeNull();
  });

  it('records a failed retry (so the next one waits) and returns what it has', async () => {
    routeFetch({ dictionaryapi: { status: 404 }, wiktionary: { status: 404 } });
    const { service, prisma } = make(row({ definition: null, updatedAt: new Date(Date.now() - 3_600_000) }));
    const out = await service.lookup('democracy');
    expect(out.definition).toBeNull();
    expect(prisma.wordCache.update).toHaveBeenCalledWith({ where: { word: 'democracy' }, data: { updatedAt: expect.any(Date) } });
  });

  it('saves a new word, filling rather than discarding on a concurrent save', async () => {
    routeFetch({ dictionaryapi: { body: DICT_OK }, wikipedia: { body: WIKI_OK }, mymemory: { body: MEM_OK } });
    const { service, prisma } = make();
    await service.lookup('democracy');
    const arg = prisma.wordCache.upsert.mock.calls[0][0];
    expect(arg.create).toMatchObject({ word: 'democracy', definition: 'Government by the people.' });
    expect(arg.update).toMatchObject({ definition: 'Government by the people.', hindiTranslation: 'लोकतंत्र' });
  });

  it('saves nothing when no source had anything', async () => {
    routeFetch({});
    const { service, prisma } = make();
    await service.lookup('zzqxv');
    expect(prisma.wordCache.upsert).not.toHaveBeenCalled();
  });

  it('does not retry a Hindi word\'s missing definition: there is no dictionary for it to come from', async () => {
    const { fn } = routeFetch({});
    const hi = row({ word: 'लोकतंत्र', definition: null, updatedAt: new Date(Date.now() - 3_600_000) });
    const out = await make(hi).service.lookup('लोकतंत्र');
    expect(fn).not.toHaveBeenCalled();
    expect(out.cached).toBe(true);
  });
});
