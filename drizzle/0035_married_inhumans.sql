CREATE TABLE `fuel_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`fuel_type` enum('diesel','gasolina','etanol','gnv') NOT NULL DEFAULT 'diesel',
	`price_per_liter` varchar(20) NOT NULL,
	`location` varchar(255),
	`work_location_id` int,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
