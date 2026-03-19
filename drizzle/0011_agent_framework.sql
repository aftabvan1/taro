-- Add agent_framework enum and column, rename openclaw_* columns
CREATE TYPE "public"."agent_framework" AS ENUM('openclaw', 'hermes');

ALTER TABLE "instances" ADD COLUMN "agent_framework" "agent_framework" NOT NULL DEFAULT 'openclaw';

ALTER TABLE "instances" RENAME COLUMN "openclaw_port" TO "agent_port";

ALTER TABLE "mc_agents" RENAME COLUMN "openclaw_session_id" TO "agent_session_id";

ALTER TABLE "mc_tasks" RENAME COLUMN "openclaw_session_id" TO "agent_session_id";

ALTER TABLE "mc_approvals" RENAME COLUMN "openclaw_approval_id" TO "agent_approval_id";
