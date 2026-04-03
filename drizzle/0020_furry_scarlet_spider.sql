CREATE TABLE `financial_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('receita','despesa') NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` varchar(20) NOT NULL,
	`date` timestamp NOT NULL,
	`reference_month` varchar(7),
	`payment_method` enum('dinheiro','pix','cartao','transferencia','boleto','cheque') NOT NULL DEFAULT 'pix',
	`status` enum('pendente','confirmado','cancelado') NOT NULL DEFAULT 'confirmado',
	`client_id` int,
	`client_name` varchar(255),
	`receipt_image_url` text,
	`notes` text,
	`registered_by` int,
	`registered_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;