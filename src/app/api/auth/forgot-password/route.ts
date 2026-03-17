import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

// In-memory store for reset tokens (replace with DB table in production at scale)
export const resetTokens = new Map<
  string,
  { userId: string; expiresAt: number }
>();

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { windowMs: 15 * 60 * 1000, max: 5 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Always return success to prevent email enumeration
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      const token = randomBytes(32).toString("hex");
      resetTokens.set(token, {
        userId: user.id,
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      try {
        await sendPasswordResetEmail(email, token);
      } catch (emailErr) {
        logger.error("Failed to send password reset email:", emailErr);
      }
    }

    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch (error) {
    logger.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
