import { db } from "@/lib/db";
import { mcAgents, mcBoards, mcTasks, mcActivity } from "@/lib/db/schema";

export async function seedInstanceData(instanceId: string): Promise<void> {
  // 1. Create a default agent
  await db.insert(mcAgents).values({
    instanceId,
    name: "openclaw-primary",
    status: "active",
    tasksCompleted: 0,
  });

  // 2. Create a "Getting Started" board with starter tasks
  const [board] = await db
    .insert(mcBoards)
    .values({
      instanceId,
      name: "Getting Started",
      description: "Default task board for your OpenClaw instance",
    })
    .returning();

  await db.insert(mcTasks).values([
    {
      boardId: board.id,
      title: "Configure your OpenClaw instance",
      status: "done",
      priority: "high",
      agentName: "openclaw-primary",
    },
    {
      boardId: board.id,
      title: "Test agent communication",
      status: "in_progress",
      priority: "medium",
      agentName: "openclaw-primary",
    },
    {
      boardId: board.id,
      title: "Set up approval workflows",
      status: "todo",
      priority: "low",
      agentName: "",
    },
  ]);

  // 3. Create welcome activity entries
  await db.insert(mcActivity).values([
    {
      instanceId,
      type: "agent_connected",
      message: "OpenClaw primary agent initialized",
      agentName: "openclaw-primary",
    },
    {
      instanceId,
      type: "board_created",
      message: 'Getting Started board created with 3 tasks',
      agentName: "",
    },
    {
      instanceId,
      type: "task_completed",
      message: "Instance configuration completed",
      agentName: "openclaw-primary",
    },
  ]);
}
