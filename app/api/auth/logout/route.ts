import { NextRequest,NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { readSessionToken } from '@/lib/auth-cookies';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
// BB-012: this previously fell back to a literal committed in this repository.
// The literal was never used to SIGN, so it was not an auth bypass — but the
// inverse was worse and silent: if JWT_SECRET is unset or differs from the
// backend's, jwtVerify() throws for every genuinely-issued token, `userId` stays
// null, the guarded call to the backend /auth/logout is SKIPPED, and the refresh
// token is never revoked server-side. Cookies still clear, so logout LOOKS like it
// worked while the stolen-token window stays open. No fallback: absent config must
// be visible.
const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = readSessionToken(cookieStore);
    const refreshToken = cookieStore.get('refreshToken')?.value;

    // Get userId from access token if available
    let userId: string | null = null;
    if (accessToken && JWT_SECRET) {
      try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(accessToken, secret);
        userId = payload.sub as string;
      } catch (error) {
        // Expiry is expected and benign. A signature mismatch is a CONFIGURATION
        // FAULT that silently stops revocation, so the two must be
        // distinguishable in the logs rather than collapsed into one line.
        const expired = (error as any)?.code === 'ERR_JWT_EXPIRED';
        if (expired) {
          console.log('[logout] access token expired; skipping backend revocation');
        } else {
          console.error(
            '[logout] access token signature/verification FAILED — refresh token ' +
              'will NOT be revoked server-side. Check that JWT_SECRET matches the backend.',
          );
        }
      }
    }

    // Call backend logout endpoint if we have userId
    if (userId && refreshToken) {
      try {
        await fetch(`${BACKEND_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ userId, refreshToken }),
        });
      } catch (error) {
        console.error('Backend logout error:', error);
        // Continue with cookie deletion even if backend call fails
      }
    }

    // Clear cookies
    cookieStore.delete('accessToken');
    cookieStore.delete('refreshToken');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    // Clear cookies anyway
    const cookieStore = await cookies();
    cookieStore.delete('accessToken');
    cookieStore.delete('refreshToken');
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


