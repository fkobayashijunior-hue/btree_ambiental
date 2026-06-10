CREATE TABLE `third_party_contractors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`rate_per_m3` varchar(20) NOT NULL DEFAULT '0',
	`phone` varchar(30),
	`notes` text,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `client_id` int;--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `price_per_ton` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `price_per_m3` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `price_type` varchar(10) DEFAULT 'ton';--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `third_party_contractor` varchar(255);--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `third_party_cost` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `third_party_paid` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `third_party_paid_at` datetime;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `third_party_payment_notes` text;--> statement-breakpoint
ALTER TABLE `third_party_contractors` ADD CONSTRAINT `third_party_contractors_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;