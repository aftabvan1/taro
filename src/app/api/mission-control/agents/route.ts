import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcAgents, instances } from "@/lib/db/schema";
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

  const agents = await db
    .select()
    .from(mcAgents)
    .where(eq(mcAgents.instanceId, instance.id));

  return NextResponse.json(
    agents.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      tasks_completed: a.tasksCompleted,
      last_active: a.lastActive.toISOString(),
      cpu_usage: a.cpuUsage,
      memory_usage: a.memoryUsage,
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

  const [agent] = await db
    .insert(mcAgents)
    .values({
      instanceId: instance.id,
      name: body.name,
      status: body.status ?? "pending",
    })
    .returning();

  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    status: agent.status,
    tasks_completed: agent.tasksCompleted,
    last_active: agent.lastActive.toISOString(),
    cpu_usage: agent.cpuUsage,
    memory_usage: agent.memoryUsage,
  });
}
