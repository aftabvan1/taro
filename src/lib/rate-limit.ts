import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();
let requestCount = 0;

/**
 * In-memory sliding window rate limiter.
 * Tracks requests per IP within a time window.
 *
 * LIMITATION: Resets on every Vercel cold start and deploy.
 * This provides basic protection only — brute force across cold starts bypasses it.
 * Account lockout (5 failed attempts) in auth.ts provides the real security layer.
 * TODO: Move to Cloudflare rate limiting or DB-backed store for production hardening.
 */
export function rateLimit(
  req: NextRequest,
  opts: { windowMs: number; max: number }
): NextResponse | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const now = Date.now();
  const key = ip;

  // Periodic cleanup to prevent memory leaks
  requestCount++;
  if (requestCount % 100 === 0) {
    for (const [k, entry] of store) {
      entry.timestamps = entry.timestamps.filter(
        (t) => now - t < opts.windowMs
      );
      if (entry.timestamps.length === 0) store.delete(k);
    }
  }

  const entry = store.get(key) ?? { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < opts.windowMs);

  if (entry.timestamps.length >= opts.max) {
    const retryAfter = Math.ceil(
      (entry.timestamps[0] + opts.windowMs - now) / 1000
    );
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return null;
}
