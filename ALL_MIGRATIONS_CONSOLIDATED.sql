-- ============================================
-- Migration: 0000_marvelous_otto_octavius.sql
-- ============================================
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);


-- ============================================
-- Migration: 0001_bouncy_black_bird.sql
-- ============================================
CREATE TABLE `attendance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`employment_type` enum('clt','terceirizado','diarista') NOT NULL,
	`daily_value` varchar(20) NOT NULL,
	`pix_key` varchar(255) NOT NULL,
	`function` varchar(100) NOT NULL,
	`observations` text,
	`payment_status` enum('pendente','pago','atrasado','cancelado') NOT NULL DEFAULT 'pendente',
	`paid_at` timestamp,
	`paid_by` int,
	`registered_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cargo_shipments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`truck_id` int NOT NULL,
	`driver_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`height` varchar(20) NOT NULL,
	`width` varchar(20) NOT NULL,
	`length` varchar(20) NOT NULL,
	`volume` varchar(20) NOT NULL,
	`destination` varchar(255),
	`invoice_number` varchar(100),
	`wood_type` varchar(100),
	`client` varchar(255),
	`images_urls` text,
	`registered_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cargo_shipments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`brand` varchar(100),
	`model` varchar(100),
	`year` int,
	`serial_number` varchar(100),
	`image_url` text,
	`status` enum('ativo','manutencao','inativo') NOT NULL DEFAULT 'ativo',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fuel_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`operator_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`fuel_type` enum('diesel','gasolina','mistura_2t') NOT NULL,
	`liters` varchar(20) NOT NULL,
	`total_value` varchar(20) NOT NULL,
	`price_per_liter` varchar(20),
	`odometer` varchar(20),
	`station` varchar(255),
	`invoice_url` text,
	`odometer_image_url` text,
	`registered_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fuel_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`profile_type` enum('administrativo','encarregado','mecanico','motosserrista','carregador','operador','motorista','terceirizado') NOT NULL,
	`cpf` varchar(14),
	`phone` varchar(20),
	`pix_key` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_paid_by_users_id_fk` FOREIGN KEY (`paid_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cargo_shipments` ADD CONSTRAINT `cargo_shipments_truck_id_equipment_id_fk` FOREIGN KEY (`truck_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cargo_shipments` ADD CONSTRAINT `cargo_shipments_driver_id_users_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cargo_shipments` ADD CONSTRAINT `cargo_shipments_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_type_id_equipment_types_id_fk` FOREIGN KEY (`type_id`) REFERENCES `equipment_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_records` ADD CONSTRAINT `fuel_records_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_records` ADD CONSTRAINT `fuel_records_operator_id_users_id_fk` FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_records` ADD CONSTRAINT `fuel_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;

-- ============================================
-- Migration: 0002_plain_squadron_supreme.sql
-- ============================================
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) NOT NULL DEFAULT 'email';--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);

-- ============================================
-- Migration: 0003_loving_whirlwind.sql
-- ============================================
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;

-- ============================================
-- Migration: 0004_flaky_purple_man.sql
-- ============================================
CREATE TABLE `biometric_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collaborator_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`check_in_time` timestamp NOT NULL,
	`check_out_time` timestamp,
	`location` varchar(255),
	`latitude` varchar(20),
	`longitude` varchar(20),
	`photo_url` text,
	`confidence` varchar(10),
	`registered_by` int NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `biometric_attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`cpf` varchar(14),
	`rg` varchar(20),
	`address` varchar(500),
	`city` varchar(100),
	`state` varchar(2),
	`zip_code` varchar(10),
	`photo_url` text,
	`face_descriptor` text,
	`role` enum('administrativo','encarregado','mecanico','motosserrista','carregador','operador','motorista','terceirizado') NOT NULL DEFAULT 'operador',
	`pix_key` varchar(255),
	`daily_rate` varchar(20),
	`employment_type` enum('clt','terceirizado','diarista') DEFAULT 'diarista',
	`shirt_size` enum('PP','P','M','G','GG','XGG'),
	`pants_size` varchar(10),
	`shoe_size` varchar(5),
	`boot_size` varchar(5),
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `collaborators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD CONSTRAINT `biometric_attendance_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD CONSTRAINT `biometric_attendance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collaborators` ADD CONSTRAINT `collaborators_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collaborators` ADD CONSTRAINT `collaborators_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

