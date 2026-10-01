import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { readSessionToken } from '@/lib/auth-cookies';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

// Mock function - in a real implementation, this would call the backend
const processMedia = async (uploadId: string, s3Key: string) => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return a mock media file ID
  const mediaFileId = uuidv4();

  return {
    success: true,
    mediaFileId
  };
};

export async function POST(req: NextRequest) {
  try {
    // Get access token from cookies
    const cookieStore = await cookies();
    const accessToken = readSessionToken(cookieStore);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No access token' },
        { status: 401 }
      );
    }

    // Verify user role by fetching profile from backend
    const profileResponse = await fetch(`${BACKEND_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const profile = await profileResponse.json();

    // Verify user is a super-admin
    if (profile.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only super-admin users can process media files' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { uploadId, s3Key } = body;

    if (!uploadId || !s3Key) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Process the uploaded media
    const result = await processMedia(uploadId, s3Key);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing media:', error);
    return NextResponse.json(
      { error: 'Failed to process media' },
      { status: 500 }
    );
  }
} 
