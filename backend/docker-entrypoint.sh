#!/bin/sh
# Book Buddy by VPD - API container start-up (production image).
set -e

# 1. Database schema - applies any pending migrations, does nothing otherwise.
npx prisma migrate deploy

# 2. Media bucket - create it if missing and make objects publicly readable.
#    Uses the in-network MinIO address when S3_INTERNAL_ENDPOINT is set, so it
#    works before the public media domain has a certificate.
S3_ENDPOINT="${S3_INTERNAL_ENDPOINT:-$S3_ENDPOINT}" node scripts/init-storage.js \
  || echo "[entrypoint] storage init failed - continuing; uploads need the bucket"

# 3. Optional seed: reference data + one super admin. Create-only, so running it
#    on every start never overwrites anything. Off unless SEED_ON_BOOT=1.
if [ "${SEED_ON_BOOT:-0}" = "1" ]; then
  ALLOW_SEED=1 NODE_ENV=development \
    node node_modules/ts-node/dist/bin.js --transpile-only prisma/seed.ts \
    || echo "[entrypoint] seed failed - continuing"
fi

exec node dist/main
