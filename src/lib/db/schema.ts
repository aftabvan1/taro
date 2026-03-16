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
