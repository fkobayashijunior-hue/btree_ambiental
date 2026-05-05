ALTER TABLE `buyer_clients` ADD `price_per_unit` varchar(20);--> statement-breakpoint
ALTER TABLE `buyer_clients` ADD `unit` varchar(20) DEFAULT 'ton';