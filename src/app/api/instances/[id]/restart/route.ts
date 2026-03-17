import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { logActivity } from "@/lib/activity";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;

  try {
    const [instance] = await db
      .select()
      .from(instances)
      .where(and(eq(instances.id, id), eq(instances.userId, auth.userId)))
      .limit(1);

    if (!instance) {
      return NextResponse.json(
        { error: "Instance not found" },
        { status: 404 }
      );
    }

    // TODO: Sprint 3 — actually restart Docker container via SSH

    const [updated] = await db
      .update(instances)
      .set({ status: "running" })
      .where(eq(instances.id, id))
      .returning();

    await logActivity(
      id,
      "restart",
      `Instance "${instance.name}" restarted`
    );

    return NextResponse.json({
      data: updated,
      message: "Instance restarted",
    });
  } catch (error) {
    logger.error("Restart instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
