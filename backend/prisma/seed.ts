/**
 * Book Buddy by VPD — database seed.
 *
 * Creates the minimum a fresh database needs:
 *   1. reference data  (seed-reference.ts)  — the __SYSTEM__ global-catalog tenant + genre list
 *   2. one super admin (seed-super-admin.ts) — from SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_PASSWORD
 *
 * Both halves are create-only: rows that already exist are left untouched.
 *
 * Guards: refuses to run when NODE_ENV=production, and unless ALLOW_SEED=1.
 *
 * Usage (from backend/):
 *   ALLOW_SEED=1 SEED_SUPERADMIN_EMAIL=you@example.com SEED_SUPERADMIN_PASSWORD=... npx prisma db seed
 *   ALLOW_SEED=1 SEED_REFERENCE_ONLY=1 npx prisma db seed      # reference data only
 */
import { PrismaClient } from '@prisma/client';
import { seedReference } from './seed-reference';
import { seedSuperAdmin } from './seed-super-admin';

function assertSafeToSeed(): void {
  const problems: string[] = [];
  if (process.env.NODE_ENV === 'production') {
    problems.push('NODE_ENV is "production" — this seed never runs against production.');
  }
  if (process.env.ALLOW_SEED !== '1') {
    problems.push('ALLOW_SEED is not "1" — seeding is opt-in so it cannot run by accident.');
  }
  if (problems.length > 0) {
    console.error('\nREFUSING TO SEED');
    for (const p of problems) console.error(`  - ${p}`);
    console.error('');
    process.exit(1);
  }
}

async function main() {
  assertSafeToSeed();

  const prisma = new PrismaClient();
  const referenceOnly = process.env.SEED_REFERENCE_ONLY === '1';

  try {
    console.log(`Seeding (NODE_ENV=${process.env.NODE_ENV ?? 'undefined'}, referenceOnly=${referenceOnly})`);
    await seedReference(prisma);
    if (!referenceOnly) {
      await seedSuperAdmin(prisma);
    }
    console.log('Seeding finished successfully.');
  } catch (error) {
    console.error('Error during seeding:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Unhandled seeding error:', e instanceof Error ? e.message : e);
  process.exit(1);
});
