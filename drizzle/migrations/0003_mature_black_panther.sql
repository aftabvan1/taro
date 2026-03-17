CREATE TYPE "public"."mc_custom_field_type" AS ENUM('text', 'number', 'date', 'select');--> statement-breakpoint
ALTER TYPE "public"."mc_task_status" ADD VALUE 'inbox' BEFORE 'todo';--> statement-breakpoint
ALTER TYPE "public"."mc_task_status" ADD VALUE 'review' BEFORE 'done';--> statement-breakpoint
CREATE TABLE "mc_board_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mc_custom_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"name" text NOT NULL,
	"field_type" "mc_custom_field_type" DEFAULT 'text' NOT NULL,
	"options" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mc_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mc_task_custom_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mc_task_tags" (
	"task_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "mc_task_tags_task_id_tag_id_pk" PRIMARY KEY("task_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "mc_boards" ADD COLUMN "board_group_id" uuid;--> statement-breakpoint
ALTER TABLE "mc_board_groups" ADD CONSTRAINT "mc_board_groups_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_custom_fields" ADD CONSTRAINT "mc_custom_fields_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_tags" ADD CONSTRAINT "mc_tags_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_task_custom_field_values" ADD CONSTRAINT "mc_task_custom_field_values_task_id_mc_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."mc_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_task_custom_field_values" ADD CONSTRAINT "mc_task_custom_field_values_field_id_mc_custom_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."mc_custom_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_task_tags" ADD CONSTRAINT "mc_task_tags_task_id_mc_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."mc_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_task_tags" ADD CONSTRAINT "mc_task_tags_tag_id_mc_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."mc_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_boards" ADD CONSTRAINT "mc_boards_board_group_id_mc_board_groups_id_fk" FOREIGN KEY ("board_group_id") REFERENCES "public"."mc_board_groups"("id") ON DELETE set null ON UPDATE no action;