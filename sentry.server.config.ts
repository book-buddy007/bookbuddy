import * as Sentry from '@sentry/nextjs';

// Server-side (Node runtime) error tracking. DSN is injected at runtime via the
// SENTRY_DSN env var (Coolify); absent locally, so init() is skipped.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    // GlitchTip is used for errors; performance tracing left off.
    tracesSampleRate: 0,
  });
}
