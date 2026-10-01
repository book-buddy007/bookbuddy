import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import { resolveTrustProxySetting } from './common/client-ip';

// Prisma returns BigInt for the schema's two BigInt columns (AudioSection/
// AudioTrack.fileSizeBytes), and Node's JSON.stringify throws on BigInt with
// no built-in escape hatch. Patching toJSON here is the standard fix and
// covers every response app-wide, not just the audiobook-structure route
// that first surfaced it.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (
  this: bigint,
) {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // §9 visual grounding embeds an image directly in the request body (no
  // server-side page-image asset exists — the reader renders PDFs client-side
  // via pdf.js/react-pdf-viewer, so there's nothing for the backend to
  // resolve a pageImageRef against). Express's default JSON body limit
  // (100kb) would reject any real page image; scoped to this one path
  // rather than raised globally, to avoid widening the DoS surface on every
  // other endpoint.
  app.use('/books', json({ limit: '10mb' }));

  // Trust the reverse proxy — audit finding BB-004.
  //
  // Without this, Express does not read X-Forwarded-For, so `req.ip` is Traefik's
  // address on every request and @nestjs/throttler put ALL callers in ONE bucket.
  // The OTP and password-reset limits of "3 per 10 minutes" were consequently
  // 3 per 10 minutes platform-wide — three unauthenticated requests denied account
  // recovery to every user.
  //
  // Trust is pinned to the ADDRESS of the hop, not to a hop count: `trust proxy: true`
  // would trust the whole forwarded chain and let any caller spoof X-Forwarded-For
  // into a private unlimited bucket, which is a worse bug than the one being fixed.
  // See src/common/client-ip.ts for both deployment modes and the reasoning.
  app.getHttpAdapter().getInstance().set('trust proxy', resolveTrustProxySetting());

  // Harden HTTP responses (dependency-free; the key helmet defaults for a JSON
  // API). Kept here rather than adding the helmet package to avoid touching the
  // lockfile/build. The frontend sets its own headers via next.config.
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // CORS configuration — env-driven for production, permissive localhost in dev.
  // CORS_ORIGINS is a comma-separated list, e.g.
  //   CORS_ORIGINS=https://app.example.com,https://admin.example.com
  // Native mobile apps (iOS/Android) don't send an Origin header, so CORS
  // never blocks them — this list only governs browsers.
  const corsOrigins = (configService.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const devOrigins = [
    configService.get('APP_ORIGIN', 'http://localhost:3000'),
    configService.get('FRONTEND_URL', 'http://localhost:3000'),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:8082',
    'http://127.0.0.1:8082',
    'http://localhost:19006',
    'http://127.0.0.1:19006',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like native mobile apps or curl)
      if (!origin) return callback(null, true);
      if (corsOrigins.length > 0) {
        return callback(null, corsOrigins.includes(origin));
      }
      // Allow explicit dev origins or any local dev port in development mode
      if (
        devOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-Id',
      'X-Requested-With',
    ],
  });

  // NOTE: No global URL prefix. The Next.js proxy layer and all existing
  // clients address controllers at their declared paths (/auth, /books,
  // /api/super-admin, ...). A previous setGlobalPrefix('api/v1') call broke
  // every proxy route and was removed during mobile-readiness cleanup.

  // OpenAPI / Swagger — the API contract shared by web, iOS and Android.
  // Serve docs everywhere except when explicitly disabled.
  if (configService.get('SWAGGER_ENABLED', 'true') !== 'false') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Book Buddy by VPD API')
      .setDescription(
        'Shared REST API for the Book Buddy by VPD web app and native iOS/Android apps. ' +
          'Authenticate with a Better Auth session token via the Authorization: Bearer header.',
      )
      .setVersion('0.2.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          description: 'Better Auth session token',
        },
        'session-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = configService.get<number>('PORT', 3333);
  await app.listen(port);
  console.log(`🚀 Book Buddy Backend running on http://localhost:${port}`);
  console.log(`📖 API docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
