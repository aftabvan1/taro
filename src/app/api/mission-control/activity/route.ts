import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcActivity } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, desc } from "drizzle-orm";
import { getUserInstance, noInstanceResponse, validateBody } from "@/lib/api/helpers";
import { createActivitySchema } from "@/lib/validations/mission-control";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const instance = await getUserInstance(auth.userId);
  if (!instance) {
    return NextResponse.json([]);
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(parseInt(limitParam ?? "50", 10) || 50, 200);

  const entries = await db
    .select()
    .from(mcActivity)
    .where(eq(mcActivity.instanceId, instance.id))
    .orderBy(desc(mcActivity.createdAt))
    .limit(limit);

  return NextResponse.json(
    entries.map((e) => ({
      id: e.id,
      type: e.type,
      message: e.message,
      agent_name: e.agentName,
      created_at: e.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const instance = await getUserInstance(auth.userId);
  if (!instance) return noInstanceResponse();

  const body = await req.json();
  const { data, error } = validateBody(createActivitySchema, body);
  if (error) return error;

  const [entry] = await db
    .insert(mcActivity)
    .values({
      instanceId: instance.id,
      type: data.type,
      message: data.message,
      agentName: data.agent_name ?? "",
    })
    .returning();

  return NextResponse.json({
    id: entry.id,
    type: entry.type,
    message: entry.message,
    agent_name: entry.agentName,
    created_at: entry.createdAt.toISOString(),
  });
}
