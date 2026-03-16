CREATE TYPE "public"."mc_agent_status" AS ENUM('active', 'pending', 'stopped');--> statement-breakpoint
CREATE TYPE "public"."mc_approval_status" AS ENUM('pending', 'approved', 'denied');--> statement-breakpoint
CREATE TYPE "public"."mc_task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."mc_task_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "mc_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"agent_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mc_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mc_agent_status" "mc_agent_status" DEFAULT 'pending' NOT NULL,
	"tasks_completed" integer DEFAULT 0 NOT NULL,
	"last_active" timestamp with time zone DEFAULT now() NOT NULL,
	"cpu_usage" integer DEFAULT 0 NOT NULL,
	"memory_usage" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mc_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"action" text NOT NULL,
	"command" text NOT NULL,
	"mc_approval_status" "mc_approval_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mc_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mc_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"title" text NOT NULL,
	"mc_task_status" "mc_task_status" DEFAULT 'todo' NOT NULL,
	"agent_name" text DEFAULT '' NOT NULL,
	"mc_task_priority" "mc_task_priority" DEFAULT 'medium' NOT NULL,
	"assignee" text,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mc_activity" ADD CONSTRAINT "mc_activity_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_agents" ADD CONSTRAINT "mc_agents_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_approvals" ADD CONSTRAINT "mc_approvals_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_boards" ADD CONSTRAINT "mc_boards_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_tasks" ADD CONSTRAINT "mc_tasks_board_id_mc_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."mc_boards"("id") ON DELETE cascade ON UPDATE no action;