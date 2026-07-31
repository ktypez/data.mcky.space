CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text,
	`action` text NOT NULL,
	`target` text,
	`payload` text,
	`ip` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_created_at_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_action_idx` ON `audit_log` (`action`);--> statement-breakpoint
CREATE INDEX `audit_log_target_idx` ON `audit_log` (`target`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`shop_name` text NOT NULL,
	`address` text NOT NULL,
	`lat` real,
	`lng` real,
	`images` text DEFAULT '[]' NOT NULL,
	`badge` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `clients_updated_at_idx` ON `clients` (`updated_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`suggested` text NOT NULL,
	`original` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`suggested_photo` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `suggestions_client_id_idx` ON `suggestions` (`client_id`);--> statement-breakpoint
CREATE INDEX `suggestions_status_idx` ON `suggestions` (`status`);--> statement-breakpoint
CREATE INDEX `suggestions_client_status_idx` ON `suggestions` (`client_id`,`status`);