import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activityLogs, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, desc, inArray } from "drizzle-orm";

// GET /api/activity — recent activity for user's instances
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  try {
    // Get user's instance IDs
    const userInstances = await db
      .select({ id: instances.id })
      .from(instances)
      .where(eq(instances.userId, auth.userId));

    const instanceIds = userInstances.map((i) => i.id);

    if (instanceIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const logs = await db
      .select()
      .from(activityLogs)
      .where(inArray(activityLogs.instanceId, instanceIds))
      .orderBy(desc(activityLogs.createdAt))
      .limit(50);

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error("Activity log error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
