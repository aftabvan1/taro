import { db } from "@/lib/db";
import { mcAgents, mcBoards, mcTasks, mcActivity } from "@/lib/db/schema";

export async function seedInstanceData(instanceId: string, agentFramework: string = "openclaw"): Promise<void> {
  const isHermes = agentFramework === "hermes";
  const agentName = isHermes ? "hermes-primary" : "openclaw-primary";
  const frameworkLabel = isHermes ? "Hermes" : "OpenClaw";

  // 1. Create a default agent
  await db.insert(mcAgents).values({
    instanceId,
    name: agentName,
    status: "active",
    tasksCompleted: 0,
  });

  // 2. Create a "Getting Started" board with starter tasks
  const [board] = await db
    .insert(mcBoards)
    .values({
      instanceId,
      name: "Getting Started",
      description: `Default task board for your ${frameworkLabel} instance`,
    })
    .returning();

  await db.insert(mcTasks).values([
    {
      boardId: board.id,
      title: `Configure your ${frameworkLabel} instance`,
      status: "done",
      priority: "high",
      agentName: agentName,
    },
    {
      boardId: board.id,
      title: "Test agent communication",
      status: "in_progress",
      priority: "medium",
      agentName: agentName,
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
      message: `${frameworkLabel} primary agent initialized`,
      agentName: agentName,
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
      agentName: agentName,
    },
  ]);
}
