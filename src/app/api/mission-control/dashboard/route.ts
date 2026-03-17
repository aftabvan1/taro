import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  mcAgents,
  mcTasks,
  mcBoards,
  mcApprovals,
  mcActivity,
  instances,
} from "@/lib/db/schema";
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
    return NextResponse.json({
      stats: {
        activeAgents: 0,
        totalTasks: 0,
        inbox: 0,
        inProgress: 0,
        review: 0,
        pendingApprovals: 0,
      },
      taskBreakdown: { inbox: 0, todo: 0, in_progress: 0, review: 0, done: 0 },
      recentActivity: [],
    });
  }

  // Agents
  const agents = await db
    .select()
    .from(mcAgents)
    .where(eq(mcAgents.instanceId, instance.id));

  const activeAgents = agents.filter((a) => a.status === "active").length;

  // Tasks (across all boards for this instance)
  const boards = await db
    .select({ id: mcBoards.id })
    .from(mcBoards)
    .where(eq(mcBoards.instanceId, instance.id));

  const taskBreakdown = { inbox: 0, todo: 0, in_progress: 0, review: 0, done: 0 };
  let totalTasks = 0;

  if (boards.length > 0) {
    const boardIds = new Set(boards.map((b) => b.id));
    const allTasks = await db
      .select({ status: mcTasks.status, boardId: mcTasks.boardId })
      .from(mcTasks);

    for (const t of allTasks) {
      if (boardIds.has(t.boardId)) {
        const status = t.status as keyof typeof taskBreakdown;
        if (status in taskBreakdown) taskBreakdown[status]++;
        totalTasks++;
      }
    }
  }

  // Approvals
  const pendingApprovals = await db
    .select({ id: mcApprovals.id })
    .from(mcApprovals)
    .where(eq(mcApprovals.instanceId, instance.id));

  const pendingCount = pendingApprovals.length;

  // Recent activity
  const recentActivity = await db
    .select()
    .from(mcActivity)
    .where(eq(mcActivity.instanceId, instance.id))
    .orderBy(desc(mcActivity.createdAt))
    .limit(10);

  return NextResponse.json({
    stats: {
      activeAgents,
      totalTasks,
      inbox: taskBreakdown.inbox,
      inProgress: taskBreakdown.in_progress,
      review: taskBreakdown.review,
      pendingApprovals: pendingCount,
    },
    taskBreakdown,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      agent_name: a.agentName,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
