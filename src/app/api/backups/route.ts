import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { backups, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { createBackup } from "@/lib/backup";
import { eq, desc, inArray } from "drizzle-orm";

// GET /api/backups — list user's backups
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  try {
    const userInstances = await db
      .select({ id: instances.id })
      .from(instances)
      .where(eq(instances.userId, auth.userId));

    const instanceIds = userInstances.map((i) => i.id);

    if (instanceIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const userBackups = await db
      .select()
      .from(backups)
      .where(inArray(backups.instanceId, instanceIds))
      .orderBy(desc(backups.createdAt))
      .limit(30);

    // Strip storagePath to avoid leaking server directory structure
    const sanitized = userBackups.map(({ storagePath: _, ...rest }) => rest);
    return NextResponse.json({ data: sanitized });
  } catch (error) {
    logger.error("List backups error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/backups — create a new backup
export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  try {
    const body = await req.json();
    const { instanceId } = body;

    if (!instanceId) {
      return NextResponse.json(
        { error: "instanceId is required" },
        { status: 400 }
      );
    }

    // Verify instance belongs to user
    const [instance] = await db
      .select()
      .from(instances)
      .where(eq(instances.id, instanceId))
      .limit(1);

    if (!instance || instance.userId !== auth.userId) {
      return NextResponse.json(
        { error: "Instance not found" },
        { status: 404 }
      );
    }

    const backup = await createBackup(instanceId);

    return NextResponse.json(
      { data: backup, message: "Backup created" },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Create backup error:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}
