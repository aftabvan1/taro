import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcCustomFields, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const [instance] = await db
    .select()
    .from(instances)
    .where(eq(instances.userId, auth.userId))
    .limit(1);

  if (!instance) return NextResponse.json([]);

  const fields = await db
    .select()
    .from(mcCustomFields)
    .where(eq(mcCustomFields.instanceId, instance.id));

  return NextResponse.json(
    fields.map((f) => ({
      id: f.id,
      name: f.name,
      field_type: f.fieldType,
      options: f.options,
      created_at: f.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const [instance] = await db
    .select()
    .from(instances)
    .where(eq(instances.userId, auth.userId))
    .limit(1);

  if (!instance) {
    return NextResponse.json({ error: "No instance found" }, { status: 404 });
  }

  const body = await req.json();

  const [field] = await db
    .insert(mcCustomFields)
    .values({
      instanceId: instance.id,
      name: body.name,
      fieldType: body.field_type ?? "text",
      options: body.options ?? null,
    })
    .returning();

  return NextResponse.json({
    id: field.id,
    name: field.name,
    field_type: field.fieldType,
    options: field.options,
    created_at: field.createdAt.toISOString(),
  });
}
