ALTER TABLE "instances" ADD COLUMN "terminal_token" text;--> statement-breakpoint
ALTER TABLE "instances" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "instances" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "activity_logs_instance_id_idx" ON "activity_logs" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "backups_instance_id_idx" ON "backups" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "instances_user_id_idx" ON "instances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mc_activity_instance_id_idx" ON "mc_activity" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "mc_agents_instance_id_idx" ON "mc_agents" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "mc_approvals_instance_id_idx" ON "mc_approvals" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "mc_board_groups_instance_id_idx" ON "mc_board_groups" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "mc_boards_instance_id_idx" ON "mc_boards" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "mc_boards_board_group_id_idx" ON "mc_boards" USING btree ("board_group_id");--> statement-breakpoint
CREATE INDEX "mc_custom_fields_instance_id_idx" ON "mc_custom_fields" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "mc_tags_instance_id_idx" ON "mc_tags" USING btree ("instance_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mc_tags_instance_name_idx" ON "mc_tags" USING btree ("instance_id","name");--> statement-breakpoint
CREATE INDEX "mc_tasks_board_id_idx" ON "mc_tasks" USING btree ("board_id");