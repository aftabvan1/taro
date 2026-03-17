import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword, signToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
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
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = signToken({ userId: user.id, email: user.email });

    return NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
        },
        token,
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
