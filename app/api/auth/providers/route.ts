import { NextResponse } from 'next/server';

// Which optional sign-in methods this deployment has switched on. Read from the runtime environment
// (not NEXT_PUBLIC_* build args) so adding or removing Google credentials on the server takes effect
// on the next restart without rebuilding the image. Exposes booleans only, never credentials.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    {
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      publicSignup: process.env.PUBLIC_SIGNUP_ENABLED === 'true',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
