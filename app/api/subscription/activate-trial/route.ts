import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/subscription/activate-trial
 *
 * Self-serve one-time free trial for independent (B2C) students. Grants
 * `subscriptionTier = 'trial'` for TRIAL_DAYS days, which is what the RAG
 * AiFeatureGuard on the NestJS side admits (alongside paid tiers) — with a
 * per-feature daily cap enforced there, not here.
 *
 * Runs in the Next layer, not the Nest backend, on purpose: it writes the same
 * `User` row better-auth reads for the session, so the trial is visible on the
 * very next `getSession` with no cross-service session plumbing. It uses the
 * better-auth session for identity, so it cannot be driven for another user.
 */
const TRIAL_DAYS = parseInt(process.env.TRIAL_DURATION_DAYS ?? '7', 10);

// Paid, non-trial tiers that mean "already has access, no trial needed". Compared
// case-insensitively — the column has held both 'TRIAL' (old Google signup) and
// lowercase values, so nothing here assumes a canonical case.
const PAID_TIERS = new Set(['basic', 'premium', 'enterprise', 'gold', 'diamond', 'silver', 'bronze']);

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      accountType: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Normalise once — Prisma may return either the enum name ('STUDENT') or the
  // mapped DB value ('student') depending on how the row was written, and the
  // session projection is lowercase. Lowercasing collapses all of those.
  const role = String(user.role ?? '').toLowerCase();
  const accountType = String(user.accountType ?? '').toLowerCase();
  const tier = String(user.subscriptionTier ?? '').toLowerCase();

  // B2C students only. Institutional users get AI access through their
  // institution, not a personal trial; other roles are staff.
  if (role !== 'student') {
    return NextResponse.json(
      { error: 'Free trials are for student accounts only.' },
      { status: 403 },
    );
  }
  if (accountType !== 'independent') {
    return NextResponse.json(
      {
        error:
          'Your account is managed by an institution — AI access comes through your ' +
          'institution rather than a personal trial.',
        reason: 'INSTITUTIONAL',
      },
      { status: 403 },
    );
  }

  // Already on a paid plan — nothing to activate.
  if (PAID_TIERS.has(tier)) {
    return NextResponse.json(
      { error: 'You already have a paid subscription.', reason: 'ALREADY_SUBSCRIBED' },
      { status: 409 },
    );
  }

  const now = new Date();
  const trialActive =
    tier === 'trial' && !!user.trialEndsAt && user.trialEndsAt.getTime() > now.getTime();

  // Idempotent while the trial is live: re-clicking just returns the live state
  // instead of resetting the clock (which would let a user extend indefinitely).
  if (trialActive) {
    return NextResponse.json({
      status: 'ALREADY_ACTIVE',
      trialEndsAt: user.trialEndsAt,
      subscriptionTier: 'trial',
    });
  }

  // Anti-refarm: a non-null trialEndsAt that is NOT currently active means the
  // trial was already used and has lapsed. One trial per account — direct them
  // to upgrade rather than silently minting a second one.
  if (user.trialEndsAt) {
    return NextResponse.json(
      {
        error: 'Your free trial has already been used. Upgrade to keep AI access.',
        reason: 'TRIAL_ALREADY_USED',
        trialEndsAt: user.trialEndsAt,
      },
      { status: 409 },
    );
  }

  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: 'trial',
      subscriptionStatus: 'TRIAL',
      trialEndsAt,
    },
  });

  return NextResponse.json({
    status: 'ACTIVATED',
    subscriptionTier: 'trial',
    subscriptionStatus: 'TRIAL',
    trialEndsAt,
    trialDays: TRIAL_DAYS,
  });
}