-- ============================================
-- Migration: 0005_remarkable_blazing_skull.sql
-- ============================================
CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_name` varchar(50) NOT NULL,
	`module` varchar(50) NOT NULL,
	`can_view` int NOT NULL DEFAULT 0,
	`can_create` int NOT NULL DEFAULT 0,
	`can_edit` int NOT NULL DEFAULT 0,
	`can_delete` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updated_by` int,
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(20) DEFAULT '#16a34a',
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `sectors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sectors` ADD CONSTRAINT `sectors_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

-- ============================================
-- Migration: 0006_giant_masked_marvel.sql
-- ============================================
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

-- ============================================
-- Migration: 0007_rich_annihilus.sql
-- ============================================
CREATE TABLE `client_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`reference_date` timestamp NOT NULL,
	`description` varchar(500),
	`volume_m3` varchar(20),
	`price_per_m3` varchar(20),
	`gross_amount` varchar(20) NOT NULL,
	`deductions` varchar(20) DEFAULT '0',
	`net_amount` varchar(20) NOT NULL,
	`status` enum('pendente','pago','atrasado','cancelado') NOT NULL DEFAULT 'pendente',
	`due_date` timestamp,
	`paid_at` timestamp,
	`pix_key` varchar(255),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_portal_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`access_code` varchar(64) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`last_access_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `client_portal_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_portal_access_access_code_unique` UNIQUE(`access_code`)
);
--> statement-breakpoint
CREATE TABLE `replanting_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`area` varchar(100),
	`species` varchar(100) DEFAULT 'Eucalipto',
	`quantity` int,
	`area_hectares` varchar(20),
	`notes` text,
	`photos_json` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `replanting_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `client_payments` ADD CONSTRAINT `client_payments_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_payments` ADD CONSTRAINT `client_payments_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_portal_access` ADD CONSTRAINT `client_portal_access_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_portal_access` ADD CONSTRAINT `client_portal_access_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `replanting_records` ADD CONSTRAINT `replanting_records_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `replanting_records` ADD CONSTRAINT `replanting_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

-- ============================================
-- Migration: 0008_busy_pete_wisdom.sql
-- ============================================
CREATE TABLE `collaborator_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collaborator_id` int NOT NULL,
	`type` enum('cnh','certificado','aso','contrato','rg','cpf','outros') NOT NULL DEFAULT 'outros',
	`title` varchar(255) NOT NULL,
	`file_url` varchar(1000) NOT NULL,
	`file_type` varchar(50),
	`issue_date` timestamp,
	`expiry_date` timestamp,
	`notes` text,
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collaborator_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment_maintenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`type` enum('manutencao','limpeza','afiacao','revisao','troca_oleo','outros') NOT NULL DEFAULT 'manutencao',
	`description` text NOT NULL,
	`performed_by` varchar(255),
	`cost` varchar(20),
	`next_maintenance_date` timestamp,
	`photos_json` text,
	`registered_by` int,
	`performed_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`photo_url` varchar(1000) NOT NULL,
	`caption` varchar(255),
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `collaborator_documents` ADD CONSTRAINT `collaborator_documents_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collaborator_documents` ADD CONSTRAINT `collaborator_documents_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_maintenance` ADD CONSTRAINT `equipment_maintenance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_photos` ADD CONSTRAINT `equipment_photos_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

-- ============================================
-- Migration: 0009_eminent_veda.sql
-- ============================================
CREATE TABLE `collaborator_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collaborator_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`employment_type_ca` enum('clt','terceirizado','diarista') NOT NULL DEFAULT 'diarista',
	`daily_value` varchar(20) NOT NULL DEFAULT '0',
	`pix_key` varchar(255),
	`activity` varchar(255),
	`observations` text,
	`payment_status_ca` enum('pendente','pago') NOT NULL DEFAULT 'pendente',
	`paid_at` timestamp,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collaborator_attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`part_id` int,
	`part_name` varchar(255) NOT NULL,
	`part_code` varchar(50),
	`part_category` varchar(100),
	`supplier` varchar(255),
	`unit` varchar(20) DEFAULT 'un',
	`quantity` int NOT NULL,
	`unit_cost` varchar(20),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('rascunho','enviado','aprovado','rejeitado','comprado') NOT NULL DEFAULT 'rascunho',
	`notes` text,
	`created_by` int,
	`approved_by` int,
	`approved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP FOREIGN KEY `biometric_attendance_collaborator_id_collaborators_id_fk`;
