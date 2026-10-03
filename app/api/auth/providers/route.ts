import { NextResponse } from 'next/server';
import { EMAIL_SIGNUP_ENABLED, GOOGLE_SIGNUP_ENABLED } from '@/lib/auth';

// Which sign-in / sign-up methods this deployment has switched on. Read from the runtime environment
// (not NEXT_PUBLIC_* build args) so adding or removing Google credentials on the server takes effect
// on the next restart without rebuilding the image. Exposes booleans only, never credentials.
export const dynamic = 'force-dynamic';

export function GET() {
  const google = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return NextResponse.json(
    {
      /** Google sign-in works (credentials are configured). */
      google,
      /** Google may also create new accounts, not just sign existing ones in. */
      googleSignup: google && GOOGLE_SIGNUP_ENABLED,
      /** Email + password sign-up works on the web. Currently always off. */
      emailSignup: EMAIL_SIGNUP_ENABLED,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
