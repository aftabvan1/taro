import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
  uuid,
  bigint,
  json,
  primaryKey,
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
  llmProvider: text("llm_provider").notNull().default("openai-codex"),
  llmModel: text("llm_model").notNull().default("openai-codex/gpt-5.4"),
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
  role: text("role").notNull().default(""),
  description: text("description").notNull().default(""),
  status: mcAgentStatusEnum("mc_agent_status").notNull().default("pending"),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  lastActive: timestamp("last_active", { withTimezone: true })
    .notNull()
    .defaultNow(),
  cpuUsage: integer("cpu_usage").notNull().default(0),
  memoryUsage: integer("memory_usage").notNull().default(0),
  openclawSessionId: text("openclaw_session_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Mission Control: Board Groups ──────────────────────────────────────────

export const mcBoardGroups = pgTable("mc_board_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => instances.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
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
  boardGroupId: uuid("board_group_id").references(() => mcBoardGroups.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Mission Control: Tasks ──────────────────────────────────────────────────

export const mcTaskStatusEnum = pgEnum("mc_task_status", [
  "inbox",
  "todo",
  "in_progress",
  "review",
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
  description: text("description").notNull().default(""),
  status: mcTaskStatusEnum("mc_task_status").notNull().default("todo"),
  agentName: text("agent_name").notNull().default(""),
  priority: mcTaskPriorityEnum("mc_task_priority").notNull().default("medium"),
  assignee: text("assignee"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  openclawSessionId: text("openclaw_session_id"),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  dispatchOutput: text("dispatch_output"),
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
  openclawApprovalId: text("openclaw_approval_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Mission Control: Tags ──────────────────────────────────────────────────

export const mcTags = pgTable("mc_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => instances.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const mcTaskTags = pgTable(
  "mc_task_tags",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => mcTasks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => mcTags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] })]
);

// ─── Mission Control: Custom Fields ─────────────────────────────────────────

export const mcCustomFieldTypeEnum = pgEnum("mc_custom_field_type", [
  "text",
  "number",
  "date",
  "select",
]);

export const mcCustomFields = pgTable("mc_custom_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => instances.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fieldType: mcCustomFieldTypeEnum("field_type").notNull().default("text"),
  options: json("options").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const mcTaskCustomFieldValues = pgTable("mc_task_custom_field_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => mcTasks.id, { onDelete: "cascade" }),
  fieldId: uuid("field_id")
    .notNull()
    .references(() => mcCustomFields.id, { onDelete: "cascade" }),
  value: text("value").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
