# Book Buddy by VPD — agent brief

Digital library and reading platform. Next.js 15 app router at the repo root, a
NestJS backend in `backend/`, and an Expo app in `mobile/`. Web and backend share
one Postgres database through Prisma.

Local services (Postgres, Redis, Qdrant, MinIO) come from `docker-compose.yml`.
Optional external integrations (institution SSO, shared content spine, notes
bridge, entitlements hub) exist in code but are switched off by leaving their env
vars empty — see the "External integrations" blocks in the two `.env.example` files.

## Rules that change what you do

- **`pnpm run build` succeeding proves nothing about types.** `next.config.mjs`
  sets `ignoreBuildErrors` and `ignoreDuringBuilds`. Run `npx tsc --noEmit`
  directly — in `backend/` too — and filter to the files you touched.
- **There are TWO Prisma schemas, on purpose, and they must stay byte-identical.**
  `backend/prisma/schema.prisma` is authoritative and owns the migrations.
  `prisma/schema.prisma` is a copy the frontend needs because its Docker build
  excludes `backend/`. Change the backend copy, then run
  `node scripts/check-schema-sync.js --fix`.
- **Migrations live only in `backend/prisma/migrations`.** Create them with
  `pnpm db:migrate` (runs `prisma migrate dev` in `backend/`).
- **Never run `next build` while `next dev` is live** — they fight over `.next`
  and the symptom is a totally unstyled page.
- **Two auth systems.** The web login form uses better-auth, whose credential lives
  in `Account` (`providerId='credential'`, bcrypt). The NestJS `User.password` is a
  separate field used by the backend/mobile JWT login. The seed writes both; any
  password change must too.
- **Seeding is opt-in and create-only.** `backend/prisma/seed.ts` refuses to run
  without `ALLOW_SEED=1` or when `NODE_ENV=production`.
- **Bulk edits on Windows: don't use PowerShell `Get-Content`/`Set-Content`** — they
  re-encode UTF-8 and mangle characters. Use an editor or .NET file APIs.
- Commits carry no Claude attribution or `Co-Authored-By` trailer.

## Fresh start

`scripts/clean-slate.ps1` rebuilds a local environment from nothing: new secrets,
new containers, empty database, schema, reference data and one super admin.
