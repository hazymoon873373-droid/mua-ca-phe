CREATE TABLE `refresh_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`attempted_at` text NOT NULL,
	`source_date` text,
	`outcome` text NOT NULL
);
