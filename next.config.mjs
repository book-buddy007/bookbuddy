import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  // Security headers applied to every response. CSP is intentionally omitted
  // here — a strict policy needs to be tuned against the app's inline scripts/
  // styles and pdf.js worker, so it belongs in its own tested change. These are
  // the headers that are safe to apply unconditionally.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
  // Proxy is now handled by app/api/proxy/[...path]/route.ts
  // which explicitly forwards cookies and auth headers.
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333'}/:path*`,
      },
      {
        source: '/api/graphql',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333'}/api/graphql`,
      }
    ];
  }
}

// GlitchTip is self-hosted and needs no source-map upload, so it is disabled
// (also avoids requiring @sentry/cli / an auth token at build time).
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
  disableLogger: true,
})
