import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcBoards, mcTasks } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, sql } from "drizzle-orm";
import { getUserInstance, noInstanceResponse, validateBody } from "@/lib/api/helpers";
import { createBoardSchema } from "@/lib/validations/mission-control";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const instance = await getUserInstance(auth.userId);
  if (!instance) {
    return NextResponse.json([]);
  }

  const boards = await db
    .select({
      id: mcBoards.id,
      name: mcBoards.name,
      description: mcBoards.description,
      createdAt: mcBoards.createdAt,
      taskCount: sql<number>`cast(count(${mcTasks.id}) as int)`,
    })
    .from(mcBoards)
    .leftJoin(mcTasks, eq(mcTasks.boardId, mcBoards.id))
    .where(eq(mcBoards.instanceId, instance.id))
    .groupBy(mcBoards.id);

  return NextResponse.json(
    boards.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      task_count: b.taskCount,
      created_at: b.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const instance = await getUserInstance(auth.userId);
  if (!instance) return noInstanceResponse();

  const body = await req.json();
  const { data, error } = validateBody(createBoardSchema, body);
  if (error) return error;

  const [board] = await db
    .insert(mcBoards)
    .values({
      instanceId: instance.id,
      name: data.name,
      description: data.description ?? "",
    })
    .returning();

  return NextResponse.json({
    id: board.id,
    name: board.name,
    description: board.description,
    task_count: 0,
    created_at: board.createdAt.toISOString(),
  });
}
