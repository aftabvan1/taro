import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mcAgents, instances } from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";
import { execSyncDaemon } from "@/lib/ssh-exec";

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
      role: a.role,
      description: a.description,
      status: a.status,
      tasks_completed: a.tasksCompleted,
      last_active: a.lastActive.toISOString(),
      cpu_usage: a.cpuUsage,
      memory_usage: a.memoryUsage,
      openclaw_session_id: a.openclawSessionId ?? undefined,
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
      role: body.role ?? "",
      description: body.description ?? "",
      status: body.status ?? "pending",
    })
    .returning();

  // If instance has mcPort, create the agent in OpenClaw
  let openclawSessionId: string | undefined;
  if (instance.mcPort) {
    try {
      const result = await execSyncDaemon(instance.mcPort, {
        method: "POST",
        path: "/openclaw/agents/create",
        body: {
          name: body.name,
          role: body.role ?? "",
          description: body.description ?? "",
        },
      });

      if (result.ok) {
        openclawSessionId =
          (result.data as Record<string, unknown>)?.sessionId as string;
        if (openclawSessionId) {
          await db
            .update(mcAgents)
            .set({
              openclawSessionId,
              status: "active",
            })
            .where(eq(mcAgents.id, agent.id));
        }
      }
    } catch {
      // Agent created in DB but not in OpenClaw — will sync on next connection
    }
  }

  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    description: agent.description,
    status: openclawSessionId ? "active" : agent.status,
    tasks_completed: agent.tasksCompleted,
    last_active: agent.lastActive.toISOString(),
    cpu_usage: agent.cpuUsage,
    memory_usage: agent.memoryUsage,
    openclaw_session_id: openclawSessionId ?? agent.openclawSessionId ?? undefined,
  });
}
