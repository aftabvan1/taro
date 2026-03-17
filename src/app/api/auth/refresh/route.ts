import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken, signToken, signRefreshToken } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { windowMs: 15 * 60 * 1000, max: 30 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    const payload = verifyToken(parsed.data.refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    // Issue new tokens
    const token = signToken({ userId: payload.userId, email: payload.email });
    const refreshToken = signRefreshToken({ userId: payload.userId, email: payload.email });

    return NextResponse.json({
      data: { token, refreshToken },
    });
  } catch (error) {
    logger.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