--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP FOREIGN KEY `biometric_attendance_registered_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `client_portal_access` DROP FOREIGN KEY `client_portal_access_created_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `biometric_attendance` MODIFY COLUMN `registered_by` int;--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD `check_in` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD `check_out` timestamp;--> statement-breakpoint
ALTER TABLE `clients` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `equipment` ADD `sector_id` int;--> statement-breakpoint
ALTER TABLE `parts` ADD `photo_url` text;--> statement-breakpoint
ALTER TABLE `vehicle_records` ADD `photo_url` text;--> statement-breakpoint
ALTER TABLE `collaborator_attendance` ADD CONSTRAINT `collaborator_attendance_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collaborator_attendance` ADD CONSTRAINT `collaborator_attendance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_order_id_purchase_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP COLUMN `date`;--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP COLUMN `check_in_time`;--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP COLUMN `check_out_time`;--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP COLUMN `photo_url`;

-- ============================================
-- Migration: 0010_glossy_banshee.sql
-- ============================================
CREATE TABLE `gps_device_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`traccar_device_id` int NOT NULL,
	`traccar_device_name` varchar(255),
	`traccar_unique_id` varchar(100),
	`active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gps_device_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gps_hours_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`gps_device_link_id` int,
	`date` timestamp NOT NULL,
	`hours_worked` varchar(20) NOT NULL,
	`hour_meter_start` varchar(20),
	`hour_meter_end` varchar(20),
	`distance_km` varchar(20),
	`source` enum('gps_auto','manual') NOT NULL DEFAULT 'gps_auto',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gps_hours_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `preventive_maintenance_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`status` enum('pendente','em_andamento','concluido','ignorado') NOT NULL DEFAULT 'pendente',
	`current_hours` varchar(20) NOT NULL,
	`due_hours` varchar(20) NOT NULL,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`resolved_at` timestamp,
	`resolved_by` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `preventive_maintenance_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `preventive_maintenance_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('troca_oleo','engraxamento','filtro_ar','filtro_combustivel','correia','revisao_geral','abastecimento','outros') NOT NULL DEFAULT 'outros',
	`interval_hours` int NOT NULL,
	`last_done_hours` varchar(20) DEFAULT '0',
	`last_done_at` timestamp,
	`alert_threshold_hours` int DEFAULT 10,
	`active` int NOT NULL DEFAULT 1,
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `preventive_maintenance_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `gps_device_links` ADD CONSTRAINT `gps_device_links_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gps_device_links` ADD CONSTRAINT `gps_device_links_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gps_hours_log` ADD CONSTRAINT `gps_hours_log_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gps_hours_log` ADD CONSTRAINT `gps_hours_log_gps_device_link_id_gps_device_links_id_fk` FOREIGN KEY (`gps_device_link_id`) REFERENCES `gps_device_links`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preventive_maintenance_alerts` ADD CONSTRAINT `preventive_maintenance_alerts_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preventive_maintenance_alerts` ADD CONSTRAINT `preventive_maintenance_alerts_plan_id_preventive_maintenance_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `preventive_maintenance_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preventive_maintenance_alerts` ADD CONSTRAINT `preventive_maintenance_alerts_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preventive_maintenance_plans` ADD CONSTRAINT `preventive_maintenance_plans_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preventive_maintenance_plans` ADD CONSTRAINT `preventive_maintenance_plans_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

-- ============================================
-- Migration: 0011_common_naoko.sql
-- ============================================
ALTER TABLE `equipment` ADD `license_plate` varchar(20);

-- ============================================
-- Migration: 0012_handy_black_crow.sql
-- ============================================
CREATE TABLE `cargo_destinations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` varchar(500),
	`city` varchar(100),
	`state` varchar(2),
	`notes` text,
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`created_by` int,
	CONSTRAINT `cargo_destinations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `destination_id` int;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `weight_kg` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `tracking_status` enum('aguardando','carregando','em_transito','pesagem_saida','descarregando','pesagem_chegada','finalizado') DEFAULT 'aguardando';--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `tracking_updated_at` timestamp;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `tracking_notes` text;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `weight_out_photo_url` text;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `weight_in_photo_url` text;--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD CONSTRAINT `cargo_destinations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_destination_id_cargo_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `cargo_destinations`(`id`) ON DELETE no action ON UPDATE no action;

