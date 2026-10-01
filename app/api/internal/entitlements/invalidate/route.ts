/**
 * Inbound capability-invalidation webhook from the Vidyaverse hub.
 *
 * The local cache has a 5-minute TTL, which already guarantees eventual correctness.
 * This exists to make the common cases feel instant — a purchase visible immediately
 * rather than after a coffee — so it is an optimisation, not a correctness mechanism.
 *
 * It is nonetheless authenticated: an unsigned endpoint would let anyone flush any
 * user's cached entitlements at will. Verification mirrors the hub's
 * `verifySignature` exactly — HMAC-SHA256 over `${timestamp}.${body}`, with the
 * timestamp inside the signed material so a captured request cannot be replayed.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { invalidateCapabilities } from "@/lib/entitlements/client";

export const dynamic = "force-dynamic";

/** Reject anything older or newer than this, to blunt replay. */
const TOLERANCE_SECONDS = 300;

function verify(body: string, timestamp: string | null, signature: string | null, secret: string): boolean {
  if (!timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.ENTITLEMENTS_WEBHOOK_SECRET;
  if (!secret) {
    // Without a secret we cannot tell a real invalidation from a forged one, so
    // refuse rather than accept unsigned input. The TTL still keeps us correct.
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  // Read the RAW body — re-serialising parsed JSON would change the bytes and
  // invalidate the signature.
  const raw = await request.text();

  const ok = verify(
    raw,
    request.headers.get("x-entitlements-timestamp"),
    request.headers.get("x-entitlements-signature"),
    secret,
  );
  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { userIds?: string[]; reason?: string };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const userIds = Array.isArray(payload.userIds) ? payload.userIds : [];
  if (userIds.length === 0) {
    return NextResponse.json({ status: "no-op", dropped: 0 });
  }

  const dropped = invalidateCapabilities(userIds);
  console.log(
    `[entitlements] invalidation received (${payload.reason ?? "unspecified"}): ${dropped}/${userIds.length} cached entries dropped`,
  );

  return NextResponse.json({ status: "ok", dropped });
}
