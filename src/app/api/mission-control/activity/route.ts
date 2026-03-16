import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcActivity, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const [instance] = await db
    .select()
    .from(instances)
    .where(eq(instances.userId, auth.userId))
    .limit(1);

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

  const [instance] = await db
    .select()
    .from(instances)
    .where(eq(instances.userId, auth.userId))
    .limit(1);

  if (!instance) {
    return NextResponse.json({ error: "No instance found" }, { status: 404 });
  }

  const body = await req.json();

  const [entry] = await db
    .insert(mcActivity)
    .values({
      instanceId: instance.id,
      type: body.type,
      message: body.message,
      agentName: body.agent_name ?? "",
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
