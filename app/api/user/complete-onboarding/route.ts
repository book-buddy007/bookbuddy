import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSessionToken } from '@/lib/auth-cookies';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
// BB-012: a `JWT_SECRET` constant with a committed fallback literal used to sit
// here. It was DEAD CODE — this route forwards the caller's bearer token to the
// backend, which validates it, and the constant was never read. Removed rather
// than kept, because an unused secret is a trap for the next person to add a
// jwtVerify() call to this file.

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = readSessionToken(cookieStore);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Call backend to update onboarding status/step
    const response = await fetch(`${BACKEND_URL}/user/complete-onboarding`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to complete onboarding' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      data,
    });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

