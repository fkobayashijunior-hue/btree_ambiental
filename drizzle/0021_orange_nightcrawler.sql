CREATE TABLE `gps_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`latitude` varchar(30) NOT NULL,
	`longitude` varchar(30) NOT NULL,
	`radius_meters` int NOT NULL DEFAULT 2000,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`notes` text,
	`created_by` int,
	`created_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gps_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `gps_locations` ADD CONSTRAINT `gps_locations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;