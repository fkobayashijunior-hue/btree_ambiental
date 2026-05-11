CREATE TABLE `fuel_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplier_id` int NOT NULL,
	`invoice_number` varchar(50) NOT NULL,
	`invoice_date` varchar(10) NOT NULL,
	`due_date` varchar(10) NOT NULL,
	`total_amount` varchar(20) NOT NULL,
	`liters` varchar(20),
	`price_per_liter` varchar(20),
	`fuel_type` enum('diesel','gasolina','etanol','gnv') DEFAULT 'diesel',
	`payment_method` varchar(50),
	`bank_name` varchar(100),
	`barcode_number` varchar(100),
	`status` enum('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente',
	`paid_at` varchar(10),
	`paid_amount` varchar(20),
	`transporter_name` varchar(255),
	`transporter_plate` varchar(20),
	`delivery_location` varchar(100),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `fuel_invoices` ADD CONSTRAINT `fuel_invoices_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;