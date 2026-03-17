import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcBoards, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";

async function validateBoardOwnership(boardId: string, userId: string) {
  const result = await db
    .select({ board: mcBoards })
    .from(mcBoards)
    .innerJoin(instances, eq(mcBoards.instanceId, instances.id))
    .where(and(eq(mcBoards.id, boardId), eq(instances.userId, userId)))
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
  const owned = await validateBoardOwnership(id, auth.userId);
  if (!owned) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(mcBoards)
    .set(updates)
    .where(eq(mcBoards.id, id))
    .returning();

  return NextResponse.json({
    id: updated.id,
    instance_id: updated.instanceId,
    name: updated.name,
    description: updated.description,
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
  const owned = await validateBoardOwnership(id, auth.userId);
  if (!owned) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  await db.delete(mcBoards).where(eq(mcBoards.id, id));
  return NextResponse.json({ success: true });
}
