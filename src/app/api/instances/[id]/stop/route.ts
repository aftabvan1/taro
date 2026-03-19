import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { logActivity } from "@/lib/activity";
import { stopInstance } from "@/lib/provisioner";
import { eq, and } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(req, { windowMs: 60 * 1000, max: 10 });
  if (limited) return limited;

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

    if (instance.status === "stopped") {
      return NextResponse.json(
        { error: "Instance is already stopped" },
        { status: 400 }
      );
    }

    if (instance.containerName) {
      await stopInstance(instance.containerName, instance.agentFramework ?? undefined);
    }

    const [updated] = await db
      .update(instances)
      .set({ status: "stopped" })
      .where(eq(instances.id, id))
      .returning();

    await logActivity(id, "stop", `Instance "${instance.name}" stopped`);

    return NextResponse.json({
      data: updated,
      message: "Instance stopped",
    });
  } catch (error) {
    logger.error("Stop instance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
