import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcTasks, mcBoards, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";
import { execSyncDaemon } from "@/lib/ssh-exec";
import { validateBody } from "@/lib/api/helpers";
import { updateTaskSchema } from "@/lib/validations/mission-control";

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
  const { data, error } = validateBody(updateTaskSchema, body);
  if (error) return error;

  const updates: Record<string, unknown> = {};

  if (data.status !== undefined) updates.status = data.status;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.assignee !== undefined) updates.assignee = data.assignee;
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.agent_name !== undefined) updates.agentName = data.agent_name;
  if (data.due_date !== undefined)
    updates.dueDate = data.due_date ? new Date(data.due_date) : null;

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
    data.status === "in_progress" &&
    updated.agentName &&
    owned.instance.mcPort
  ) {
    try {
      const dispatchResult = await execSyncDaemon(owned.instance.mcPort, {
        method: "POST",
        path: `/${owned.instance.agentFramework || "openclaw"}/dispatch`,
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
              agentSessionId: sessionId,
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
    agent_session_id: updated.agentSessionId ?? null,
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
