import * as Sentry from '@sentry/nextjs';

// Browser error tracking. NEXT_PUBLIC_SENTRY_DSN is inlined at build time (see
// the ARG in the Dockerfile); if it is absent the SDK stays a no-op.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    // Errors only — no tracing, no session replay.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
