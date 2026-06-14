CREATE TABLE `auto_freight_trips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`equipment_name` varchar(255),
	`traccar_device_id` int,
	`trip_date` varchar(10) NOT NULL,
	`start_time` varchar(30),
	`end_time` varchar(30),
	`distance_km` varchar(20),
	`duration_minutes` int,
	`start_address` text,
	`end_address` text,
	`fuel_cost` varchar(20) DEFAULT '0',
	`maintenance_cost` varchar(20) DEFAULT '0',
	`total_cost` varchar(20) DEFAULT '0',
	`status` enum('detectado','confirmado','ignorado') NOT NULL DEFAULT 'detectado',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auto_freight_trips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `is_buyer` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `cnpj_cpf` varchar(30);--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `inscricao_estadual` varchar(30);--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `phone` varchar(30);--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `email` varchar(255);--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `cep` varchar(10);--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `contact_person` varchar(255);--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `product` varchar(255);--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `payment_method` varchar(100);--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `price_per_unit` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD `unit` varchar(20) DEFAULT 'ton';--> statement-breakpoint
ALTER TABLE `equipment` ADD `category` enum('maquina','veiculo','caminhao') DEFAULT 'maquina';--> statement-breakpoint
ALTER TABLE `equipment` ADD `accumulated_hours` varchar(20) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `equipment` ADD `accumulated_km` varchar(20) DEFAULT '0';