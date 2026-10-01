import { NextResponse } from "next/server";

// Deprecated: borrowing is handled by the backend API.
// Use POST /api/v1/books/:id/borrow (proxied to the NestJS backend) instead.
// The previous mock implementation was removed during mobile-readiness cleanup.

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use POST /api/v1/books/:id/borrow instead." },
    { status: 410 }
  );
}
