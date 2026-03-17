ALTER TABLE "mc_agents" ADD COLUMN "role" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "mc_agents" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "mc_tasks" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "mc_tasks" ADD COLUMN "openclaw_session_id" text;--> statement-breakpoint
ALTER TABLE "mc_tasks" ADD COLUMN "dispatched_at" timestamp with time zone;