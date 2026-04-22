ALTER TABLE `cargo_loads` ADD `invoice_url` text;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `boleto_url` text;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `boleto_amount` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `boleto_due_date` timestamp;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `payment_receipt_url` text;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `payment_status` enum('sem_boleto','a_pagar','pago') DEFAULT 'sem_boleto';--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `paid_at` timestamp;