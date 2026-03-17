import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcTags } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";
import { getUserInstance, noInstanceResponse, validateBody } from "@/lib/api/helpers";
import { createTagSchema } from "@/lib/validations/mission-control";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const instance = await getUserInstance(auth.userId);
  if (!instance) return NextResponse.json([]);

  const tags = await db
    .select()
    .from(mcTags)
    .where(eq(mcTags.instanceId, instance.id));

  return NextResponse.json(
    tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      created_at: t.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const instance = await getUserInstance(auth.userId);
  if (!instance) return noInstanceResponse();

  const body = await req.json();
  const { data, error } = validateBody(createTagSchema, body);
  if (error) return error;

  const [tag] = await db
    .insert(mcTags)
    .values({
      instanceId: instance.id,
      name: data.name,
      color: data.color ?? "#6366f1",
    })
    .returning();

  return NextResponse.json({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    created_at: tag.createdAt.toISOString(),
  });
}
