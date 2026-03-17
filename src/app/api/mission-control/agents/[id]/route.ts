import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  mcAgents,
  mcTasks,
  mcBoards,
  mcActivity,
  instances,
} from "@/lib/db/schema";
import { authenticate, isAuthenticated } from "@/lib/middleware/auth";
import { eq, and, desc } from "drizzle-orm";

async function validateAgentOwnership(agentId: string, userId: string) {
  const result = await db
    .select({ agent: mcAgents, instance: instances })
    .from(mcAgents)
    .innerJoin(instances, eq(mcAgents.instanceId, instances.id))
    .where(and(eq(mcAgents.id, agentId), eq(instances.userId, userId)))
    .limit(1);

  return result[0] ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;
  const owned = await validateAgentOwnership(id, auth.userId);
  if (!owned) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const agent = owned.agent;

  // Fetch assigned tasks (tasks where agent_name matches this agent)
  const assignedTasks = await db
    .select({
      id: mcTasks.id,
      boardId: mcTasks.boardId,
      title: mcTasks.title,
      description: mcTasks.description,
      status: mcTasks.status,
      priority: mcTasks.priority,
      openclawSessionId: mcTasks.openclawSessionId,
      dispatchedAt: mcTasks.dispatchedAt,
      createdAt: mcTasks.createdAt,
    })
    .from(mcTasks)
    .innerJoin(mcBoards, eq(mcTasks.boardId, mcBoards.id))
    .where(
      and(
        eq(mcTasks.agentName, agent.name),
        eq(mcBoards.instanceId, owned.instance.id)
      )
    );

  // Fetch recent activity for this agent
  const recentActivity = await db
    .select()
    .from(mcActivity)
    .where(
      and(
        eq(mcActivity.instanceId, owned.instance.id),
        eq(mcActivity.agentName, agent.name)
      )
    )
    .orderBy(desc(mcActivity.createdAt))
    .limit(50);

  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    description: agent.description,
    status: agent.status,
    tasks_completed: agent.tasksCompleted,
    last_active: agent.lastActive.toISOString(),
    cpu_usage: agent.cpuUsage,
    memory_usage: agent.memoryUsage,
    openclaw_session_id: agent.openclawSessionId ?? null,
    created_at: agent.createdAt.toISOString(),
    assigned_tasks: assignedTasks.map((t) => ({
      id: t.id,
      board_id: t.boardId,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      openclaw_session_id: t.openclawSessionId ?? null,
      dispatched_at: t.dispatchedAt?.toISOString() ?? null,
      created_at: t.createdAt.toISOString(),
    })),
    recent_activity: recentActivity.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      created_at: a.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;
  const owned = await validateAgentOwnership(id, auth.userId);
  if (!owned) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.role !== undefined) updates.role = body.role;
  if (body.description !== undefined) updates.description = body.description;
  if (body.name !== undefined) updates.name = body.name;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(mcAgents)
    .set(updates)
    .where(eq(mcAgents.id, id))
    .returning();

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    role: updated.role,
    description: updated.description,
    status: updated.status,
    tasks_completed: updated.tasksCompleted,
    last_active: updated.lastActive.toISOString(),
    openclaw_session_id: updated.openclawSessionId ?? null,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticate(req);
  if (!isAuthenticated(auth)) return auth;

  const { id } = await params;
  const owned = await validateAgentOwnership(id, auth.userId);
  if (!owned) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  await db.delete(mcAgents).where(eq(mcAgents.id, id));
  return NextResponse.json({ success: true });
}
