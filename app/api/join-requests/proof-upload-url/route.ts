import { NextRequest } from 'next/server';
import { proxyToBackend } from '../_lib/proxy';

/**
 * POST /api/join-requests/proof-upload-url — presigned upload for a proof
 * document (PDF/JPG/PNG, max 5 MB). Body: { filename, contentType, size }.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return proxyToBackend('/join-requests/proof-upload-url', {
    method: 'POST',
    body: { filename: body?.filename, contentType: body?.contentType, size: body?.size },
  });
}
