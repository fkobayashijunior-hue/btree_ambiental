CREATE TABLE `cargo_destinations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` varchar(500),
	`city` varchar(100),
	`state` varchar(2),
	`notes` text,
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`created_by` int,
	CONSTRAINT `cargo_destinations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `destination_id` int;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `weight_kg` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `tracking_status` enum('aguardando','carregando','em_transito','pesagem_saida','descarregando','pesagem_chegada','finalizado') DEFAULT 'aguardando';--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `tracking_updated_at` timestamp;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `tracking_notes` text;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `weight_out_photo_url` text;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `weight_in_photo_url` text;--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD CONSTRAINT `cargo_destinations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_destination_id_cargo_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `cargo_destinations`(`id`) ON DELETE no action ON UPDATE no action;