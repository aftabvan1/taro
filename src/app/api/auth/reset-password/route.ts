import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { resetTokens } from "@/app/api/auth/forgot-password/route";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { windowMs: 15 * 60 * 1000, max: 10 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const entry = resetTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      resetTokens.delete(token);
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, entry.userId));

    // Consume the token
    resetTokens.delete(token);

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    logger.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
