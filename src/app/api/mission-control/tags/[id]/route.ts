import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcTags, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";
import { getUserInstance, noInstanceResponse, validateBody } from "@/lib/api/helpers";
import { updateTagSchema } from "@/lib/validations/mission-control";

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
  const { data, error } = validateBody(updateTagSchema, body);
  if (error) return error;

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.color !== undefined) updates.color = data.color;

  const [updated] = await db
    .update(mcTags)
    .set(updates)
    .where(and(eq(mcTags.id, id), eq(mcTags.instanceId, instance.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    color: updated.color,
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

  // Verify the tag belongs to the user's instance
  const [tag] = await db
    .select()
    .from(mcTags)
    .where(and(eq(mcTags.id, id), eq(mcTags.instanceId, instance.id)))
    .limit(1);

  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  await db.delete(mcTags).where(eq(mcTags.id, id));
  return NextResponse.json({ success: true });
}
