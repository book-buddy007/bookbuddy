import { NextRequest,NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSessionToken } from '@/lib/auth-cookies';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333'

export async function GET(_request: NextRequest) {
  try {
    // Get access token from cookies
    const cookieStore = await cookies()
    const accessToken = readSessionToken(cookieStore)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No session token' },
        { status: 401 }
      )
    }

    // Fetch profile from backend API
    const response = await fetch(`${BACKEND_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.message || 'Failed to fetch profile' },
        { status: response.status }
      )
    }

    const profileData = await response.json()
    return NextResponse.json(profileData)

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get access token from cookies
    const cookieStore = await cookies()
    const accessToken = readSessionToken(cookieStore)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No session token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, email, phone, preferences } = body

    // Update profile via backend API
    const response = await fetch(`${BACKEND_URL}/user/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, phone, preferences }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.message || 'Failed to update profile' },
        { status: response.status }
      )
    }

    const updatedProfile = await response.json()
    return NextResponse.json(updatedProfile)

  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
