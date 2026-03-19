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
  index,
  uniqueIndex,
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

export const agentFrameworkEnum = pgEnum("agent_framework", ["openclaw", "hermes"]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  plan: planEnum("plan").notNull().default("pro"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── Password Reset Tokens ───────────────────────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Instances ────────────────────────────────────────────────────────────────

export const instances = pgTable(
  "instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: instanceStatusEnum("status").notNull().default("provisioning"),
    agentFramework: agentFrameworkEnum("agent_framework").notNull().default("openclaw"),
    region: text("region").notNull().default("eu-central"),
    serverIp: text("server_ip"),
    agentPort: integer("agent_port"),
    ttydPort: integer("ttyd_port"),
    mcPort: integer("mc_port"),
    hetznerServerId: text("hetzner_server_id"),
    containerName: text("container_name"),
    mcAuthToken: text("mc_auth_token"),
    terminalToken: text("terminal_token"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    llmProvider: text("llm_provider").notNull().default("openai-codex"),
    llmModel: text("llm_model").notNull().default("openai-codex/gpt-5.4"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("instances_user_id_idx").on(t.userId),
    uniqueIndex("instances_name_idx").on(t.name),
    uniqueIndex("instances_agent_port_idx").on(t.agentPort),
    uniqueIndex("instances_ttyd_port_idx").on(t.ttydPort),
    uniqueIndex("instances_mc_port_idx").on(t.mcPort),
  ]
);

// ─── Backups ──────────────────────────────────────────────────────────────────

export const backups = pgTable(
  "backups",
  {
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
  },
  (t) => [index("backups_instance_id_idx").on(t.instanceId)]
);

// ─── Activity Logs ────────────────────────────────────────────────────────────

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instanceId: uuid("instance_id")
      .notNull()
      .references(() => instances.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("activity_logs_instance_id_idx").on(t.instanceId)]
);

// ─── Mission Control: Agents ─────────────────────────────────────────────────

export const mcAgentStatusEnum = pgEnum("mc_agent_status", [
  "active",
  "pending",
  "stopped",
]);

export const mcAgents = pgTable(
  "mc_agents",
  {
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
    agentSessionId: text("agent_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("mc_agents_instance_id_idx").on(t.instanceId)]
);

// ─── Mission Control: Board Groups ──────────────────────────────────────────

export const mcBoardGroups = pgTable(
  "mc_board_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instanceId: uuid("instance_id")
      .notNull()
      .references(() => instances.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("mc_board_groups_instance_id_idx").on(t.instanceId)]
);

// ─── Mission Control: Boards ─────────────────────────────────────────────────

export const mcBoards = pgTable(
  "mc_boards",
  {
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
  },
  (t) => [
    index("mc_boards_instance_id_idx").on(t.instanceId),
    index("mc_boards_board_group_id_idx").on(t.boardGroupId),
  ]
);

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

export const mcTasks = pgTable(
  "mc_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => mcBoards.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: mcTaskStatusEnum("mc_task_status").notNull().default("todo"),
    agentName: text("agent_name").notNull().default(""),
    priority: mcTaskPriorityEnum("mc_task_priority")
      .notNull()
      .default("medium"),
    assignee: text("assignee"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    agentSessionId: text("agent_session_id"),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    dispatchOutput: text("dispatch_output"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("mc_tasks_board_id_idx").on(t.boardId)]
);

// ─── Mission Control: Activity ───────────────────────────────────────────────

export const mcActivity = pgTable(
  "mc_activity",
  {
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
  },
  (t) => [index("mc_activity_instance_id_idx").on(t.instanceId)]
);

// ─── Mission Control: Approvals ──────────────────────────────────────────────

export const mcApprovalStatusEnum = pgEnum("mc_approval_status", [
  "pending",
  "approved",
  "denied",
]);

export const mcApprovals = pgTable(
  "mc_approvals",
  {
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
    agentApprovalId: text("agent_approval_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("mc_approvals_instance_id_idx").on(t.instanceId)]
);

// ─── Mission Control: Tags ──────────────────────────────────────────────────

export const mcTags = pgTable(
  "mc_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instanceId: uuid("instance_id")
      .notNull()
      .references(() => instances.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#6366f1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("mc_tags_instance_id_idx").on(t.instanceId),
    uniqueIndex("mc_tags_instance_name_idx").on(t.instanceId, t.name),
  ]
);

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

export const mcCustomFields = pgTable(
  "mc_custom_fields",
  {
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
  },
  (t) => [index("mc_custom_fields_instance_id_idx").on(t.instanceId)]
);

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

// ─── Rate Limiting ──────────────────────────────────────────────────────────

export const rateLimitEntries = pgTable(
  "rate_limit_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rate_limit_entries_key_ts_idx").on(t.key, t.timestamp)]
);
