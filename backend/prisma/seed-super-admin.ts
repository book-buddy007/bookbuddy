/**
 * Creates the single platform super admin for a fresh Book Buddy database.
 *
 * Required environment:
 *   SEED_SUPERADMIN_EMAIL      login email
 *   SEED_SUPERADMIN_PASSWORD   at least 12 characters (no default — never committed)
 * Optional:
 *   SEED_SUPERADMIN_NAME       display name (default "Super Admin")
 *
 * Writes BOTH password stores the app uses:
 *   - User.password                         (NestJS JWT login)
 *   - Account{providerId:'credential'}      (better-auth login form)
 *
 * Create-only: if the email already exists nothing is modified.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const BCRYPT_COST = 12;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Refusing to seed: ${name} is not set.`);
  }
  return value;
}

export async function seedSuperAdmin(prisma: PrismaClient): Promise<void> {
  const email = required('SEED_SUPERADMIN_EMAIL').toLowerCase();
  const password = required('SEED_SUPERADMIN_PASSWORD');
  const name = process.env.SEED_SUPERADMIN_NAME?.trim() || 'Super Admin';

  if (password.length < 12) {
    throw new Error('Refusing to seed: SEED_SUPERADMIN_PASSWORD must be at least 12 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing) {
    console.warn(`[super-admin] ${email} already exists (role=${existing.role}) — not modified`);
    return;
  }

  const hashed = await bcrypt.hash(password, BCRYPT_COST);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashed,
      role: 'SUPER_ADMIN' as any,
      accountType: 'INSTITUTIONAL' as any,
      onboardingCompleted: true,
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      id: `acct_${user.id}_credential`,
      userId: user.id,
      accountId: email,
      providerId: 'credential',
      password: hashed,
    },
  });

  console.log(`[super-admin] created ${email}`);
}
