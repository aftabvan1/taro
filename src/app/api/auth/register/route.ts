import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, signToken, signRefreshToken } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/email";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { windowMs: 15 * 60 * 1000, max: 5 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    // Check if user already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, name })
      .returning({ id: users.id, email: users.email, name: users.name, plan: users.plan });

    const token = signToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, name).catch((err) => {
      logger.error("Failed to send welcome email:", err);
    });

    return NextResponse.json(
      { data: { user, token, refreshToken }, message: "Account created" },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
