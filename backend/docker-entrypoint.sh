#!/bin/sh
# Book Buddy by VPD - API container start-up (production image).
set -e

# 1. Database schema - applies any pending migrations, does nothing otherwise.
npx prisma migrate deploy

# 2. Media bucket. Only for a self-hosted MinIO (STORAGE_PROVIDER=minio): create the bucket
#    if missing and make objects publicly readable. Cloudflare R2 (the production setup) is
#    provisioned once in the Cloudflare dashboard (docs/storage-r2.md): R2 has no bucket
#    policies, and the app's key is deliberately limited to reading and writing objects.
if [ "${STORAGE_PROVIDER:-}" = "minio" ]; then
  S3_ENDPOINT="${S3_INTERNAL_ENDPOINT:-$S3_ENDPOINT}" node scripts/init-storage.js \
    || echo "[entrypoint] storage init failed - continuing; uploads need the bucket"
else
  echo "[entrypoint] storage: external ${STORAGE_PROVIDER:-S3-compatible} store at ${S3_ENDPOINT:-<S3_ENDPOINT not set>}, skipping bucket init"
fi

# 3. Optional seed: reference data + one super admin. Create-only, so running it
#    on every start never overwrites anything. Off unless SEED_ON_BOOT=1.
if [ "${SEED_ON_BOOT:-0}" = "1" ]; then
  ALLOW_SEED=1 NODE_ENV=development \
    node node_modules/ts-node/dist/bin.js --transpile-only prisma/seed.ts \
    || echo "[entrypoint] seed failed - continuing"
fi

exec node dist/main
