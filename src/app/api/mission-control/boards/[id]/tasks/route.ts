import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcTasks } from "@/lib/db/schema";
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

  return NextResponse.json(
    tasks.map((t) => ({
      id: t.id,
      board_id: t.boardId,
      title: t.title,
      status: t.status,
      agent_name: t.agentName,
      priority: t.priority,
      assignee: t.assignee,
      due_date: t.dueDate?.toISOString() ?? null,
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
      status: body.status ?? "todo",
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
    status: task.status,
    agent_name: task.agentName,
    priority: task.priority,
    assignee: task.assignee,
    due_date: task.dueDate?.toISOString() ?? null,
    created_at: task.createdAt.toISOString(),
  });
}
