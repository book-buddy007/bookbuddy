/**
 * Regression tests for audit finding BB-004.
 *
 * Two properties are asserted, because the bug and its naive fix are opposites and
 * a test suite that only covers one of them lets the other through:
 *
 *   1. Two different source IPs must get INDEPENDENT rate-limit keys.
 *      (The original defect: all callers collapsed into one bucket.)
 *   2. A client-supplied X-Forwarded-For must NOT be honoured.
 *      (The naive fix's defect: `trust proxy: true` lets anyone mint a private
 *      unlimited bucket by spoofing the header.)
 */
import * as express from 'express';
import * as request from 'supertest';
import {
  getClientIp,
  getTargetAccountKey,
  resolveTrustProxySetting,
} from './client-ip';

/**
 * Stands up a tiny Express app configured exactly as main.ts configures the real
 * one, and reports what getClientIp() resolves. Testing through Express rather
 * than against a hand-built mock is deliberate: the defect lived in the
 * interaction between Express's `trust proxy` setting and the throttler, and a
 * mock `req` would have happily passed while production stayed broken.
 */
function buildApp() {
  const app = express();
  app.use(express.json());
  app.set('trust proxy', resolveTrustProxySetting());
  app.all('/probe', (req, res) => {
    res.json({
      resolved: getClientIp(req),
      account: getTargetAccountKey(req),
      expressIp: req.ip,
      expressIps: req.ips,
    });
  });
  return app;
}

