import { SharedLibraryError, SharedLibraryService, isUuid } from './shared-library.service';

const WORK = '5f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f';

describe('SharedLibraryService', () => {
  const saved = { ...process.env };
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;
  const service = new SharedLibraryService({ enabled: () => false } as any);

  beforeEach(() => {
    process.env.TRIO_INGEST_URL = 'https://dcp.test/api/internal/trio-ingest';
    process.env.TRIO_SERVICE_SECRET = 'service-secret';
    delete process.env.TRIO_API_BASE;
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });
  afterEach(() => {
    process.env = { ...saved };
    global.fetch = realFetch;
  });

  const reply = (status: number, body: unknown) =>
    fetchMock.mockResolvedValue({
      ok: status < 400,
      status,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    });

  describe('where it talks to', () => {
    it('derives the base from the ingest address', () => {
      expect(service.baseUrl()).toBe('https://dcp.test/api/internal');
    });
    it('prefers an explicit TRIO_API_BASE and ignores a trailing slash', () => {
      process.env.TRIO_API_BASE = 'https://other.test/api/internal/';
      expect(service.baseUrl()).toBe('https://other.test/api/internal');
    });
    it('says what to set when nothing is configured', () => {
      delete process.env.TRIO_INGEST_URL;
      expect(() => service.baseUrl()).toThrow(/TRIO_INGEST_URL/);
    });
  });

  describe('every request', () => {
    it('sends the secret in a header, never in the URL, and refuses redirects', async () => {
      reply(200, { success: true, works: [] });
      await service.listWorks('eco');
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://dcp.test/api/internal/trio-works?q=eco&limit=50');
      expect(String(url)).not.toContain('service-secret');
      expect(init.headers['X-Trio-Service-Secret']).toBe('service-secret');
      expect(init.redirect).toBe('error');
    });

    it('does not send anything when the secret is not set', async () => {
      delete process.env.TRIO_SERVICE_SECRET;
      await expect(service.listWorks()).rejects.toMatchObject({ status: 503 });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('listWorks', () => {
    it('returns the works, bounds the limit and trims the search', async () => {
      reply(200, { success: true, works: [{ contentItemId: WORK, title: 'Economics' }] });
      await expect(service.listWorks('  eco  ', 5000)).resolves.toEqual([{ contentItemId: WORK, title: 'Economics' }]);
      expect(fetchMock.mock.calls[0][0]).toBe('https://dcp.test/api/internal/trio-works?q=eco&limit=100');
    });
  });

  describe('getWork', () => {
    it('asks for the one work by id and returns it', async () => {
      reply(200, { success: true, works: [{ contentItemId: WORK, title: 'Economics', isbn: '978' }] });
      await expect(service.getWork(WORK)).resolves.toMatchObject({ contentItemId: WORK, title: 'Economics' });
      expect(fetchMock.mock.calls[0][0]).toBe(`https://dcp.test/api/internal/trio-works?id=${WORK}&limit=100`);
    });

    it('picks the work out of a list, never assuming, when DigiClassroom ignores the id', async () => {
      const other = '00000000-0000-4000-8000-000000000000';
      reply(200, { success: true, works: [{ contentItemId: other, title: 'Other' }, { contentItemId: WORK, title: 'Economics' }] });
      await expect(service.getWork(WORK)).resolves.toMatchObject({ title: 'Economics' });
    });

    it('says the work is not there or not public when it is not returned', async () => {
      reply(200, { success: true, works: [{ contentItemId: '00000000-0000-4000-8000-000000000000', title: 'Other' }] });
      await expect(service.getWork(WORK)).rejects.toMatchObject({ status: 404 });
      reply(200, { success: true, works: [] });
      await expect(service.getWork(WORK)).rejects.toMatchObject({ status: 404 });
    });

    it('refuses a malformed id without calling out', async () => {
      await expect(service.getWork('nope')).rejects.toMatchObject({ status: 400 });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('linkWork', () => {
    it('posts the book as bookbuddy with its ISBN', async () => {
      reply(200, { success: true, created: true });
      await service.linkWork({ contentItemId: WORK, bookId: 'book-1', isbn: '978' });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://dcp.test/api/internal/trio-link');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({
        contentItemId: WORK,
        sourceApp: 'bookbuddy',
        sourceLocalId: 'book-1',
        isbn: '978',
      });
    });

    it('rejects a malformed work id without calling out', async () => {
      await expect(service.linkWork({ contentItemId: 'nope', bookId: 'b' })).rejects.toMatchObject({ status: 400 });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("carries DigiClassroom's reason through and does not offer a refusal for retry", async () => {
      reply(422, { success: false, error: 'ISBN mismatch: the record says 1 but the work is 2.', code: 'ISBN_MISMATCH' });
      const err: any = await service.linkWork({ contentItemId: WORK, bookId: 'b' }).catch((e) => e);
      expect(err).toBeInstanceOf(SharedLibraryError);
      expect(err.message).toMatch(/ISBN mismatch/);
      expect(err.status).toBe(422);
      expect(err.retryable).toBe(false);
    });

    it('explains a rejected secret without naming it', async () => {
      reply(401, { success: false, error: 'Unauthorized' });
      const err: any = await service.listWorks().catch((e) => e);
      expect(err.message).toMatch(/rejected the service secret/);
      expect(err.message).not.toContain('service-secret');
    });

    it('treats a network failure and a server error as retryable', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      const net: any = await service.listWorks().catch((e) => e);
      expect(net.retryable).toBe(true);
      expect(net.message).toMatch(/Could not reach/);

      reply(500, 'oops');
      const server: any = await service.listWorks().catch((e) => e);
      expect(server.retryable).toBe(true);
    });
  });
});

describe('isUuid', () => {
  it('accepts UUIDs and nothing else', () => {
    expect(isUuid(WORK)).toBe(true);
    expect(isUuid('x')).toBe(false);
    expect(isUuid(`${WORK}; DROP`)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
