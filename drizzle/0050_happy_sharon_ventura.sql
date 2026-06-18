CREATE TABLE `farm_geofences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`latitude` varchar(30) NOT NULL,
	`longitude` varchar(30) NOT NULL,
	`radius_meters` int NOT NULL DEFAULT 500,
	`equipment_id` int,
	`active` tinyint NOT NULL DEFAULT 1,
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `farm_geofences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `freight_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int,
	`geofence_id` int,
	`driver_collaborator_id` int,
	`driver_name` varchar(255),
	`status` enum('em_fazenda','em_transito','concluido','cancelado') NOT NULL DEFAULT 'em_fazenda',
	`arrived_farm_at` timestamp,
	`left_farm_at` timestamp,
	`returned_farm_at` timestamp,
	`start_lat` varchar(30),
	`start_lng` varchar(30),
	`end_lat` varchar(30),
	`end_lng` varchar(30),
	`distance_km` varchar(20),
	`cargo_load_id` int,
	`destination` varchar(255),
	`total_fuel_cost` varchar(20) DEFAULT '0',
	`total_maintenance_cost` varchar(20) DEFAULT '0',
	`total_cost` varchar(20) DEFAULT '0',
	`trajectory_json` text,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `freight_cycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotation_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`requester_id` int,
	`requester_name` varchar(255),
	`requester_phone` varchar(30),
	`requester_email` varchar(255),
	`items_json` text NOT NULL,
	`token` varchar(64) NOT NULL,
	`expires_at` bigint NOT NULL,
	`status` enum('ativa','respondida','expirada','cancelada') NOT NULL DEFAULT 'ativa',
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotation_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotation_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotation_request_id` int NOT NULL,
	`supplier_name` varchar(255) NOT NULL,
	`cnpj` varchar(30),
	`address` text,
	`seller_name` varchar(255),
	`seller_phone` varchar(30),
	`seller_email` varchar(255),
	`items_json` text NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotation_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `invoice_checked` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `invoice_checked_at` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `invoice_checked_by` int;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `invoice_checked_by_name` varchar(255);--> statement-breakpoint
ALTER TABLE `farm_geofences` ADD CONSTRAINT `farm_geofences_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `farm_geofences` ADD CONSTRAINT `farm_geofences_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `freight_cycles` ADD CONSTRAINT `freight_cycles_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `freight_cycles` ADD CONSTRAINT `freight_cycles_geofence_id_farm_geofences_id_fk` FOREIGN KEY (`geofence_id`) REFERENCES `farm_geofences`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `freight_cycles` ADD CONSTRAINT `freight_cycles_driver_collaborator_id_collaborators_id_fk` FOREIGN KEY (`driver_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `freight_cycles` ADD CONSTRAINT `freight_cycles_cargo_load_id_cargo_loads_id_fk` FOREIGN KEY (`cargo_load_id`) REFERENCES `cargo_loads`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_requests` ADD CONSTRAINT `quotation_requests_requester_id_collaborators_id_fk` FOREIGN KEY (`requester_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_requests` ADD CONSTRAINT `quotation_requests_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotation_responses` ADD CONSTRAINT `quotation_responses_quotation_request_id_quotation_requests_id_fk` FOREIGN KEY (`quotation_request_id`) REFERENCES `quotation_requests`(`id`) ON DELETE no action ON UPDATE no action;