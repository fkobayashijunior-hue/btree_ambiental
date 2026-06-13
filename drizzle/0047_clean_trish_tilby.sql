CREATE TABLE `equipment_oil_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`hour_meter` varchar(20),
	`oil_type` enum('hidraulico','motor','transmissao','diferencial','outros') NOT NULL,
	`quantity_liters` varchar(20) NOT NULL,
	`brand` varchar(100),
	`supplier` varchar(255),
	`price_per_liter` varchar(20),
	`total_value` varchar(20),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `extra_expenses` ADD `equipment_id` int;--> statement-breakpoint
ALTER TABLE `financial_entries` ADD `equipment_id` int;--> statement-breakpoint
ALTER TABLE `financial_entries` ADD `equipment_name` varchar(255);--> statement-breakpoint
ALTER TABLE `machine_hours` ADD `source` enum('manual','gps') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `equipment_oil_records` ADD CONSTRAINT `equipment_oil_records_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_oil_records` ADD CONSTRAINT `equipment_oil_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;