-- ============================================
-- Migration: 0013_sudden_dreadnoughts.sql
-- ============================================
CREATE TABLE `maintenance_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`maintenance_id` int NOT NULL,
	`part_id` int,
	`part_code` varchar(50),
	`part_name` varchar(255) NOT NULL,
	`part_photo_url` text,
	`quantity` int NOT NULL DEFAULT 1,
	`unit` varchar(20) DEFAULT 'un',
	`unit_cost` varchar(20),
	`total_cost` varchar(20),
	`from_stock` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_template_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`part_id` int,
	`part_code` varchar(50),
	`part_name` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit` varchar(20) DEFAULT 'un',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_template_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('preventiva','corretiva','revisao') NOT NULL DEFAULT 'preventiva',
	`description` text,
	`estimated_cost` varchar(20),
	`active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parts_stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`part_id` int NOT NULL,
	`type` enum('entrada','saida') NOT NULL,
	`quantity` int NOT NULL,
	`reason` varchar(255),
	`reference_id` int,
	`reference_type` varchar(50),
	`unit_cost` varchar(20),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parts_stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `maintenance_parts` ADD CONSTRAINT `maintenance_parts_maintenance_id_equipment_maintenance_id_fk` FOREIGN KEY (`maintenance_id`) REFERENCES `equipment_maintenance`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_parts` ADD CONSTRAINT `maintenance_parts_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_template_parts` ADD CONSTRAINT `maintenance_template_parts_template_id_maintenance_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `maintenance_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_template_parts` ADD CONSTRAINT `maintenance_template_parts_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_templates` ADD CONSTRAINT `maintenance_templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parts_stock_movements` ADD CONSTRAINT `parts_stock_movements_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parts_stock_movements` ADD CONSTRAINT `parts_stock_movements_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

