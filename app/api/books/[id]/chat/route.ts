import { NextRequest } from "next/server";
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const token = readSessionToken(request.cookies) || '';
    
    // Pass along query parameters like "q="
    const searchParams = request.nextUrl.search;
    
    // Call the backend NestJS service for the chat stream
    const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
    const backendUrl = `${BACKEND_URL}/api/books/${resolvedParams.id}/chat${searchParams}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      // Important to let the fetch pass chunks through stream
      cache: 'no-store'
    });

    if (!response.ok) {
        let errStr = 'Backend stream error';
        try { errStr = await response.text(); } catch(e) {}
        return new Response(JSON.stringify({ error: errStr }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Proxy the raw EventStream response back to the client directly!
    // Next.js Response object natively supports returning a ReadableStream from fetch.body
    return new Response(response.body, {
      status: 200,
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error: any) {
    console.error('Proxy Error (chat stream):', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
