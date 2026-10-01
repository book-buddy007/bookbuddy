#!/usr/bin/env node
/**
 * Fails if the two Prisma schemas have drifted apart.
 *
 * Book Buddy carries the same schema in two places against ONE database:
 *
 *   backend/prisma/schema.prisma  the authoritative copy. The NestJS backend owns
 *                                the migration history and runs `migrate deploy`.
 *   prisma/schema.prisma         a required duplicate. The Next.js app uses Prisma
 *                                directly (lib/prisma.ts, lib/auth.ts,
 *                                lib/federation/jit.ts, lib/entitlements/client.ts)
 *                                and its Docker build EXCLUDES backend/ via
 *                                .dockerignore — so it cannot generate a client
 *                                from the backend copy and needs its own file.
 *
 * They must stay byte-identical. When they drifted before, the frontend shipped a
 * Prisma client describing tables that did not exist and missing three that did,
 * and the recorded gap between them was mistaken for a pending migration
 * (see prisma/rejected/README.md).
 *
 * This is deliberately NOT wired into `build`: backend/ is absent inside the
 * frontend image, so running it there would fail the deploy. Run it before pushing
 * schema changes.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const AUTHORITATIVE = path.join(repoRoot, 'backend', 'prisma', 'schema.prisma');
const DUPLICATE = path.join(repoRoot, 'prisma', 'schema.prisma');

function rel(p) {
  return path.relative(repoRoot, p).replace(/\\/g, '/');
}

for (const file of [AUTHORITATIVE, DUPLICATE]) {
  if (!fs.existsSync(file)) {
    console.error(`✗ missing schema: ${rel(file)}`);
    process.exit(1);
  }
}

const authoritative = fs.readFileSync(AUTHORITATIVE);
const duplicate = fs.readFileSync(DUPLICATE);

if (authoritative.equals(duplicate)) {
  console.log(`✓ ${rel(DUPLICATE)} matches ${rel(AUTHORITATIVE)}`);
  process.exit(0);
}

// Report the first differing line to make the fix obvious.
const a = authoritative.toString('utf8').split(/\r?\n/);
const b = duplicate.toString('utf8').split(/\r?\n/);
let firstDiff = -1;
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  if (a[i] !== b[i]) {
    firstDiff = i;
    break;
  }
}

console.error(`✗ the two Prisma schemas have drifted apart.

  authoritative : ${rel(AUTHORITATIVE)} (${a.length} lines)
  duplicate     : ${rel(DUPLICATE)} (${b.length} lines)
`);

if (firstDiff !== -1) {
  console.error(`  first difference at line ${firstDiff + 1}:
    backend: ${JSON.stringify(a[firstDiff] ?? '<end of file>')}
    root   : ${JSON.stringify(b[firstDiff] ?? '<end of file>')}
`);
}

console.error(`  The backend copy is authoritative. Make changes there, then run:

    node scripts/check-schema-sync.js --fix
`);

if (process.argv.includes('--fix')) {
  fs.copyFileSync(AUTHORITATIVE, DUPLICATE);
  console.error(`  → copied ${rel(AUTHORITATIVE)} over ${rel(DUPLICATE)}`);
  process.exit(0);
}

process.exit(1);
