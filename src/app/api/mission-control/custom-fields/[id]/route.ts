import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcCustomFields } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and } from "drizzle-orm";
import { getUserInstance, noInstanceResponse, validateBody } from "@/lib/api/helpers";
import { updateCustomFieldSchema } from "@/lib/validations/mission-control";

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
  const { data, error } = validateBody(updateCustomFieldSchema, body);
  if (error) return error;

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.field_type !== undefined) updates.fieldType = data.field_type;
  if (data.options !== undefined) updates.options = data.options;

  const [updated] = await db
    .update(mcCustomFields)
    .set(updates)
    .where(and(eq(mcCustomFields.id, id), eq(mcCustomFields.instanceId, instance.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    field_type: updated.fieldType,
    options: updated.options,
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

  // Verify the custom field belongs to the user's instance
  const [field] = await db
    .select()
    .from(mcCustomFields)
    .where(and(eq(mcCustomFields.id, id), eq(mcCustomFields.instanceId, instance.id)))
    .limit(1);

  if (!field) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 });
  }

  await db.delete(mcCustomFields).where(eq(mcCustomFields.id, id));
  return NextResponse.json({ success: true });
}
