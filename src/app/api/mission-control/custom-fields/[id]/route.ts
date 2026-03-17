import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcCustomFields } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.field_type !== undefined) updates.fieldType = body.field_type;
  if (body.options !== undefined) updates.options = body.options;

  const [updated] = await db
    .update(mcCustomFields)
    .set(updates)
    .where(eq(mcCustomFields.id, id))
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
  await db.delete(mcCustomFields).where(eq(mcCustomFields.id, id));
  return NextResponse.json({ success: true });
}
