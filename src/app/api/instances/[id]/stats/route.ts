import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { getInstanceStats } from "@/lib/provisioner";
import { eq, and } from "drizzle-orm";

// GET /api/instances/:id/stats — live container stats
export async function GET(
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

    if (!instance.containerName || instance.status !== "running") {
      return NextResponse.json(
        { error: "Instance is not running" },
        { status: 400 }
      );
    }

    const stats = await getInstanceStats(instance.containerName);

    return NextResponse.json({ data: stats });
  } catch (error) {
    logger.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch instance stats" },
      { status: 500 }
    );
  }
}
