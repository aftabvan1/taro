import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcCustomFields } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";
import { getUserInstance, noInstanceResponse, validateBody } from "@/lib/api/helpers";
import { createCustomFieldSchema } from "@/lib/validations/mission-control";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const instance = await getUserInstance(auth.userId);
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

  const instance = await getUserInstance(auth.userId);
  if (!instance) return noInstanceResponse();

  const body = await req.json();
  const { data, error } = validateBody(createCustomFieldSchema, body);
  if (error) return error;

  const [field] = await db
    .insert(mcCustomFields)
    .values({
      instanceId: instance.id,
      name: data.name,
      fieldType: data.field_type ?? "text",
      options: data.options ?? null,
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
