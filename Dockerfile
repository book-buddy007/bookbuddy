# Production image for the Book Buddy Next.js frontend (Coolify / VPS).
#
# slim (Debian/glibc), NOT alpine: the frontend uses Prisma directly
# (lib/prisma.ts, better-auth), and Prisma's query engine needs glibc + openssl.
#
# The frontend talks to the SAME Postgres database as the backend, so DATABASE_URL
# is injected by Coolify at runtime. NEXT_PUBLIC_* vars, by contrast, are inlined
# into the client bundle at BUILD time, so they are passed as build args below
# (in Coolify: add them as env vars and tick "Build Variable / Build Time").

# ---- Builder ----------------------------------------------------------------
FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# Install deps first (better layer caching). The Prisma schema is copied before
# install so the `postinstall` (prisma generate) step can find it and generate
# a Linux client, overriding any Windows-compiled client from the host.
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile --ignore-scripts && npx prisma generate

# NEXT_PUBLIC_* must exist at build time to be baked into the client bundle.
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CDN_BASE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_DRM_KEY
ARG NEXT_PUBLIC_FEDERATION_ENABLED
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_CDN_BASE_URL=$NEXT_PUBLIC_CDN_BASE_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_DRM_KEY=$NEXT_PUBLIC_DRM_KEY \
    NEXT_PUBLIC_FEDERATION_ENABLED=$NEXT_PUBLIC_FEDERATION_ENABLED \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

# Build the Next.js app (source excluded from the deps layers above).
COPY . .
RUN pnpm run build

# `.next/cache` is webpack's build-time cache and is dead weight at runtime.
# It is dropped HERE, in the builder, rather than in the runner: image layers are
# additive, so deleting it after the COPY would leave it in the layer below and
# save nothing.
RUN rm -rf /app/.next/cache

# ---- Runner -----------------------------------------------------------------
FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# Carry over the built app plus node_modules (which includes the generated
# Prisma client). Copying the full node_modules keeps the Prisma query engine
# reliable, mirroring the backend image rather than using `output: standalone`.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# `next start` binds 0.0.0.0:3000 by default.
CMD ["pnpm", "run", "start"]
