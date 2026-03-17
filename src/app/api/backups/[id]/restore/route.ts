import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { backups, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { restoreBackup } from "@/lib/backup";
import { eq } from "drizzle-orm";

// POST /api/backups/:id/restore — restore from a backup
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;

  try {
    // Get backup and verify ownership
    const [backup] = await db
      .select()
      .from(backups)
      .where(eq(backups.id, id))
      .limit(1);

    if (!backup) {
      return NextResponse.json(
        { error: "Backup not found" },
        { status: 404 }
      );
    }

    const [instance] = await db
      .select()
      .from(instances)
      .where(eq(instances.id, backup.instanceId))
      .limit(1);

    if (!instance || instance.userId !== auth.userId) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    await restoreBackup(backup.instanceId, id);

    return NextResponse.json({ message: "Backup restored successfully" });
  } catch (error) {
    logger.error("Restore backup error:", error);
    return NextResponse.json(
      { error: "Failed to restore backup" },
      { status: 500 }
    );
  }
}
