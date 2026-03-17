import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcTasks, mcBoards, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";
import { execSyncDaemon } from "@/lib/ssh-exec";

async function validateTaskOwnership(taskId: string, userId: string) {
  const result = await db
    .select({ task: mcTasks, board: mcBoards, instance: instances })
    .from(mcTasks)
    .innerJoin(mcBoards, eq(mcTasks.boardId, mcBoards.id))
    .innerJoin(instances, eq(mcBoards.instanceId, instances.id))
    .where(and(eq(mcTasks.id, taskId), eq(instances.userId, userId)))
    .limit(1);

  return result[0] ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;
  const owned = await validateTaskOwnership(id, auth.userId);
  if (!owned) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) updates.status = body.status;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.assignee !== undefined) updates.assignee = body.assignee;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.agent_name !== undefined) updates.agentName = body.agent_name;
  if (body.due_date !== undefined)
    updates.dueDate = body.due_date ? new Date(body.due_date) : null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(mcTasks)
    .set(updates)
    .where(eq(mcTasks.id, id))
    .returning();

  // Auto-dispatch: if status changed to in_progress and task has an agent assigned
  if (
    body.status === "in_progress" &&
    updated.agentName &&
    owned.instance.mcPort
  ) {
    try {
      const dispatchResult = await execSyncDaemon(owned.instance.mcPort, {
        method: "POST",
        path: "/openclaw/dispatch",
        body: {
          taskId: updated.id,
          taskTitle: updated.title,
          taskDescription: updated.description,
          agentName: updated.agentName,
          boardName: owned.board.name,
          priority: updated.priority,
        },
      });

      if (dispatchResult.ok) {
        const sessionId =
          (dispatchResult.data as Record<string, unknown>)?.sessionId as string;
        if (sessionId) {
          await db
            .update(mcTasks)
            .set({
              openclawSessionId: sessionId,
              dispatchedAt: new Date(),
            })
            .where(eq(mcTasks.id, id));
        }
      }
    } catch {
      // Dispatch failed silently — task is still in_progress, user can retry
    }
  }

  return NextResponse.json({
    id: updated.id,
    board_id: updated.boardId,
    title: updated.title,
    description: updated.description,
    status: updated.status,
    agent_name: updated.agentName,
    priority: updated.priority,
    assignee: updated.assignee,
    due_date: updated.dueDate?.toISOString() ?? null,
    openclaw_session_id: updated.openclawSessionId ?? null,
    dispatched_at: updated.dispatchedAt?.toISOString() ?? null,
    dispatch_output: updated.dispatchOutput ?? null,
    created_at: updated.createdAt.toISOString(),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;
  const owned = await validateTaskOwnership(id, auth.userId);
  if (!owned) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await db.delete(mcTasks).where(eq(mcTasks.id, id));
  return NextResponse.json({ success: true });
}
