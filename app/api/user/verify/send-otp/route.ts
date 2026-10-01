import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSessionToken } from '@/lib/auth-cookies';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = readSessionToken(cookieStore)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No session token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type } = body

    if (!type || !['email', 'phone'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid verification type. Must be "email" or "phone"' },
        { status: 400 }
      )
    }

    // Backend DTO expects UPPERCASE enum values: 'EMAIL' | 'PHONE'
    const backendType = type.toUpperCase()

    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/user/verify/send-otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: backendType }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to send OTP' }))
      return NextResponse.json(
        { error: error.message || 'Failed to send verification code' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error sending OTP:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
