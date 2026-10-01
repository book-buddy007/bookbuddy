import * as Sentry from '@sentry/nestjs';

// Initialise error tracking as early as possible. This file is imported at the
// very top of main.ts — before any other module — so Sentry can instrument
// them. The DSN is injected via the SENTRY_DSN env var (Coolify); when it is
// absent (e.g. local dev) init() is skipped and the SDK stays a no-op.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    // Errors are tracked in GlitchTip; performance tracing is left off.
    tracesSampleRate: 0,
  });
}
