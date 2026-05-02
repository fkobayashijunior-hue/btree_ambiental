CREATE TABLE `cargo_weekly_closings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`week_start` timestamp NOT NULL,
	`week_end` timestamp NOT NULL,
	`total_loads` int NOT NULL DEFAULT 0,
	`total_weight_kg` varchar(20),
	`total_amount` varchar(20),
	`price_per_ton` varchar(20),
	`due_date` timestamp,
	`status` enum('aberto','fechado','pago','atrasado') NOT NULL DEFAULT 'aberto',
	`paid_at` timestamp,
	`notes` text,
	`closed_by` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `client_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`type` enum('proposta','contrato','nota_fiscal','boleto','recibo','outros') NOT NULL DEFAULT 'outros',
	`title` varchar(255) NOT NULL,
	`file_url` varchar(1000) NOT NULL,
	`file_type` varchar(50),
	`notes` text,
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `clients` ADD `price_per_ton` varchar(20);--> statement-breakpoint
ALTER TABLE `clients` ADD `residue_per_ton` varchar(20);--> statement-breakpoint
ALTER TABLE `clients` ADD `billing_cycle` enum('semanal','quinzenal','mensal') DEFAULT 'mensal';--> statement-breakpoint
ALTER TABLE `clients` ADD `billing_day_of_week` int DEFAULT 5;--> statement-breakpoint
ALTER TABLE `clients` ADD `payment_term_days` int DEFAULT 30;--> statement-breakpoint
ALTER TABLE `clients` ADD `documents_json` text;--> statement-breakpoint
ALTER TABLE `user_permissions` ADD `allowed_client_ids` text;--> statement-breakpoint
ALTER TABLE `user_permissions` ADD `allowed_work_location_ids` text;--> statement-breakpoint
ALTER TABLE `cargo_weekly_closings` ADD CONSTRAINT `cargo_weekly_closings_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cargo_weekly_closings` ADD CONSTRAINT `cargo_weekly_closings_closed_by_users_id_fk` FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_documents` ADD CONSTRAINT `client_documents_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_documents` ADD CONSTRAINT `client_documents_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;