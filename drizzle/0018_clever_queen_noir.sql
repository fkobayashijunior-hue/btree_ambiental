CREATE TABLE `extra_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`category` enum('abastecimento','refeicao','compra_material','servico_terceiro','pedagio','outro') NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` varchar(20) NOT NULL,
	`payment_method` enum('dinheiro','pix','cartao','transferencia') NOT NULL DEFAULT 'dinheiro',
	`receipt_image_url` text,
	`notes` text,
	`registered_by` int,
	`registered_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `extra_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `extra_expenses` ADD CONSTRAINT `extra_expenses_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;