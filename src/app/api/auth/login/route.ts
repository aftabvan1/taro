import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  verifyPassword,
  dummyVerifyPassword,
  signToken,
  signRefreshToken,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from "@/lib/auth";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { windowMs: 15 * 60 * 1000, max: 10 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Perform dummy bcrypt compare to prevent timing attacks
      await dummyVerifyPassword(password);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check account lockout
    if (
      user.lockedUntil &&
      new Date(user.lockedUntil).getTime() > Date.now()
    ) {
      return NextResponse.json(
        { error: "Account temporarily locked. Please try again later." },
        { status: 423 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
      // Increment failed attempts
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const lockout =
        newAttempts >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_DURATION_MS)
          : null;

      await db
        .update(users)
        .set({
          failedLoginAttempts: newAttempts,
          lockedUntil: lockout,
        })
        .where(eq(users.id, user.id));

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await db
        .update(users)
        .set({ failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(users.id, user.id));
    }

    const token = signToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
        },
        token,
        refreshToken,
      },
      message: "Login successful",
    });
  } catch (error) {
    logger.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
