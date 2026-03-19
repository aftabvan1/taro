import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { mcTaskTags, mcTasks, mcBoards, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";

const tagSchema = z.object({
  tagId: z.string().uuid(),
});

/**
 * Verify the authenticated user owns the task (via task → board → instance → userId).
 */
async function verifyTaskOwnership(taskId: string, userId: string): Promise<boolean> {
  const [task] = await db
    .select({ instanceUserId: instances.userId })
    .from(mcTasks)
    .innerJoin(mcBoards, eq(mcTasks.boardId, mcBoards.id))
    .innerJoin(instances, eq(mcBoards.instanceId, instances.id))
    .where(eq(mcTasks.id, taskId))
    .limit(1);

  return task?.instanceUserId === userId;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id: taskId } = await params;

  const body = await req.json();
  const parsed = tagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const owns = await verifyTaskOwnership(taskId, auth.userId);
  if (!owns) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .insert(mcTaskTags)
    .values({ taskId, tagId: parsed.data.tagId })
    .onConflictDoNothing();

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id: taskId } = await params;

  const body = await req.json();
  const parsed = tagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const owns = await verifyTaskOwnership(taskId, auth.userId);
  if (!owns) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(mcTaskTags)
    .where(and(eq(mcTaskTags.taskId, taskId), eq(mcTaskTags.tagId, parsed.data.tagId)));

  return NextResponse.json({ success: true });
}
