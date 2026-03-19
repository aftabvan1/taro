import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  mcTasks,
  mcBoards,
  mcTaskCustomFieldValues,
  mcCustomFields,
  instances,
} from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";
import { execSyncDaemon } from "@/lib/ssh-exec";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;

  // Validate ownership and get task + board + instance
  const result = await db
    .select({ task: mcTasks, board: mcBoards, instance: instances })
    .from(mcTasks)
    .innerJoin(mcBoards, eq(mcTasks.boardId, mcBoards.id))
    .innerJoin(instances, eq(mcBoards.instanceId, instances.id))
    .where(and(eq(mcTasks.id, id), eq(instances.userId, auth.userId)))
    .limit(1);

  const owned = result[0];
  if (!owned) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (!owned.instance.mcPort) {
    return NextResponse.json(
      { error: "Instance has no sync daemon port configured" },
      { status: 400 }
    );
  }

  // Fetch custom field values for context
  const customFields: Record<string, string> = {};
  try {
    const cfValues = await db
      .select({
        fieldName: mcCustomFields.name,
        value: mcTaskCustomFieldValues.value,
      })
      .from(mcTaskCustomFieldValues)
      .innerJoin(
        mcCustomFields,
        eq(mcTaskCustomFieldValues.fieldId, mcCustomFields.id)
      )
      .where(eq(mcTaskCustomFieldValues.taskId, id));

    for (const cf of cfValues) {
      customFields[cf.fieldName] = cf.value;
    }
  } catch {
    // Continue without custom fields
  }

  const prefix = owned.instance.agentFramework || "openclaw";

  const dispatchResult = await execSyncDaemon(owned.instance.mcPort, {
    method: "POST",
    path: `/${prefix}/dispatch`,
    body: {
      taskId: owned.task.id,
      taskTitle: owned.task.title,
      taskDescription: owned.task.description,
      agentName: owned.task.agentName || undefined,
      boardName: owned.board.name,
      priority: owned.task.priority,
      customFields:
        Object.keys(customFields).length > 0 ? customFields : undefined,
    },
  });

  if (!dispatchResult.ok) {
    return NextResponse.json(
      {
        error: "Failed to dispatch task",
        detail: dispatchResult.data,
      },
      { status: dispatchResult.status }
    );
  }

  const sessionId =
    (dispatchResult.data as Record<string, unknown>)?.sessionId as string;

  // Update task status
  const [updated] = await db
    .update(mcTasks)
    .set({
      status: "in_progress",
      agentSessionId: sessionId || null,
      dispatchedAt: new Date(),
    })
    .where(eq(mcTasks.id, id))
    .returning();

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
