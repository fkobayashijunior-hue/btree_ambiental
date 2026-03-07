CREATE TABLE `client_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`reference_date` timestamp NOT NULL,
	`description` varchar(500),
	`volume_m3` varchar(20),
	`price_per_m3` varchar(20),
	`gross_amount` varchar(20) NOT NULL,
	`deductions` varchar(20) DEFAULT '0',
	`net_amount` varchar(20) NOT NULL,
	`status` enum('pendente','pago','atrasado','cancelado') NOT NULL DEFAULT 'pendente',
	`due_date` timestamp,
	`paid_at` timestamp,
	`pix_key` varchar(255),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_portal_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`access_code` varchar(64) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`last_access_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `client_portal_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_portal_access_access_code_unique` UNIQUE(`access_code`)
);
--> statement-breakpoint
CREATE TABLE `replanting_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`area` varchar(100),
	`species` varchar(100) DEFAULT 'Eucalipto',
	`quantity` int,
	`area_hectares` varchar(20),
	`notes` text,
	`photos_json` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `replanting_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `client_payments` ADD CONSTRAINT `client_payments_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_payments` ADD CONSTRAINT `client_payments_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_portal_access` ADD CONSTRAINT `client_portal_access_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_portal_access` ADD CONSTRAINT `client_portal_access_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `replanting_records` ADD CONSTRAINT `replanting_records_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `replanting_records` ADD CONSTRAINT `replanting_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;