import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";

type ActivityType =
  | "deploy"
  | "restart"
  | "stop"
  | "start"
  | "backup"
  | "restore"
  | "approval"
  | "error";

export const logActivity = async (
  instanceId: string,
  type: ActivityType,
  message: string
) => {
  await db.insert(activityLogs).values({ instanceId, type, message });
};
