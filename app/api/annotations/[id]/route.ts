import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSessionToken } from '@/lib/auth-cookies';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const accessToken = readSessionToken(cookieStore);

        if (!accessToken) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const resolvedParams = await params;
        const { id } = resolvedParams;

        const response = await fetch(`${BACKEND_URL}/annotations/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete annotation: ${response.status} ${errorText}`);
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting annotation proxy:', error);
        return NextResponse.json(
            { error: 'Failed to delete annotation' },
            { status: 500 }
        );
    }
}
