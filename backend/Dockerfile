# Production image for the Book Buddy NestJS backend (Coolify / VPS).
#
# slim (Debian/glibc), NOT alpine: bcrypt and Prisma need glibc.
# openssl is required by Prisma's query engine on Debian.
#
# Env vars (DATABASE_URL, REDIS_URL, secrets, …) are injected by Coolify at
# runtime — this image never bakes a .env file, and the start command calls
# `node dist/main` directly rather than the dotenv-wrapped `start:prod`.

# ---- Builder ----------------------------------------------------------------
FROM node:20-slim AS builder

# openssl: Prisma query engine. python3/make/g++: toolchain so native modules
# (bcrypt) can compile if a prebuilt binary isn't available. Builder-only —
# the runner stays slim and just copies the compiled node_modules.
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install deps first (better layer caching).
#
# NOTE: install scripts MUST run here (no --ignore-scripts). bcrypt is a native
# module whose .node binary is fetched/built by its install script; skipping it
# leaves `bcrypt_lib.node` missing and the app crashes at boot. The postinstall
# `prisma generate` also runs here (schema copied above).
#
# --include=dev is REQUIRED: Coolify injects NODE_ENV=production as a build arg,
# which makes `npm ci` omit devDependencies. But prisma (CLI), @nestjs/cli and
# typescript all live in devDependencies and are needed to build. Without this,
# `npx prisma` finds no local CLI and downloads Prisma v7, which rejects the v6
# `url = env(...)` schema. Forcing dev deps keeps the pinned v6 CLI local.
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --legacy-peer-deps --include=dev
RUN npx prisma generate

# Build the Nest app (source excluded from the deps layers above).
COPY . .
RUN npm run build

# ---- Runner -----------------------------------------------------------------
FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

# Carry over the built app plus node_modules (includes the generated Prisma
# client and the Prisma CLI, so `migrate deploy` can run at startup).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3333

# Apply any pending migrations (idempotent), then boot the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
