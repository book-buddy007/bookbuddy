import { NextResponse } from 'next/server';

// Deliberately throws so error tracking can be verified end-to-end. The thrown
// error is reported via the instrumentation onRequestError hook. Safe to remove
// once GlitchTip wiring is confirmed.
export const dynamic = 'force-dynamic';

export function GET() {
  throw new Error('GlitchTip test error — book-buddy-frontend (safe to ignore)');
   
  return NextResponse.json({ ok: true });
}
