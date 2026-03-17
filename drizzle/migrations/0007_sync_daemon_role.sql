-- Create a restricted database role for the sync daemon running on Hetzner servers.
-- This role can only access mission-control tables and read limited columns from instances.
-- If the Hetzner server is compromised, the attacker cannot access the users table
-- or other sensitive platform data.
--
-- Usage: Set SYNC_DATABASE_URL in .env with this role's credentials.
-- Example: postgresql://sync_daemon:PASSWORD@host/db
--
-- NOTE: Run this manually if your Neon plan supports custom roles.
-- On Neon Free tier, custom roles may not be available — in that case,
-- SYNC_DATABASE_URL falls back to DATABASE_URL automatically.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sync_daemon') THEN
    CREATE ROLE sync_daemon WITH LOGIN PASSWORD 'CHANGE_ME_ON_SETUP';
  END IF;
END
$$;

-- Read-only access to instance config (provider/model settings)
GRANT SELECT (id, llm_provider, llm_model) ON instances TO sync_daemon;

-- Full CRUD on mission control tables (scoped by instance_id in app logic)
GRANT SELECT, INSERT, UPDATE ON mc_agents TO sync_daemon;
GRANT SELECT, INSERT, UPDATE ON mc_tasks TO sync_daemon;
GRANT SELECT, INSERT, UPDATE ON mc_activity TO sync_daemon;
GRANT SELECT, INSERT, UPDATE ON mc_approvals TO sync_daemon;
GRANT SELECT, INSERT, UPDATE ON mc_boards TO sync_daemon;
GRANT SELECT, INSERT, UPDATE ON mc_board_groups TO sync_daemon;
GRANT SELECT, INSERT, UPDATE ON mc_tags TO sync_daemon;
GRANT SELECT, INSERT, UPDATE ON mc_task_tags TO sync_daemon;
GRANT SELECT, INSERT, UPDATE ON mc_custom_fields TO sync_daemon;
GRANT SELECT, INSERT, UPDATE ON mc_task_custom_field_values TO sync_daemon;

-- No access to: users, backups, activity_logs
-- No DELETE permission on any table
