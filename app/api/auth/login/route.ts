import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchWithRetry } from '@/lib/utils/fetch-with-retry';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

export async function POST(request: NextRequest) {
  try {
    console.log('=== LOGIN API ROUTE CALLED ===');
    const body = await request.json();
    const { email, password } = body;
    console.log('Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      console.log('Validation failed: missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('Attempting to connect to backend at:', BACKEND_URL);
    console.log('Full backend URL:', `${BACKEND_URL}/auth/login`);

    // Call backend login endpoint with retry logic for transient network/cold-start failures
    console.log('Making fetch request to backend with automatic retries...');
    const response = await fetchWithRetry(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      maxRetries: 3,
      baseDelayMs: 500,
      maxDelayMs: 2000,
    });

    console.log('Backend response received. Status:', response.status);
    console.log('Backend response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error response:', errorData);

      // Extract the actual error message from the structured error response
      // Backend returns: { success: false, error: { code, message, details } }
      const errorMessage = errorData.error?.message || errorData.message || 'Login failed';

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    const { accessToken, refreshToken, user } = data;

    // Set httpOnly cookies for tokens
    const cookieStore = await cookies();

    // Access token cookie (15 minutes)
    cookieStore.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    // Refresh token cookie (7 days)
    cookieStore.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    // Return user data (without tokens)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountType: user.accountType,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        tenantMemberships: user.tenantMemberships,
      },
    });
  } catch (error: any) {
    console.error('Login error details:', error);
    console.error('Error message:', error?.message || 'Unknown error');

    // Mask generic fetch connection failures (like ECONNREFUSED from a backend cold start)
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      return NextResponse.json(
        { error: 'Failed to connect to authentication server. Please try again.' },
        { status: 503 } // 503 Service Unavailable
      );
    }

    return NextResponse.json(
      { error: `Internal server error: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

