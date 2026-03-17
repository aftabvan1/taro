import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcBoardGroups, mcBoards } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, sql } from "drizzle-orm";
import { getUserInstance, noInstanceResponse, validateBody } from "@/lib/api/helpers";
import { createBoardGroupSchema } from "@/lib/validations/mission-control";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const instance = await getUserInstance(auth.userId);
  if (!instance) return NextResponse.json([]);

  const groups = await db
    .select({
      id: mcBoardGroups.id,
      name: mcBoardGroups.name,
      createdAt: mcBoardGroups.createdAt,
      boardCount: sql<number>`count(${mcBoards.id})::int`,
    })
    .from(mcBoardGroups)
    .leftJoin(mcBoards, eq(mcBoards.boardGroupId, mcBoardGroups.id))
    .where(eq(mcBoardGroups.instanceId, instance.id))
    .groupBy(mcBoardGroups.id);

  return NextResponse.json(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      board_count: g.boardCount,
      created_at: g.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const instance = await getUserInstance(auth.userId);
  if (!instance) return noInstanceResponse();

  const body = await req.json();
  const { data, error } = validateBody(createBoardGroupSchema, body);
  if (error) return error;

  const [group] = await db
    .insert(mcBoardGroups)
    .values({ instanceId: instance.id, name: data.name })
    .returning();

  return NextResponse.json({
    id: group.id,
    name: group.name,
    board_count: 0,
    created_at: group.createdAt.toISOString(),
  });
}
