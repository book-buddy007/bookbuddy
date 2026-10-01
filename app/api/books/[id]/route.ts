import { NextResponse } from "next/server";

// This route is deprecated. All book operations go through the backend API at /api/v1/books.
// Keeping a minimal handler that returns 404 to avoid broken references.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/v1/books/:id instead." },
    { status: 410 }
  );
}
