CREATE TABLE `cargo_tracking_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cargo_id` int NOT NULL,
	`stage` varchar(50) NOT NULL,
	`photo_url` text NOT NULL,
	`notes` text,
	`registered_by` int,
	`registered_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cargo_tracking_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cargo_tracking_photos` ADD CONSTRAINT `cargo_tracking_photos_cargo_id_cargo_loads_id_fk` FOREIGN KEY (`cargo_id`) REFERENCES `cargo_loads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cargo_tracking_photos` ADD CONSTRAINT `cargo_tracking_photos_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;