CREATE TABLE `cargo_loads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`vehicle_id` int,
	`vehicle_plate` varchar(20),
	`driver_collaborator_id` int,
	`driver_name` varchar(255),
	`height_m` varchar(20) NOT NULL,
	`width_m` varchar(20) NOT NULL,
	`length_m` varchar(20) NOT NULL,
	`volume_m3` varchar(20) NOT NULL,
	`wood_type` varchar(100),
	`destination` varchar(255),
	`invoice_number` varchar(100),
	`client_id` int,
	`client_name` varchar(255),
	`photos_json` text,
	`notes` text,
	`status` enum('pendente','entregue','cancelado') NOT NULL DEFAULT 'pendente',
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cargo_loads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`document` varchar(20),
	`email` varchar(320),
	`phone` varchar(20),
	`address` varchar(500),
	`city` varchar(100),
	`state` varchar(2),
	`notes` text,
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machine_fuel` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`hour_meter` varchar(20),
	`fuel_type` enum('diesel','gasolina','mistura_2t','arla') NOT NULL,
	`liters` varchar(20) NOT NULL,
	`price_per_liter` varchar(20),
	`total_value` varchar(20),
	`supplier` varchar(255),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `machine_fuel_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machine_hours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`operator_collaborator_id` int,
	`date` timestamp NOT NULL,
	`start_hour_meter` varchar(20) NOT NULL,
	`end_hour_meter` varchar(20) NOT NULL,
	`hours_worked` varchar(20) NOT NULL,
	`activity` varchar(255),
	`location` varchar(255),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `machine_hours_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `machine_maintenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`hour_meter` varchar(20),
	`type` enum('preventiva','corretiva','revisao') NOT NULL DEFAULT 'corretiva',
	`service_type` enum('proprio','terceirizado') NOT NULL DEFAULT 'proprio',
	`mechanic_collaborator_id` int,
	`mechanic_name` varchar(255),
	`third_party_company` varchar(255),
	`parts_replaced` text,
	`labor_cost` varchar(20),
	`total_cost` varchar(20),
	`description` text,
	`next_maintenance_hours` varchar(20),
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machine_maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50),
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`unit` varchar(20) DEFAULT 'un',
	`stock_quantity` int NOT NULL DEFAULT 0,
	`min_stock` int DEFAULT 0,
	`unit_cost` varchar(20),
	`supplier` varchar(255),
	`notes` text,
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parts_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`part_id` int,
	`part_name` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`urgency` enum('baixa','media','alta') NOT NULL DEFAULT 'media',
	`equipment_id` int,
	`equipment_name` varchar(255),
	`reason` text,
	`status` enum('pendente','aprovado','rejeitado','comprado','entregue') NOT NULL DEFAULT 'pendente',
	`approved_by` int,
	`approved_at` timestamp,
	`rejection_reason` text,
	`estimated_cost` varchar(20),
	`requested_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parts_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`record_type` enum('abastecimento','manutencao','km') NOT NULL,
	`fuel_type` enum('diesel','gasolina','etanol','gnv'),
	`liters` varchar(20),
	`fuel_cost` varchar(20),
	`price_per_liter` varchar(20),
	`supplier` varchar(255),
	`odometer` varchar(20),
	`km_driven` varchar(20),
	`maintenance_type` varchar(255),
	`maintenance_cost` varchar(20),
	`service_type` enum('proprio','terceirizado'),
	`mechanic_name` varchar(255),
	`driver_collaborator_id` int,
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehicle_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_vehicle_id_equipment_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_driver_collaborator_id_collaborators_id_fk` FOREIGN KEY (`driver_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `machine_fuel` ADD CONSTRAINT `machine_fuel_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `machine_fuel` ADD CONSTRAINT `machine_fuel_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `machine_hours` ADD CONSTRAINT `machine_hours_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `machine_hours` ADD CONSTRAINT `machine_hours_operator_collaborator_id_collaborators_id_fk` FOREIGN KEY (`operator_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `machine_hours` ADD CONSTRAINT `machine_hours_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `machine_maintenance` ADD CONSTRAINT `machine_maintenance_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `machine_maintenance` ADD CONSTRAINT `machine_maintenance_mechanic_collaborator_id_collaborators_id_fk` FOREIGN KEY (`mechanic_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `machine_maintenance` ADD CONSTRAINT `machine_maintenance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parts` ADD CONSTRAINT `parts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parts_requests` ADD CONSTRAINT `parts_requests_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parts_requests` ADD CONSTRAINT `parts_requests_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parts_requests` ADD CONSTRAINT `parts_requests_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parts_requests` ADD CONSTRAINT `parts_requests_requested_by_users_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_records` ADD CONSTRAINT `vehicle_records_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_records` ADD CONSTRAINT `vehicle_records_driver_collaborator_id_collaborators_id_fk` FOREIGN KEY (`driver_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_records` ADD CONSTRAINT `vehicle_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;