import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, invitationToken, subscriptionTier } = body;

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Call backend register endpoint
    const response = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password, 
        name,
        role: role || 'student',
        invitationToken,
        subscriptionTier: subscriptionTier || 'trial',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();

      // Extract the actual error message from the structured error response
      // Backend returns: { success: false, error: { code, message, details } } for custom exceptions
      // or { message: "..." } for standard NestJS exceptions
      const errorMessage = errorData.error?.message || errorData.message || 'Registration failed';

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
      },
      message: 'Registration successful. Please login to continue.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

