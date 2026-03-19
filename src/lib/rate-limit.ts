import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimitEntries } from "@/lib/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

let cleanupCounter = 0;

/**
 * DB-backed sliding window rate limiter.
 * Persists across Vercel cold starts and deploys.
 */
export async function rateLimit(
  req: NextRequest,
  opts: { windowMs: number; max: number }
): Promise<NextResponse | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const windowStart = new Date(Date.now() - opts.windowMs);

  try {
    // Count requests in the current window
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rateLimitEntries)
      .where(
        and(
          eq(rateLimitEntries.key, ip),
          gte(rateLimitEntries.timestamp, windowStart)
        )
      );

    const count = result?.count ?? 0;

    if (count >= opts.max) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(opts.windowMs / 1000)) },
        }
      );
    }

    // Record this request
    await db.insert(rateLimitEntries).values({ key: ip });

    // Periodic cleanup of expired entries (every 50th request)
    cleanupCounter++;
    if (cleanupCounter % 50 === 0) {
      db.delete(rateLimitEntries)
        .where(sql`${rateLimitEntries.timestamp} < now() - interval '1 hour'`)
        .catch((e) => logger.error("Rate limit cleanup failed:", e));
    }

    return null;
  } catch (error) {
    // If DB is down, fall through (don't block requests)
    logger.error("Rate limit check failed:", error);
    return null;
  }
}
