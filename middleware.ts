import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ──────────────────────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE — SINGLE SOURCE OF TRUTH FOR ROUTE PROTECTION
//
// Rules:
// 1. Static assets, _next, and /api/auth/* are always passed through (no auth).
// 2. Public routes (/, /catalog, /onboarding, /register, etc.) are open.
// 3. Guest-only routes (/login, /register, /sign-in, /sign-up) redirect
//    authenticated users to their role-specific dashboard.
// 4. Protected routes (/dashboard/*, /reader, /player, /settings) require
//    a valid session; unauthenticated users go to /login.
// 5. NEVER redirect when pathname already matches the target (loop guard).
// ──────────────────────────────────────────────────────────────────────────────

// Routes that are open to everyone (no redirect either way)
const publicRoutes = [
  '/',
  '/catalog',
  '/onboarding',
  '/logout',
  '/api/user/complete-onboarding',
  '/api/auth',
  // Server-to-server webhook from the Vidyaverse hub. It carries no user session —
  // it authenticates with an HMAC signature the route verifies itself.
  '/api/internal/entitlements/invalidate',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  // Policy pages are linked from the public landing footer and must be
  // readable without an account — a privacy policy behind a login defeats its
  // purpose. Plan comparison is a pre-signup marketing page for the same
  // reason.
  '/privacy',
  '/terms',
  '/cookies',
  '/subscription/compare',
  // Public account-deletion request form (the URL listed on the Play Store); people who
  // can't sign in any more still need to reach it.
  '/delete-account',
  // PWA: install metadata, app icons and the offline fallback must load without a session.
  '/manifest.webmanifest',
  '/pwa-icon',
  '/offline',
  // Unauthenticated so error tracking can be verified end-to-end (it throws).
  '/api/debug-sentry',
  // Living style guide: open in development only so it can be reviewed without a login.
  ...(process.env.NODE_ENV !== 'production' ? ['/design-system'] : []),
];

// Routes that only unauthenticated users should see
const guestOnlyRoutes = [
  '/login',
  '/register',
  '/sign-in',
  '/sign-up',
];

// Routes that require specific roles
const roleBasedRoutes: Record<string, string[]> = {
  '/dashboard/super-admin': ['super-admin'],
  '/dashboard/admin': ['super-admin', 'admin'],
  '/dashboard/librarian': ['super-admin', 'admin', 'librarian'],
  '/dashboard/teacher': ['super-admin', 'admin', 'librarian', 'teacher'],
  '/dashboard/student': ['super-admin', 'admin', 'librarian', 'teacher', 'student'],
  '/api/admin': ['super-admin', 'admin'],
};

// Routes that require active subscription (for independent students)
const subscriptionRequiredRoutes = [
  '/reader',
  '/player',
];

/** Derive the canonical dashboard path for a given role string. */
function getDashboardForRole(role: string): string {
  switch (role) {
    case 'super-admin': return '/dashboard/super-admin';
    case 'admin':       return '/dashboard/admin';
    case 'librarian':   return '/dashboard/librarian';
    case 'teacher':     return '/dashboard/teacher';
    case 'student':
    default:            return '/dashboard/student';
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. HARD EXCLUSIONS — never touch these ─────────────────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth') ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // ── 2. PUBLIC ROUTES — open to all, no session check ───────────────────
  const isPublicRoute = publicRoutes.some(route =>
    route === '/' ? pathname === '/' : pathname.startsWith(route)
  );
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // ── 3. FETCH SESSION ───────────────────────────────────────────────────
  // We fetch from the better-auth handler, forwarding the original cookies.
  // IMPORTANT: Always use localhost for this internal server-to-server call.
  // When behind a reverse proxy (e.g. Cloudflare Tunnel), request.url becomes
  // the external domain, which the server cannot reach from itself.
  let sessionData: any = null;
  try {
    const internalOrigin = `http://localhost:${process.env.PORT || 3001}`;
    const sessionUrl = `${internalOrigin}/api/auth/get-session`;
    const res = await fetch(sessionUrl, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    if (res.ok) {
      sessionData = await res.json();
    }
  } catch (error) {
    console.error('[Middleware] Session fetch failed:', error);
  }

  const user = sessionData?.user;

  // Normalize role
  const rawRole = (user as any)?.role || 'STUDENT';
  const userRole = typeof rawRole === 'string'
    ? rawRole.toLowerCase().replace('_', '-')
    : 'student';

  // ── 4. GUEST-ONLY ROUTES — redirect authenticated users to dashboard ──
  const isGuestOnlyRoute = guestOnlyRoutes.some(route => pathname.startsWith(route));
  if (isGuestOnlyRoute) {
    if (user) {
      const target = getDashboardForRole(userRole);
      // Loop guard: don't redirect if we're already on the target
      if (pathname !== target) {
        return NextResponse.redirect(new URL(target, request.url));
      }
    }
    // Not authenticated → let them see the login/register page
    return NextResponse.next();
  }

  // ── 5. PROTECTED ROUTES — redirect unauthenticated users to /login ────
  if (!user) {
    // If it's an API route, return 401 instead of redirecting
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 6. ROLE-BASED ACCESS ──────────────────────────────────────────────
  for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(userRole)) {
        const target = getDashboardForRole(userRole);
        if (pathname !== target) {
          return NextResponse.redirect(new URL(target, request.url));
        }
      }
      break; // found matching route, stop checking
    }
  }

  // ── 6.5. ONBOARDING GUARD ─────────────────────────────────────────────
  // Enforce onboarding for all users EXCEPT super-admin.
  const isSuperAdmin = userRole === 'super-admin';
  const onboardingCompleted = (user as any).onboardingCompleted === true;

  if (!isSuperAdmin && !onboardingCompleted) {
    const onboardingAllowedPaths = [
      '/onboarding',
      '/api/auth',
      '/api/user/verify',
      '/api/user/complete-onboarding',
      '/api/institutions/browse',
      '/api/join-requests',
      '/api/user/profile' // Need to fetch profile data for onboarding Step 1
    ];

    const isAllowed = onboardingAllowedPaths.some(p => pathname.startsWith(p));
    
    if (!isAllowed) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Onboarding required' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  // ── 7. SUBSCRIPTION CHECK (independent students) ──────────────────────
  const accountType = (user as any).accountType || 'institutional';
  if (accountType === 'independent') {
    const requiresSubscription = subscriptionRequiredRoutes.some(route =>
      pathname.startsWith(route)
    );
    if (requiresSubscription) {
      const subStatus = (user as any).subscriptionStatus;
      if (subStatus !== 'active' && subStatus !== 'trial') {
        const paymentsUrl = new URL('/payments', request.url);
        paymentsUrl.searchParams.set('reason', 'subscription_required');
        return NextResponse.redirect(paymentsUrl);
      }
    }
  }

  // ── 8. PASS THROUGH — inject user context into headers ────────────────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id);
  requestHeaders.set('x-user-email', user.email);
  requestHeaders.set('x-user-role', userRole);
  requestHeaders.set('x-user-account-type', accountType);

  const tenantMemberships = (user as any).tenantMemberships || [];
  if (tenantMemberships.length > 0) {
    const defaultTenant = tenantMemberships[0];
    requestHeaders.set('x-tenant-id', defaultTenant.tenantId);
    requestHeaders.set('x-tenant-role', defaultTenant.role);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
