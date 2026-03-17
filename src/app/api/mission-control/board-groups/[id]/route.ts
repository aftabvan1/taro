import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcBoardGroups } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";
import { getUserInstance, noInstanceResponse, validateBody } from "@/lib/api/helpers";
import { updateBoardGroupSchema } from "@/lib/validations/mission-control";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;

  const instance = await getUserInstance(auth.userId);
  if (!instance) return noInstanceResponse();

  const body = await req.json();
  const { data, error } = validateBody(updateBoardGroupSchema, body);
  if (error) return error;

  const [updated] = await db
    .update(mcBoardGroups)
    .set({ name: data.name })
    .where(and(eq(mcBoardGroups.id, id), eq(mcBoardGroups.instanceId, instance.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
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

  const instance = await getUserInstance(auth.userId);
  if (!instance) return noInstanceResponse();

  // Verify the board group belongs to the user's instance
  const [group] = await db
    .select()
    .from(mcBoardGroups)
    .where(and(eq(mcBoardGroups.id, id), eq(mcBoardGroups.instanceId, instance.id)))
    .limit(1);

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  await db.delete(mcBoardGroups).where(eq(mcBoardGroups.id, id));
  return NextResponse.json({ success: true });
}
