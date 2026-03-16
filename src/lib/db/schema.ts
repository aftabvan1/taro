import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
  uuid,
  bigint,
} from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["hobby", "pro", "teams"]);

export const instanceStatusEnum = pgEnum("instance_status", [
  "provisioning",
  "running",
  "stopped",
  "error",
]);

export const backupStatusEnum = pgEnum("backup_status", [
  "in_progress",
  "completed",
  "failed",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "deploy",
  "restart",
  "stop",
  "start",
  "backup",
  "restore",
  "approval",
  "error",
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  plan: planEnum("plan").notNull().default("hobby"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── Instances ────────────────────────────────────────────────────────────────

export const instances = pgTable("instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: instanceStatusEnum("status").notNull().default("provisioning"),
  region: text("region").notNull().default("eu-central"),
  serverIp: text("server_ip"),
  openclawPort: integer("openclaw_port"),
  ttydPort: integer("ttyd_port"),
  mcPort: integer("mc_port"),
  hetznerServerId: text("hetzner_server_id"),
  containerName: text("container_name"),
  mcAuthToken: text("mc_auth_token"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── Backups ──────────────────────────────────────────────────────────────────

export const backups = pgTable("backups", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => instances.id, { onDelete: "cascade" }),
  size: bigint("size", { mode: "number" }),
  status: backupStatusEnum("status").notNull().default("in_progress"),
  storagePath: text("storage_path"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Activity Logs ────────────────────────────────────────────────────────────

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => instances.id, { onDelete: "cascade" }),
  type: activityTypeEnum("type").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Mission Control: Agents ─────────────────────────────────────────────────

export const mcAgentStatusEnum = pgEnum("mc_agent_status", [
  "active",
  "pending",
  "stopped",
]);

export const mcAgents = pgTable("mc_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => instances.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: mcAgentStatusEnum("mc_agent_status").notNull().default("pending"),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  lastActive: timestamp("last_active", { withTimezone: true })
    .notNull()
    .defaultNow(),
  cpuUsage: integer("cpu_usage").notNull().default(0),
  memoryUsage: integer("memory_usage").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Mission Control: Boards ─────────────────────────────────────────────────

export const mcBoards = pgTable("mc_boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => instances.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Mission Control: Tasks ──────────────────────────────────────────────────

export const mcTaskStatusEnum = pgEnum("mc_task_status", [
  "todo",
  "in_progress",
  "done",
]);

export const mcTaskPriorityEnum = pgEnum("mc_task_priority", [
  "low",
  "medium",
  "high",
]);

export const mcTasks = pgTable("mc_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("board_id")
    .notNull()
    .references(() => mcBoards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: mcTaskStatusEnum("mc_task_status").notNull().default("todo"),
  agentName: text("agent_name").notNull().default(""),
  priority: mcTaskPriorityEnum("mc_task_priority").notNull().default("medium"),
  assignee: text("assignee"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Mission Control: Activity ───────────────────────────────────────────────

export const mcActivity = pgTable("mc_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => instances.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  agentName: text("agent_name").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Mission Control: Approvals ──────────────────────────────────────────────

export const mcApprovalStatusEnum = pgEnum("mc_approval_status", [
  "pending",
  "approved",
  "denied",
]);

export const mcApprovals = pgTable("mc_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => instances.id, { onDelete: "cascade" }),
  agentName: text("agent_name").notNull(),
  action: text("action").notNull(),
  command: text("command").notNull(),
  status: mcApprovalStatusEnum("mc_approval_status")
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
