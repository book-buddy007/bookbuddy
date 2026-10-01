import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { readSessionToken } from '@/lib/auth-cookies';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

// Mock function - in a real implementation, this would use AWS SDK or similar
const generatePresignedUrl = async (fileType: string, filename: string) => {
  // Simulated presigned URL generation
  const key = `uploads/${uuidv4()}-${filename}`;
  const uploadId = uuidv4();

  // In a real implementation, this would connect to AWS S3 or other storage
  return {
    presignedUrl: `https://example.com/upload?key=${key}`,
    uploadId,
    key
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
        { error: 'Forbidden - Only super-admin users can upload media files' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { fileType, filename, contentType } = body;

    if (!fileType || !filename || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate presigned URL for upload
    const { presignedUrl, uploadId, key } = await generatePresignedUrl(fileType, filename);

    return NextResponse.json({
      presignedUrl,
      uploadId,
      key
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
} 
