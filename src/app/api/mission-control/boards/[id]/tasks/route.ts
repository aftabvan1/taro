import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcTasks, mcTaskTags, mcTags } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id: boardId } = await params;

  const tasks = await db
    .select()
    .from(mcTasks)
    .where(eq(mcTasks.boardId, boardId));

  // Fetch tags for all tasks
  const taskIds = tasks.map((t) => t.id);
  let tagMap: Record<string, { id: string; name: string; color: string }[]> = {};

  if (taskIds.length > 0) {
    const taskTagRows = await db
      .select({
        taskId: mcTaskTags.taskId,
        tagId: mcTags.id,
        tagName: mcTags.name,
        tagColor: mcTags.color,
      })
      .from(mcTaskTags)
      .innerJoin(mcTags, eq(mcTaskTags.tagId, mcTags.id));

    for (const row of taskTagRows) {
      if (!tagMap[row.taskId]) tagMap[row.taskId] = [];
      tagMap[row.taskId].push({
        id: row.tagId,
        name: row.tagName,
        color: row.tagColor,
      });
    }
  }

  return NextResponse.json(
    tasks.map((t) => ({
      id: t.id,
      board_id: t.boardId,
      title: t.title,
      description: t.description,
      status: t.status,
      agent_name: t.agentName,
      priority: t.priority,
      assignee: t.assignee,
      due_date: t.dueDate?.toISOString() ?? null,
      openclaw_session_id: t.openclawSessionId ?? null,
      dispatched_at: t.dispatchedAt?.toISOString() ?? null,
      dispatch_output: t.dispatchOutput ?? null,
      tags: tagMap[t.id] ?? [],
      created_at: t.createdAt.toISOString(),
    }))
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id: boardId } = await params;
  const body = await req.json();

  const [task] = await db
    .insert(mcTasks)
    .values({
      boardId,
      title: body.title,
      description: body.description ?? "",
      status: body.status ?? "inbox",
      agentName: body.agent_name ?? "",
      priority: body.priority ?? "medium",
      assignee: body.assignee ?? null,
      dueDate: body.due_date ? new Date(body.due_date) : null,
    })
    .returning();

  return NextResponse.json({
    id: task.id,
    board_id: task.boardId,
    title: task.title,
    description: task.description,
    status: task.status,
    agent_name: task.agentName,
    priority: task.priority,
    assignee: task.assignee,
    due_date: task.dueDate?.toISOString() ?? null,
    openclaw_session_id: task.openclawSessionId ?? null,
    dispatched_at: task.dispatchedAt?.toISOString() ?? null,
    dispatch_output: task.dispatchOutput ?? null,
    tags: [],
    created_at: task.createdAt.toISOString(),
  });
}
