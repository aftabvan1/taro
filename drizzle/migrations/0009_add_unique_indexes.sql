-- Add unique constraints on instance ports and name to prevent collisions
CREATE UNIQUE INDEX IF NOT EXISTS "instances_name_idx" ON "instances" ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "instances_agent_port_idx" ON "instances" ("agent_port");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "instances_ttyd_port_idx" ON "instances" ("ttyd_port");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "instances_mc_port_idx" ON "instances" ("mc_port");
