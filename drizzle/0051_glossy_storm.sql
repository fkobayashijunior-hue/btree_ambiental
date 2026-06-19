CREATE TABLE `freight_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`worksite` varchar(255) NOT NULL,
	`destination` varchar(255) NOT NULL,
	`rate_per_ton` varchar(20) NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `freight_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `third_party_fuel` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`liters` varchar(20) NOT NULL,
	`price_per_liter` varchar(20) NOT NULL,
	`total` varchar(20) NOT NULL,
	`location` varchar(255),
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `third_party_fuel_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `equipment` ADD `is_third_party` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `equipment` ADD `third_party_owner` varchar(255);--> statement-breakpoint
ALTER TABLE `third_party_fuel` ADD CONSTRAINT `third_party_fuel_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `third_party_fuel` ADD CONSTRAINT `third_party_fuel_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_requests` DROP COLUMN `updated_at`;