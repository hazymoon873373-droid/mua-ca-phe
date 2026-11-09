CREATE TABLE `daily_prices` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`region_id` text NOT NULL,
	`price_vnd_kg` integer NOT NULL,
	`change_vnd_kg` integer,
	`fetched_at` text NOT NULL,
	`source_url` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_state` (
	`source` text PRIMARY KEY NOT NULL,
	`last_attempt` integer DEFAULT 0 NOT NULL,
	`last_success` text,
	`last_source_date` text,
	`error` text
);
