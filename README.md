# Book Buddy by VPD

**Multi-tenant digital library and reading platform for students and institutions.**

Book Buddy lets institutions publish a catalogue of books (PDF, EPUB, audiobook) and
lets students read, annotate, listen and study with AI help — on the web and on
iOS/Android.

## Features

- **Roles:** Super Admin, Admin, Librarian, Teacher, Student — for independent (B2C)
  and institutional (B2B) accounts.
- **Reader:** PDF and EPUB reading with highlights, notes, ink, bookmarks, dictionary,
  text-to-speech and reading progress sync.
- **Audiobooks** with chapter structure and progress.
- **AI study tools** (optional): talk-to-book chat, quizzes, chapter digests,
  simplified text, knowledge graph.
- **Multi-tenant:** institutions, join requests, per-tenant branding.
- **Secure media:** presigned object-storage URLs and DRM-protected read links.

## Stack

| Part | Tech |
|---|---|
| Web | Next.js 15 (App Router), React 19, Tailwind, Radix UI, Zustand, React Query, better-auth |
| API | NestJS 11, Prisma 6, BullMQ |
| Mobile | Expo / React Native (`mobile/`) |
| Data | PostgreSQL 16, Redis, Qdrant (vectors), Cloudflare R2 for files in production (MinIO locally, see docs/storage-r2.md) |

## Quick start (Windows)

Requirements: Node 20+, pnpm, Docker Desktop.

```powershell
pnpm install
cd backend; npm install --legacy-peer-deps; cd ..

# First run only — creates .env files with fresh secrets, starts Postgres/Redis/
# Qdrant/MinIO in Docker, creates the schema and your super-admin account.
powershell -ExecutionPolicy Bypass -File scripts\clean-slate.ps1

pnpm dev            # backend on :3333, web on :3000
```

Sign in at http://localhost:3000/login with the super-admin email you entered.

Day to day: `docker compose up -d` then `pnpm dev`.

## Useful commands

| Command | What it does |
|---|---|
| `pnpm db:migrate` | Create/apply a migration after editing `backend/prisma/schema.prisma` |
| `pnpm db:studio` | Browse the database |
| `pnpm db:check-schema-sync` | Verify the two Prisma schema copies are identical |
| `npx tsc --noEmit` | Type-check (the build does not) — also inside `backend/` |

## Configuration

- `.env.local` — web app (template: `.env.example`)
- `backend/.env` — API (template: `backend/.env.example`)
- `.env` — Docker service passwords
- `mobile/.env*` — API URL for the mobile app

Optional services (AI provider, email, Google sign-in, WhatsApp OTP, Sentry) are off
until you add their keys.

## License

This project is licensed under the MIT License.
