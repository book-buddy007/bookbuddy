import { HubClientService } from './hub-client.service';
import { SharedLibraryError } from './shared-library.error';

describe('HubClientService', () => {
  const saved = { ...process.env };
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;
  const hub = new HubClientService();

  beforeEach(() => {
    process.env.HUB_URL = 'https://api.pdlms.test';
    process.env.HUB_SECRET = 'the-hub-secret';
    process.env.HUB_APP_ID = 'bookbuddy';
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

  describe('configuration', () => {
    it('is on only when both the address and the secret are set', () => {
      expect(hub.enabled()).toBe(true);
      delete process.env.HUB_SECRET;
      expect(hub.enabled()).toBe(false);
      process.env.HUB_SECRET = 'x';
      process.env.HUB_URL = '  ';
      expect(hub.enabled()).toBe(false);
    });

    it('defaults the app id and refuses a malformed one', () => {
      delete process.env.HUB_APP_ID;
      expect(hub.appId()).toBe('bookbuddy');
      process.env.HUB_APP_ID = 'Bad App';
      expect(() => hub.appId()).toThrow(/HUB_APP_ID/);
    });

    it('sends nothing when it is not configured', async () => {
      delete process.env.HUB_URL;
      await expect(hub.listWorks({})).rejects.toMatchObject({ status: 503 });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refuses plain http except for localhost, because the secret and links cross that connection', async () => {
      process.env.HUB_URL = 'http://api.pdlms.test';
      await expect(hub.listWorks({})).rejects.toThrow(/https/);
      expect(fetchMock).not.toHaveBeenCalled();
      process.env.HUB_URL = 'http://localhost:4000';
      reply(200, { items: [], total: 0 });
      await hub.listWorks({});
      expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/api/hub/works');
    });
  });

  describe('every request', () => {
    it('sends the app id and secret in headers, never in the URL, and refuses redirects', async () => {
      reply(200, { items: [], total: 0 });
      await hub.listWorks({ q: 'eco', limit: 10 });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.pdlms.test/api/hub/works?q=eco&limit=10');
      expect(String(url)).not.toContain('the-hub-secret');
      expect(init.headers['X-Hub-App']).toBe('bookbuddy');
      expect(init.headers['X-Hub-Secret']).toBe('the-hub-secret');
      expect(init.redirect).toBe('error');
    });

    it('caps the page size at the hub’s limit and trims the search', async () => {
      reply(200, { items: [] });
      await hub.listWorks({ q: `  ${'x'.repeat(300)}  `, limit: 999 });
      const url = new URL(fetchMock.mock.calls[0][0]);
      expect(url.searchParams.get('limit')).toBe('50');
      expect(url.searchParams.get('q')).toHaveLength(100);
    });

    it('encodes ids into the path', async () => {
      reply(200, {});
      await hub.getWork('a/b?c');
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.pdlms.test/api/hub/works/a%2Fb%3Fc');
    });
  });

  describe('failures', () => {
    it('explains a rejected secret without repeating it', async () => {
      reply(401, { message: 'Invalid hub credentials.' });
      const err: any = await hub.listWorks({}).catch((e) => e);
      expect(err).toBeInstanceOf(SharedLibraryError);
      expect(err.status).toBe(502);
      expect(err.message).toMatch(/HUB_SECRET/);
      expect(err.message).not.toContain('the-hub-secret');
    });

    it('says the hub is off when the server answers 503, and rate limiting when 429', async () => {
      reply(503, { message: 'The library hub is not enabled on this server.' });
      await expect(hub.listWorks({})).rejects.toMatchObject({ status: 503, message: expect.stringMatching(/not enabled/) });
      reply(429, {});
      await expect(hub.listWorks({})).rejects.toMatchObject({ status: 429 });
    });

    it('passes the hub’s own reason through for refusals, and joins a list of reasons', async () => {
      reply(409, { message: 'The ISBN does not match the hub work; the link was not made.' });
      const err: any = await hub.linkWork('w1', 'b1', '9780000000002').catch((e) => e);
      expect(err.status).toBe(409);
      expect(err.message).toMatch(/ISBN does not match/);
      expect(err.retryable).toBe(false);
      reply(400, { message: ['a', 'b'] });
      await expect(hub.linkWork('w1', 'b1')).rejects.toMatchObject({ message: 'a; b' });
    });

    it('reports an unreachable hub as retryable, without leaking the headers', async () => {
      fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));
      const err: any = await hub.listWorks({}).catch((e) => e);
      expect(err).toMatchObject({ status: 0, retryable: true });
      expect(err.message).not.toContain('the-hub-secret');
    });

    it('treats a server error as retryable and a refusal as not', async () => {
      reply(500, 'oops');
      expect(await hub.listWorks({}).catch((e) => e)).toMatchObject({ retryable: true });
      reply(404, { message: 'Work not found' });
      expect(await hub.getWork('x').catch((e) => e)).toMatchObject({ retryable: false, message: 'Work not found' });
    });
  });

  describe('calls', () => {
    it('posts the link with the record id and the ISBN only when there is one', async () => {
      reply(201, { linked: true });
      await hub.linkWork('w1', 'book-9', '9788174501234');
      let [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.pdlms.test/api/hub/works/w1/link');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({ appRef: 'book-9', isbn: '9788174501234' });
      await hub.linkWork('w1', 'book-9', null);
      [, init] = fetchMock.mock.calls[1];
      expect(JSON.parse(init.body)).toEqual({ appRef: 'book-9' });
    });

    it('returns a file link only when it is https', async () => {
      reply(201, { url: 'https://r2.test/x?sig=1', expiresAt: 'later', mimeType: 'application/pdf', sizeBytes: 1, version: 'v' });
      await expect(hub.fileLink('w1', 'f1')).resolves.toMatchObject({ url: 'https://r2.test/x?sig=1' });
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.pdlms.test/api/hub/works/w1/files/f1/link');
      for (const url of ['http://r2.test/x', 'javascript:alert(1)', 'not a url', undefined]) {
        reply(201, { url });
        await expect(hub.fileLink('w1', 'f1')).rejects.toMatchObject({ status: 502 });
      }
    });

    it('does not log a file link when a request fails', async () => {
      const spy = jest.spyOn((hub as any).logger, 'error').mockImplementation(() => undefined);
      fetchMock.mockRejectedValue(new Error('boom'));
      await hub.fileLink('w1', 'f1').catch(() => undefined);
      expect(JSON.stringify(spy.mock.calls)).not.toContain('the-hub-secret');
      spy.mockRestore();
    });
  });
});