describe('BB-004 — client IP resolution', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe('resolveTrustProxySetting', () => {
    it('defaults to address-pinned trust, not a hop count', () => {
      delete process.env.TRUST_PROXY;
      expect(resolveTrustProxySetting()).toEqual(['loopback', 'uniquelocal']);
    });

    it('never defaults to `true`, which would trust the whole forwarded chain', () => {
      delete process.env.TRUST_PROXY;
      expect(resolveTrustProxySetting()).not.toBe(true);
    });

    it('supports an explicit CIDR list for the behind-Cloudflare mode', () => {
      process.env.TRUST_PROXY = 'loopback,uniquelocal,173.245.48.0/20';
      expect(resolveTrustProxySetting()).toEqual(['loopback', 'uniquelocal', '173.245.48.0/20']);
    });

    it('can be disabled for direct-to-app deployments', () => {
      process.env.TRUST_PROXY = 'false';
      expect(resolveTrustProxySetting()).toBe(false);
    });
  });

  describe('property 1 — distinct callers get distinct keys', () => {
    it('resolves different forwarded clients to different values', async () => {
      const app = buildApp();

      // supertest connects over loopback, which IS in the trusted set, so the
      // forwarded address is honoured — exactly as Traefik's hop would be.
      const a = await request(app).get('/probe').set('X-Forwarded-For', '203.0.113.10');
      const b = await request(app).get('/probe').set('X-Forwarded-For', '198.51.100.20');

      expect(a.body.resolved).toBe('203.0.113.10');
      expect(b.body.resolved).toBe('198.51.100.20');
      expect(a.body.resolved).not.toBe(b.body.resolved);
    });

    it('REGRESSION: the pre-fix behaviour collapsed both callers into one key', async () => {
      // With `trust proxy` unset, Express ignores X-Forwarded-For entirely and
      // req.ip is the socket address for every caller. This is the original bug,
      // reproduced deliberately so the test fails loudly if the setting is
      // ever removed from main.ts.
      const brokenApp = express();
      brokenApp.use(express.json());
      // NOTE: no app.set('trust proxy', ...) — this is what production looked like.
      brokenApp.all('/probe', (req, res) => {
        res.json({ resolved: getClientIp(req) });
      });

      const a = await request(brokenApp).get('/probe').set('X-Forwarded-For', '203.0.113.10');
      const b = await request(brokenApp).get('/probe').set('X-Forwarded-For', '198.51.100.20');

      expect(a.body.resolved).toBe(b.body.resolved); // one shared bucket — the defect
    });
  });

  describe('property 2 — a spoofed X-Forwarded-For must not create a private bucket', () => {
    it('ignores a client-supplied entry that sits left of the proxy-appended one', async () => {
      const app = buildApp();

      // Traefik APPENDS the real peer address to whatever the client sent, so the
      // chain is "<client-claim>, <real-peer>". Express walks from the socket
      // outwards and stops at the first untrusted address, which is the real peer.
      const res = await request(app)
        .get('/probe')
        .set('X-Forwarded-For', '10.9.9.9, 203.0.113.77');

      expect(res.body.resolved).toBe('203.0.113.77');
      expect(res.body.resolved).not.toBe('10.9.9.9');
    });

    it('does not let a caller vary its key by inventing chain entries', async () => {
      const app = buildApp();
      const keys = new Set<string>();

      for (const spoof of ['1.1.1.1', '2.2.2.2', '3.3.3.3']) {
        const res = await request(app)
          .get('/probe')
          .set('X-Forwarded-For', `${spoof}, 203.0.113.77`);
        keys.add(res.body.resolved);
      }

      // All three must land in the SAME bucket. If this set grows, an attacker can
      // mint unlimited private budgets and the rate limit is bypassed entirely.
      expect(keys.size).toBe(1);
      expect([...keys][0]).toBe('203.0.113.77');
    });

    it('ignores CLIENT_IP_HEADER when the connecting peer is not trusted', () => {
      process.env.CLIENT_IP_HEADER = 'cf-connecting-ip';
      // req.ips empty => Express did not match a trusted proxy => header is
      // attacker-controlled and must be discarded.
      const req: any = {
        ips: [],
        ip: '203.0.113.5',
        headers: { 'cf-connecting-ip': '9.9.9.9' },
        socket: { remoteAddress: '203.0.113.5' },
      };
      expect(getClientIp(req)).toBe('203.0.113.5');
      expect(getClientIp(req)).not.toBe('9.9.9.9');
    });

    it('honours CLIENT_IP_HEADER only when the peer IS trusted', () => {
      process.env.CLIENT_IP_HEADER = 'cf-connecting-ip';
      const req: any = {
        ips: ['203.0.113.5'], // non-empty => trust proxy matched the peer
        ip: '203.0.113.5',
        headers: { 'cf-connecting-ip': '9.9.9.9' },
        socket: { remoteAddress: '172.18.0.2' },
      };
      expect(getClientIp(req)).toBe('9.9.9.9');
    });
  });

  describe('normalisation — one caller must not occupy two buckets', () => {
    it('collapses IPv4-mapped IPv6 to the IPv4 form', () => {
      expect(getClientIp({ ip: '::ffff:203.0.113.9' })).toBe('203.0.113.9');
    });

    it('strips IPv6 zone identifiers', () => {
      expect(getClientIp({ ip: 'fe80::1%eth0' })).toBe('fe80::1');
    });

    it('never returns an empty string, which would act as a shared constant', () => {
      expect(getClientIp({})).toBe('unknown');
      expect(getClientIp({ ip: '' })).toBe('unknown');
    });
  });

  describe('account keying', () => {
    it('prefers the authenticated user id', () => {
      expect(getTargetAccountKey({ user: { id: 'u_1' }, body: { email: 'a@b.com' } })).toBe('uid:u_1');
    });

    it('falls back to the target email for unauthenticated recovery routes', () => {
      expect(getTargetAccountKey({ body: { email: 'Someone@Example.COM' } })).toBe('acct:someone@example.com');
    });

    it('lowercases, so one account cannot be split into two budgets by casing', () => {
      const a = getTargetAccountKey({ body: { email: 'User@Example.com' } });
      const b = getTargetAccountKey({ body: { email: 'user@example.com' } });
      expect(a).toBe(b);
    });

    it('returns null when no account is identifiable, so the caller falls back to IP', () => {
      expect(getTargetAccountKey({ body: { token: 'abc' } })).toBeNull();
      expect(getTargetAccountKey({})).toBeNull();
    });
  });
});
