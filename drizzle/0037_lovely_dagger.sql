ALTER TABLE `fuel_suppliers` ADD `trade_name` varchar(255);--> statement-breakpoint
ALTER TABLE `fuel_suppliers` ADD `cnpj` varchar(20);--> statement-breakpoint
ALTER TABLE `fuel_suppliers` ADD `phone` varchar(30);--> statement-breakpoint
ALTER TABLE `fuel_suppliers` ADD `email` varchar(255);--> statement-breakpoint
ALTER TABLE `fuel_suppliers` ADD `contact_name` varchar(255);--> statement-breakpoint
ALTER TABLE `fuel_suppliers` ADD `address` text;--> statement-breakpoint
ALTER TABLE `fuel_suppliers` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `fuel_suppliers` ADD `state` varchar(2);--> statement-breakpoint
ALTER TABLE `fuel_suppliers` ADD `location_type` enum('simflor','astorga','postos') DEFAULT 'simflor' NOT NULL;