import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcApprovals, instances } from "@/lib/db/schema";
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

  if (!instance) {
    return NextResponse.json([]);
  }

  const approvals = await db
    .select()
    .from(mcApprovals)
    .where(eq(mcApprovals.instanceId, instance.id));

  return NextResponse.json(
    approvals.map((a) => ({
      id: a.id,
      agent_name: a.agentName,
      action: a.action,
      command: a.command,
      status: a.status,
      created_at: a.createdAt.toISOString(),
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

  const [approval] = await db
    .insert(mcApprovals)
    .values({
      instanceId: instance.id,
      agentName: body.agent_name,
      action: body.action,
      command: body.command,
    })
    .returning();

  return NextResponse.json({
    id: approval.id,
    agent_name: approval.agentName,
    action: approval.action,
    command: approval.command,
    status: approval.status,
    created_at: approval.createdAt.toISOString(),
  });
}
