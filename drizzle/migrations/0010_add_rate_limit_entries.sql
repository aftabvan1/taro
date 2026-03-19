-- Add rate limit entries table for DB-backed rate limiting
CREATE TABLE IF NOT EXISTS "rate_limit_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_entries_key_ts_idx" ON "rate_limit_entries" ("key", "timestamp");