-- ============================================
-- Migration: 0014_true_morg.sql
-- ============================================
CREATE TABLE `user_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`modules` text,
	`profile` varchar(64) DEFAULT 'custom',
	`updated_by` int,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_permissions_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

-- ============================================
-- Migration: 0015_cool_toxin.sql
-- ============================================
CREATE TABLE `chainsaw_chain_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chain_type` varchar(20) NOT NULL,
	`event_type` enum('envio_campo','retorno_oficina','afiacao_concluida','baixa_estoque','entrada_estoque') NOT NULL,
	`quantity` int NOT NULL,
	`chainsaw_id` int,
	`registered_by` int,
	`notes` text,
	`event_date` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_chain_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chainsaw_chain_stock` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chain_type` varchar(20) NOT NULL,
	`sharpened_in_box` int NOT NULL DEFAULT 0,
	`in_field` int NOT NULL DEFAULT 0,
	`in_workshop` int NOT NULL DEFAULT 0,
	`total_stock` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chainsaw_chain_stock_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chainsaw_part_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`part_id` int NOT NULL,
	`type` enum('entrada','saida') NOT NULL,
	`quantity` varchar(20) NOT NULL,
	`reason` varchar(255),
	`service_order_id` int,
	`unit_cost` varchar(20),
	`registered_by` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_part_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chainsaw_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50),
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`unit` varchar(20) DEFAULT 'un',
	`current_stock` varchar(20) DEFAULT '0',
	`min_stock` varchar(20) DEFAULT '0',
	`unit_cost` varchar(20),
	`notes` text,
	`is_active` int DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chainsaw_service_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chainsaw_id` int NOT NULL,
	`problem_type` enum('motor_falhando','nao_liga','superaquecimento','vazamento','corrente_problema','sabre_problema','manutencao_preventiva','outro') NOT NULL,
	`problem_description` text,
	`priority` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
	`status` enum('aberta','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'aberta',
	`mechanic_id` int,
	`service_description` text,
	`completed_at` timestamp,
	`opened_by` int,
	`opened_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_service_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chainsaw_service_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`service_order_id` int NOT NULL,
	`part_id` int,
	`part_name` varchar(255) NOT NULL,
	`quantity` varchar(20) NOT NULL,
	`unit` varchar(20) DEFAULT 'un',
	`unit_cost` varchar(20),
	`from_stock` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_service_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chainsaws` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`brand` varchar(100),
	`model` varchar(100),
	`serial_number` varchar(100),
	`chain_type` varchar(20) DEFAULT '30',
	`status` enum('ativa','oficina','inativa') NOT NULL DEFAULT 'ativa',
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaws_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fuel_container_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`container_id` int NOT NULL,
	`event_type` enum('abastecimento','uso','transferencia') NOT NULL,
	`volume_liters` varchar(10) NOT NULL,
	`cost_per_liter` varchar(20),
	`total_cost` varchar(20),
	`oil2t_ml` varchar(10),
	`source_container_id` int,
	`chainsaw_id` int,
	`registered_by` int,
	`notes` text,
	`event_date` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_container_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fuel_containers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(30) DEFAULT 'vermelho',
	`type` enum('puro','mistura') NOT NULL,
	`capacity_liters` varchar(10) DEFAULT '20',
	`current_volume_liters` varchar(10) DEFAULT '0',
	`is_active` int DEFAULT 1,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_containers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chainsaw_chain_events` ADD CONSTRAINT `chainsaw_chain_events_chainsaw_id_chainsaws_id_fk` FOREIGN KEY (`chainsaw_id`) REFERENCES `chainsaws`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_chain_events` ADD CONSTRAINT `chainsaw_chain_events_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_part_movements` ADD CONSTRAINT `chainsaw_part_movements_part_id_chainsaw_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `chainsaw_parts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_part_movements` ADD CONSTRAINT `chainsaw_part_movements_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_parts` ADD CONSTRAINT `chainsaw_parts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` ADD CONSTRAINT `chainsaw_service_orders_chainsaw_id_chainsaws_id_fk` FOREIGN KEY (`chainsaw_id`) REFERENCES `chainsaws`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` ADD CONSTRAINT `chainsaw_service_orders_mechanic_id_users_id_fk` FOREIGN KEY (`mechanic_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` ADD CONSTRAINT `chainsaw_service_orders_opened_by_users_id_fk` FOREIGN KEY (`opened_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_service_parts` ADD CONSTRAINT `chainsaw_service_parts_service_order_id_chainsaw_service_orders_id_fk` FOREIGN KEY (`service_order_id`) REFERENCES `chainsaw_service_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaw_service_parts` ADD CONSTRAINT `chainsaw_service_parts_part_id_chainsaw_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `chainsaw_parts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chainsaws` ADD CONSTRAINT `chainsaws_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_container_id_fuel_containers_id_fk` FOREIGN KEY (`container_id`) REFERENCES `fuel_containers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_source_container_id_fuel_containers_id_fk` FOREIGN KEY (`source_container_id`) REFERENCES `fuel_containers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_chainsaw_id_chainsaws_id_fk` FOREIGN KEY (`chainsaw_id`) REFERENCES `chainsaws`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

-- ============================================
-- Migration: 0016_friendly_avengers.sql
-- ============================================
ALTER TABLE `cargo_destinations` ADD `client_id` int;--> statement-breakpoint
ALTER TABLE `cargo_destinations` ADD CONSTRAINT `cargo_destinations_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;

-- ============================================
-- Migration: 0017_violet_sleeper.sql
-- ============================================
ALTER TABLE `chainsaw_parts` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `chainsaws` ADD `image_url` text;

-- ============================================
-- Migration: 0018_clever_queen_noir.sql
-- ============================================
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

-- ============================================
-- Migration: 0019_fair_aqueduct.sql
-- ============================================
ALTER TABLE `collaborator_attendance` ADD `latitude` varchar(20);--> statement-breakpoint
ALTER TABLE `collaborator_attendance` ADD `longitude` varchar(20);--> statement-breakpoint
ALTER TABLE `collaborator_attendance` ADD `location_name` varchar(255);

-- ============================================
-- Migration: 0020_furry_scarlet_spider.sql
-- ============================================
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

-- ============================================
-- Migration: 0021_orange_nightcrawler.sql
-- ============================================
CREATE TABLE `gps_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`latitude` varchar(30) NOT NULL,
	`longitude` varchar(30) NOT NULL,
	`radius_meters` int NOT NULL DEFAULT 2000,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`notes` text,
	`created_by` int,
	`created_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gps_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `gps_locations` ADD CONSTRAINT `gps_locations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

-- ============================================
-- Migration: 0022_clammy_daredevil.sql
-- ============================================
CREATE TABLE `cargo_tracking_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cargo_id` int NOT NULL,
	`stage` varchar(50) NOT NULL,
	`photo_url` text NOT NULL,
	`notes` text,
	`registered_by` int,
	`registered_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cargo_tracking_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cargo_tracking_photos` ADD CONSTRAINT `cargo_tracking_photos_cargo_id_cargo_loads_id_fk` FOREIGN KEY (`cargo_id`) REFERENCES `cargo_loads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cargo_tracking_photos` ADD CONSTRAINT `cargo_tracking_photos_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

