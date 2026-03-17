import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";
import { updateSyncDaemon } from "@/lib/provisioner";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;

  const [instance] = await db
    .select()
    .from(instances)
    .where(and(eq(instances.id, id), eq(instances.userId, auth.userId)))
    .limit(1);

  if (!instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  if (!instance.name) {
    return NextResponse.json({ error: "Instance has no name" }, { status: 400 });
  }

  try {
    await updateSyncDaemon(instance.name, instance.id, instance.mcPort ?? undefined);
    return NextResponse.json({ ok: true, message: "Sync daemon updated and restarted" });
  } catch (err) {
    console.error("[update-sync] Failed:", (err as Error).message);
    return NextResponse.json(
      { error: `Failed to update sync daemon: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
