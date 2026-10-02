import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../_lib/proxy';

/** GET /api/join-requests/:id/proof-url — short-lived link to the request's proof document. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/join-requests/${encodeURIComponent(id)}/proof-url`);
}
