-- ================================================================
-- BTREE AMBIENTAL - Script SQL Consolidado SEGURO para Hostinger
-- Gerado em: 2026-04-10
-- 
-- INSTRUÇÕES:
-- 1. Execute este script no phpMyAdmin da Hostinger
-- 2. É seguro executar múltiplas vezes (idempotente)
-- 3. Tabelas existentes NÃO serão recriadas
-- 4. Colunas existentes NÃO serão duplicadas
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Tabela: users
CREATE TABLE IF NOT EXISTS `users` (
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

-- Tabela: attendance_records
CREATE TABLE IF NOT EXISTS `attendance_records` (
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

-- Tabela: cargo_shipments
CREATE TABLE IF NOT EXISTS `cargo_shipments` (
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

-- Tabela: equipment
CREATE TABLE IF NOT EXISTS `equipment` (
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

-- Tabela: equipment_types
CREATE TABLE IF NOT EXISTS `equipment_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_types_id` PRIMARY KEY(`id`)
);

-- Tabela: fuel_records
CREATE TABLE IF NOT EXISTS `fuel_records` (
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

-- Tabela: user_profiles
CREATE TABLE IF NOT EXISTS `user_profiles` (
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

-- FK: attendance_records_user_id_users_id_fk em attendance_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance_records' AND CONSTRAINT_NAME = 'attendance_records_user_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: attendance_records_paid_by_users_id_fk em attendance_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance_records' AND CONSTRAINT_NAME = 'attendance_records_paid_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_paid_by_users_id_fk` FOREIGN KEY (`paid_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: attendance_records_registered_by_users_id_fk em attendance_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance_records' AND CONSTRAINT_NAME = 'attendance_records_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_shipments_truck_id_equipment_id_fk em cargo_shipments
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_shipments' AND CONSTRAINT_NAME = 'cargo_shipments_truck_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_shipments` ADD CONSTRAINT `cargo_shipments_truck_id_equipment_id_fk` FOREIGN KEY (`truck_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_shipments_driver_id_users_id_fk em cargo_shipments
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_shipments' AND CONSTRAINT_NAME = 'cargo_shipments_driver_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_shipments` ADD CONSTRAINT `cargo_shipments_driver_id_users_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_shipments_registered_by_users_id_fk em cargo_shipments
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_shipments' AND CONSTRAINT_NAME = 'cargo_shipments_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_shipments` ADD CONSTRAINT `cargo_shipments_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: equipment_type_id_equipment_types_id_fk em equipment
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND CONSTRAINT_NAME = 'equipment_type_id_equipment_types_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `equipment` ADD CONSTRAINT `equipment_type_id_equipment_types_id_fk` FOREIGN KEY (`type_id`) REFERENCES `equipment_types`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_records_equipment_id_equipment_id_fk em fuel_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_records' AND CONSTRAINT_NAME = 'fuel_records_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_records` ADD CONSTRAINT `fuel_records_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_records_operator_id_users_id_fk em fuel_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_records' AND CONSTRAINT_NAME = 'fuel_records_operator_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_records` ADD CONSTRAINT `fuel_records_operator_id_users_id_fk` FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_records_registered_by_users_id_fk em fuel_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_records' AND CONSTRAINT_NAME = 'fuel_records_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_records` ADD CONSTRAINT `fuel_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: user_profiles_user_id_users_id_fk em user_profiles
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_profiles' AND CONSTRAINT_NAME = 'user_profiles_user_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- MODIFY em users
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);

-- MODIFY em users
ALTER TABLE `users` MODIFY COLUMN `name` text NOT NULL;

-- MODIFY em users
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;

-- MODIFY em users
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) NOT NULL DEFAULT 'email';

-- ADD COLUMN: password_hash em users
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `users` ADD `password_hash` varchar(255)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- UNIQUE: users_email_unique em users
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND CONSTRAINT_NAME = 'users_email_unique');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: password_reset_tokens
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);

-- FK: password_reset_tokens_user_id_users_id_fk em password_reset_tokens
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_reset_tokens' AND CONSTRAINT_NAME = 'password_reset_tokens_user_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: biometric_attendance
CREATE TABLE IF NOT EXISTS `biometric_attendance` (
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

-- Tabela: collaborators
CREATE TABLE IF NOT EXISTS `collaborators` (
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

-- FK: biometric_attendance_collaborator_id_collaborators_id_fk em biometric_attendance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND CONSTRAINT_NAME = 'biometric_attendance_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `biometric_attendance` ADD CONSTRAINT `biometric_attendance_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: biometric_attendance_registered_by_users_id_fk em biometric_attendance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND CONSTRAINT_NAME = 'biometric_attendance_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `biometric_attendance` ADD CONSTRAINT `biometric_attendance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: collaborators_user_id_users_id_fk em collaborators
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborators' AND CONSTRAINT_NAME = 'collaborators_user_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `collaborators` ADD CONSTRAINT `collaborators_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: collaborators_created_by_users_id_fk em collaborators
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborators' AND CONSTRAINT_NAME = 'collaborators_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `collaborators` ADD CONSTRAINT `collaborators_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: role_permissions
CREATE TABLE IF NOT EXISTS `role_permissions` (
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

-- Tabela: sectors
CREATE TABLE IF NOT EXISTS `sectors` (
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

-- FK: role_permissions_updated_by_users_id_fk em role_permissions
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permissions' AND CONSTRAINT_NAME = 'role_permissions_updated_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: sectors_created_by_users_id_fk em sectors
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sectors' AND CONSTRAINT_NAME = 'sectors_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `sectors` ADD CONSTRAINT `sectors_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: cargo_loads
CREATE TABLE IF NOT EXISTS `cargo_loads` (
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

-- Tabela: clients
CREATE TABLE IF NOT EXISTS `clients` (
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

-- Tabela: machine_fuel
CREATE TABLE IF NOT EXISTS `machine_fuel` (
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

-- Tabela: machine_hours
CREATE TABLE IF NOT EXISTS `machine_hours` (
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

-- Tabela: machine_maintenance
CREATE TABLE IF NOT EXISTS `machine_maintenance` (
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

-- Tabela: parts
CREATE TABLE IF NOT EXISTS `parts` (
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

-- Tabela: parts_requests
CREATE TABLE IF NOT EXISTS `parts_requests` (
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

-- Tabela: vehicle_records
CREATE TABLE IF NOT EXISTS `vehicle_records` (
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

-- FK: cargo_loads_vehicle_id_equipment_id_fk em cargo_loads
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND CONSTRAINT_NAME = 'cargo_loads_vehicle_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_vehicle_id_equipment_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_loads_driver_collaborator_id_collaborators_id_fk em cargo_loads
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND CONSTRAINT_NAME = 'cargo_loads_driver_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_driver_collaborator_id_collaborators_id_fk` FOREIGN KEY (`driver_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_loads_client_id_clients_id_fk em cargo_loads
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND CONSTRAINT_NAME = 'cargo_loads_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_loads_registered_by_users_id_fk em cargo_loads
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND CONSTRAINT_NAME = 'cargo_loads_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: clients_created_by_users_id_fk em clients
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND CONSTRAINT_NAME = 'clients_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `clients` ADD CONSTRAINT `clients_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_fuel_equipment_id_equipment_id_fk em machine_fuel
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_fuel' AND CONSTRAINT_NAME = 'machine_fuel_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_fuel` ADD CONSTRAINT `machine_fuel_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_fuel_registered_by_users_id_fk em machine_fuel
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_fuel' AND CONSTRAINT_NAME = 'machine_fuel_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_fuel` ADD CONSTRAINT `machine_fuel_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_hours_equipment_id_equipment_id_fk em machine_hours
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_hours' AND CONSTRAINT_NAME = 'machine_hours_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_hours` ADD CONSTRAINT `machine_hours_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_hours_operator_collaborator_id_collaborators_id_fk em machine_hours
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_hours' AND CONSTRAINT_NAME = 'machine_hours_operator_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_hours` ADD CONSTRAINT `machine_hours_operator_collaborator_id_collaborators_id_fk` FOREIGN KEY (`operator_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_hours_registered_by_users_id_fk em machine_hours
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_hours' AND CONSTRAINT_NAME = 'machine_hours_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_hours` ADD CONSTRAINT `machine_hours_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_maintenance_equipment_id_equipment_id_fk em machine_maintenance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_maintenance' AND CONSTRAINT_NAME = 'machine_maintenance_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_maintenance` ADD CONSTRAINT `machine_maintenance_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_maintenance_mechanic_collaborator_id_collaborators_id_fk em machine_maintenance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_maintenance' AND CONSTRAINT_NAME = 'machine_maintenance_mechanic_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_maintenance` ADD CONSTRAINT `machine_maintenance_mechanic_collaborator_id_collaborators_id_fk` FOREIGN KEY (`mechanic_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_maintenance_registered_by_users_id_fk em machine_maintenance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_maintenance' AND CONSTRAINT_NAME = 'machine_maintenance_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_maintenance` ADD CONSTRAINT `machine_maintenance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_created_by_users_id_fk em parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts' AND CONSTRAINT_NAME = 'parts_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts` ADD CONSTRAINT `parts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_requests_part_id_parts_id_fk em parts_requests
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts_requests' AND CONSTRAINT_NAME = 'parts_requests_part_id_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts_requests` ADD CONSTRAINT `parts_requests_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_requests_equipment_id_equipment_id_fk em parts_requests
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts_requests' AND CONSTRAINT_NAME = 'parts_requests_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts_requests` ADD CONSTRAINT `parts_requests_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_requests_approved_by_users_id_fk em parts_requests
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts_requests' AND CONSTRAINT_NAME = 'parts_requests_approved_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts_requests` ADD CONSTRAINT `parts_requests_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_requests_requested_by_users_id_fk em parts_requests
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts_requests' AND CONSTRAINT_NAME = 'parts_requests_requested_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts_requests` ADD CONSTRAINT `parts_requests_requested_by_users_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: vehicle_records_equipment_id_equipment_id_fk em vehicle_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_records' AND CONSTRAINT_NAME = 'vehicle_records_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `vehicle_records` ADD CONSTRAINT `vehicle_records_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: vehicle_records_driver_collaborator_id_collaborators_id_fk em vehicle_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_records' AND CONSTRAINT_NAME = 'vehicle_records_driver_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `vehicle_records` ADD CONSTRAINT `vehicle_records_driver_collaborator_id_collaborators_id_fk` FOREIGN KEY (`driver_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: vehicle_records_registered_by_users_id_fk em vehicle_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_records' AND CONSTRAINT_NAME = 'vehicle_records_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `vehicle_records` ADD CONSTRAINT `vehicle_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: client_payments
CREATE TABLE IF NOT EXISTS `client_payments` (
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

-- Tabela: client_portal_access
CREATE TABLE IF NOT EXISTS `client_portal_access` (
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

-- Tabela: replanting_records
CREATE TABLE IF NOT EXISTS `replanting_records` (
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

-- FK: client_payments_client_id_clients_id_fk em client_payments
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_payments' AND CONSTRAINT_NAME = 'client_payments_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_payments` ADD CONSTRAINT `client_payments_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: client_payments_registered_by_users_id_fk em client_payments
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_payments' AND CONSTRAINT_NAME = 'client_payments_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_payments` ADD CONSTRAINT `client_payments_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: client_portal_access_client_id_clients_id_fk em client_portal_access
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_portal_access' AND CONSTRAINT_NAME = 'client_portal_access_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_portal_access` ADD CONSTRAINT `client_portal_access_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: client_portal_access_created_by_users_id_fk em client_portal_access
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_portal_access' AND CONSTRAINT_NAME = 'client_portal_access_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_portal_access` ADD CONSTRAINT `client_portal_access_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: replanting_records_client_id_clients_id_fk em replanting_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'replanting_records' AND CONSTRAINT_NAME = 'replanting_records_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `replanting_records` ADD CONSTRAINT `replanting_records_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: replanting_records_registered_by_users_id_fk em replanting_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'replanting_records' AND CONSTRAINT_NAME = 'replanting_records_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `replanting_records` ADD CONSTRAINT `replanting_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: collaborator_documents
CREATE TABLE IF NOT EXISTS `collaborator_documents` (
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

-- Tabela: equipment_maintenance
CREATE TABLE IF NOT EXISTS `equipment_maintenance` (
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

-- Tabela: equipment_photos
CREATE TABLE IF NOT EXISTS `equipment_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`photo_url` varchar(1000) NOT NULL,
	`caption` varchar(255),
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_photos_id` PRIMARY KEY(`id`)
);

-- FK: collaborator_documents_collaborator_id_collaborators_id_fk em collaborator_documents
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_documents' AND CONSTRAINT_NAME = 'collaborator_documents_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `collaborator_documents` ADD CONSTRAINT `collaborator_documents_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: collaborator_documents_uploaded_by_users_id_fk em collaborator_documents
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_documents' AND CONSTRAINT_NAME = 'collaborator_documents_uploaded_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `collaborator_documents` ADD CONSTRAINT `collaborator_documents_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: equipment_maintenance_registered_by_users_id_fk em equipment_maintenance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment_maintenance' AND CONSTRAINT_NAME = 'equipment_maintenance_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `equipment_maintenance` ADD CONSTRAINT `equipment_maintenance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: equipment_photos_uploaded_by_users_id_fk em equipment_photos
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment_photos' AND CONSTRAINT_NAME = 'equipment_photos_uploaded_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `equipment_photos` ADD CONSTRAINT `equipment_photos_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: collaborator_attendance
CREATE TABLE IF NOT EXISTS `collaborator_attendance` (
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

-- Tabela: purchase_order_items
CREATE TABLE IF NOT EXISTS `purchase_order_items` (
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

-- Tabela: purchase_orders
CREATE TABLE IF NOT EXISTS `purchase_orders` (
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

-- DROP FK: biometric_attendance_collaborator_id_collaborators_id_fk de biometric_attendance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND CONSTRAINT_NAME = 'biometric_attendance_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `biometric_attendance` DROP FOREIGN KEY `biometric_attendance_collaborator_id_collaborators_id_fk`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- DROP FK: biometric_attendance_registered_by_users_id_fk de biometric_attendance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND CONSTRAINT_NAME = 'biometric_attendance_registered_by_users_id_fk');
SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `biometric_attendance` DROP FOREIGN KEY `biometric_attendance_registered_by_users_id_fk`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- DROP FK: client_portal_access_created_by_users_id_fk de client_portal_access
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_portal_access' AND CONSTRAINT_NAME = 'client_portal_access_created_by_users_id_fk');
SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `client_portal_access` DROP FOREIGN KEY `client_portal_access_created_by_users_id_fk`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- MODIFY em biometric_attendance
ALTER TABLE `biometric_attendance` MODIFY COLUMN `registered_by` int;

-- ADD COLUMN: check_in em biometric_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND COLUMN_NAME = 'check_in');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `biometric_attendance` ADD `check_in` timestamp NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: check_out em biometric_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND COLUMN_NAME = 'check_out');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `biometric_attendance` ADD `check_out` timestamp', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: password em clients
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'password');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `clients` ADD `password` varchar(255)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: sector_id em equipment
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'sector_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `equipment` ADD `sector_id` int', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: photo_url em parts
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts' AND COLUMN_NAME = 'photo_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `parts` ADD `photo_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: photo_url em vehicle_records
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_records' AND COLUMN_NAME = 'photo_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `vehicle_records` ADD `photo_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: collaborator_attendance_collaborator_id_collaborators_id_fk em collaborator_attendance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND CONSTRAINT_NAME = 'collaborator_attendance_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `collaborator_attendance` ADD CONSTRAINT `collaborator_attendance_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: collaborator_attendance_registered_by_users_id_fk em collaborator_attendance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND CONSTRAINT_NAME = 'collaborator_attendance_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `collaborator_attendance` ADD CONSTRAINT `collaborator_attendance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: purchase_order_items_order_id_purchase_orders_id_fk em purchase_order_items
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_order_items' AND CONSTRAINT_NAME = 'purchase_order_items_order_id_purchase_orders_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_order_id_purchase_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: purchase_order_items_part_id_parts_id_fk em purchase_order_items
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_order_items' AND CONSTRAINT_NAME = 'purchase_order_items_part_id_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: purchase_orders_created_by_users_id_fk em purchase_orders
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_orders' AND CONSTRAINT_NAME = 'purchase_orders_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: purchase_orders_approved_by_users_id_fk em purchase_orders
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_orders' AND CONSTRAINT_NAME = 'purchase_orders_approved_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- DROP COLUMN: date de biometric_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND COLUMN_NAME = 'date');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `biometric_attendance` DROP COLUMN `date`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- DROP COLUMN: check_in_time de biometric_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND COLUMN_NAME = 'check_in_time');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `biometric_attendance` DROP COLUMN `check_in_time`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- DROP COLUMN: check_out_time de biometric_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND COLUMN_NAME = 'check_out_time');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `biometric_attendance` DROP COLUMN `check_out_time`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- DROP COLUMN: photo_url de biometric_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND COLUMN_NAME = 'photo_url');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `biometric_attendance` DROP COLUMN `photo_url`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: gps_device_links
CREATE TABLE IF NOT EXISTS `gps_device_links` (
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

-- Tabela: gps_hours_log
CREATE TABLE IF NOT EXISTS `gps_hours_log` (
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

-- Tabela: preventive_maintenance_alerts
CREATE TABLE IF NOT EXISTS `preventive_maintenance_alerts` (
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

-- Tabela: preventive_maintenance_plans
CREATE TABLE IF NOT EXISTS `preventive_maintenance_plans` (
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

-- FK: gps_device_links_equipment_id_equipment_id_fk em gps_device_links
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gps_device_links' AND CONSTRAINT_NAME = 'gps_device_links_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `gps_device_links` ADD CONSTRAINT `gps_device_links_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: gps_device_links_created_by_users_id_fk em gps_device_links
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gps_device_links' AND CONSTRAINT_NAME = 'gps_device_links_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `gps_device_links` ADD CONSTRAINT `gps_device_links_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: gps_hours_log_equipment_id_equipment_id_fk em gps_hours_log
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gps_hours_log' AND CONSTRAINT_NAME = 'gps_hours_log_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `gps_hours_log` ADD CONSTRAINT `gps_hours_log_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: gps_hours_log_gps_device_link_id_gps_device_links_id_fk em gps_hours_log
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gps_hours_log' AND CONSTRAINT_NAME = 'gps_hours_log_gps_device_link_id_gps_device_links_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `gps_hours_log` ADD CONSTRAINT `gps_hours_log_gps_device_link_id_gps_device_links_id_fk` FOREIGN KEY (`gps_device_link_id`) REFERENCES `gps_device_links`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: preventive_maintenance_alerts_equipment_id_equipment_id_fk em preventive_maintenance_alerts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'preventive_maintenance_alerts' AND CONSTRAINT_NAME = 'preventive_maintenance_alerts_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `preventive_maintenance_alerts` ADD CONSTRAINT `preventive_maintenance_alerts_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: preventive_maintenance_alerts_plan_id_preventive_maintenance_plans_id_fk em preventive_maintenance_alerts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'preventive_maintenance_alerts' AND CONSTRAINT_NAME = 'preventive_maintenance_alerts_plan_id_preventive_maintenance_plans_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `preventive_maintenance_alerts` ADD CONSTRAINT `preventive_maintenance_alerts_plan_id_preventive_maintenance_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `preventive_maintenance_plans`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: preventive_maintenance_alerts_resolved_by_users_id_fk em preventive_maintenance_alerts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'preventive_maintenance_alerts' AND CONSTRAINT_NAME = 'preventive_maintenance_alerts_resolved_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `preventive_maintenance_alerts` ADD CONSTRAINT `preventive_maintenance_alerts_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: preventive_maintenance_plans_equipment_id_equipment_id_fk em preventive_maintenance_plans
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'preventive_maintenance_plans' AND CONSTRAINT_NAME = 'preventive_maintenance_plans_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `preventive_maintenance_plans` ADD CONSTRAINT `preventive_maintenance_plans_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: preventive_maintenance_plans_created_by_users_id_fk em preventive_maintenance_plans
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'preventive_maintenance_plans' AND CONSTRAINT_NAME = 'preventive_maintenance_plans_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `preventive_maintenance_plans` ADD CONSTRAINT `preventive_maintenance_plans_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: license_plate em equipment
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'license_plate');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `equipment` ADD `license_plate` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: cargo_destinations
CREATE TABLE IF NOT EXISTS `cargo_destinations` (
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

-- ADD COLUMN: destination_id em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'destination_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `destination_id` int', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: weight_kg em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_kg');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `weight_kg` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: tracking_status em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'tracking_status');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `tracking_status` enum(\'aguardando\',\'carregando\',\'em_transito\',\'pesagem_saida\',\'descarregando\',\'pesagem_chegada\',\'finalizado\') DEFAULT \'aguardando\'', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: tracking_updated_at em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'tracking_updated_at');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `tracking_updated_at` timestamp', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: tracking_notes em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'tracking_notes');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `tracking_notes` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: weight_out_photo_url em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_out_photo_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `weight_out_photo_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: weight_in_photo_url em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_in_photo_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `weight_in_photo_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_destinations_created_by_users_id_fk em cargo_destinations
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_destinations' AND CONSTRAINT_NAME = 'cargo_destinations_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_destinations` ADD CONSTRAINT `cargo_destinations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_loads_destination_id_cargo_destinations_id_fk em cargo_loads
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND CONSTRAINT_NAME = 'cargo_loads_destination_id_cargo_destinations_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_destination_id_cargo_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `cargo_destinations`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: maintenance_parts
CREATE TABLE IF NOT EXISTS `maintenance_parts` (
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

-- Tabela: maintenance_template_parts
CREATE TABLE IF NOT EXISTS `maintenance_template_parts` (
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

-- Tabela: maintenance_templates
CREATE TABLE IF NOT EXISTS `maintenance_templates` (
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

-- Tabela: parts_stock_movements
CREATE TABLE IF NOT EXISTS `parts_stock_movements` (
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

-- FK: maintenance_parts_maintenance_id_equipment_maintenance_id_fk em maintenance_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_parts' AND CONSTRAINT_NAME = 'maintenance_parts_maintenance_id_equipment_maintenance_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `maintenance_parts` ADD CONSTRAINT `maintenance_parts_maintenance_id_equipment_maintenance_id_fk` FOREIGN KEY (`maintenance_id`) REFERENCES `equipment_maintenance`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: maintenance_parts_part_id_parts_id_fk em maintenance_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_parts' AND CONSTRAINT_NAME = 'maintenance_parts_part_id_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `maintenance_parts` ADD CONSTRAINT `maintenance_parts_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE set null ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: maintenance_template_parts_template_id_maintenance_templates_id_fk em maintenance_template_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_template_parts' AND CONSTRAINT_NAME = 'maintenance_template_parts_template_id_maintenance_templates_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `maintenance_template_parts` ADD CONSTRAINT `maintenance_template_parts_template_id_maintenance_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `maintenance_templates`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: maintenance_template_parts_part_id_parts_id_fk em maintenance_template_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_template_parts' AND CONSTRAINT_NAME = 'maintenance_template_parts_part_id_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `maintenance_template_parts` ADD CONSTRAINT `maintenance_template_parts_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE set null ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: maintenance_templates_created_by_users_id_fk em maintenance_templates
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_templates' AND CONSTRAINT_NAME = 'maintenance_templates_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `maintenance_templates` ADD CONSTRAINT `maintenance_templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_stock_movements_part_id_parts_id_fk em parts_stock_movements
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts_stock_movements' AND CONSTRAINT_NAME = 'parts_stock_movements_part_id_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts_stock_movements` ADD CONSTRAINT `parts_stock_movements_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_stock_movements_registered_by_users_id_fk em parts_stock_movements
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts_stock_movements' AND CONSTRAINT_NAME = 'parts_stock_movements_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts_stock_movements` ADD CONSTRAINT `parts_stock_movements_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: user_permissions
CREATE TABLE IF NOT EXISTS `user_permissions` (
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

-- FK: user_permissions_user_id_users_id_fk em user_permissions
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_permissions' AND CONSTRAINT_NAME = 'user_permissions_user_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: user_permissions_updated_by_users_id_fk em user_permissions
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_permissions' AND CONSTRAINT_NAME = 'user_permissions_updated_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: chainsaw_chain_events
CREATE TABLE IF NOT EXISTS `chainsaw_chain_events` (
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

-- Tabela: chainsaw_chain_stock
CREATE TABLE IF NOT EXISTS `chainsaw_chain_stock` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chain_type` varchar(20) NOT NULL,
	`sharpened_in_box` int NOT NULL DEFAULT 0,
	`in_field` int NOT NULL DEFAULT 0,
	`in_workshop` int NOT NULL DEFAULT 0,
	`total_stock` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chainsaw_chain_stock_id` PRIMARY KEY(`id`)
);

-- Tabela: chainsaw_part_movements
CREATE TABLE IF NOT EXISTS `chainsaw_part_movements` (
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

-- Tabela: chainsaw_parts
CREATE TABLE IF NOT EXISTS `chainsaw_parts` (
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

-- Tabela: chainsaw_service_orders
CREATE TABLE IF NOT EXISTS `chainsaw_service_orders` (
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

-- Tabela: chainsaw_service_parts
CREATE TABLE IF NOT EXISTS `chainsaw_service_parts` (
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

-- Tabela: chainsaws
CREATE TABLE IF NOT EXISTS `chainsaws` (
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

-- Tabela: fuel_container_events
CREATE TABLE IF NOT EXISTS `fuel_container_events` (
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

-- Tabela: fuel_containers
CREATE TABLE IF NOT EXISTS `fuel_containers` (
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

-- FK: chainsaw_chain_events_chainsaw_id_chainsaws_id_fk em chainsaw_chain_events
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_chain_events' AND CONSTRAINT_NAME = 'chainsaw_chain_events_chainsaw_id_chainsaws_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_chain_events` ADD CONSTRAINT `chainsaw_chain_events_chainsaw_id_chainsaws_id_fk` FOREIGN KEY (`chainsaw_id`) REFERENCES `chainsaws`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_chain_events_registered_by_users_id_fk em chainsaw_chain_events
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_chain_events' AND CONSTRAINT_NAME = 'chainsaw_chain_events_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_chain_events` ADD CONSTRAINT `chainsaw_chain_events_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_part_movements_part_id_chainsaw_parts_id_fk em chainsaw_part_movements
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_part_movements' AND CONSTRAINT_NAME = 'chainsaw_part_movements_part_id_chainsaw_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_part_movements` ADD CONSTRAINT `chainsaw_part_movements_part_id_chainsaw_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `chainsaw_parts`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_part_movements_registered_by_users_id_fk em chainsaw_part_movements
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_part_movements' AND CONSTRAINT_NAME = 'chainsaw_part_movements_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_part_movements` ADD CONSTRAINT `chainsaw_part_movements_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_parts_created_by_users_id_fk em chainsaw_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_parts' AND CONSTRAINT_NAME = 'chainsaw_parts_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_parts` ADD CONSTRAINT `chainsaw_parts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_service_orders_chainsaw_id_chainsaws_id_fk em chainsaw_service_orders
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_service_orders' AND CONSTRAINT_NAME = 'chainsaw_service_orders_chainsaw_id_chainsaws_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_service_orders` ADD CONSTRAINT `chainsaw_service_orders_chainsaw_id_chainsaws_id_fk` FOREIGN KEY (`chainsaw_id`) REFERENCES `chainsaws`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_service_orders_mechanic_id_users_id_fk em chainsaw_service_orders
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_service_orders' AND CONSTRAINT_NAME = 'chainsaw_service_orders_mechanic_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_service_orders` ADD CONSTRAINT `chainsaw_service_orders_mechanic_id_users_id_fk` FOREIGN KEY (`mechanic_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_service_orders_opened_by_users_id_fk em chainsaw_service_orders
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_service_orders' AND CONSTRAINT_NAME = 'chainsaw_service_orders_opened_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_service_orders` ADD CONSTRAINT `chainsaw_service_orders_opened_by_users_id_fk` FOREIGN KEY (`opened_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_service_parts_service_order_id_chainsaw_service_orders_id_fk em chainsaw_service_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_service_parts' AND CONSTRAINT_NAME = 'chainsaw_service_parts_service_order_id_chainsaw_service_orders_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_service_parts` ADD CONSTRAINT `chainsaw_service_parts_service_order_id_chainsaw_service_orders_id_fk` FOREIGN KEY (`service_order_id`) REFERENCES `chainsaw_service_orders`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_service_parts_part_id_chainsaw_parts_id_fk em chainsaw_service_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_service_parts' AND CONSTRAINT_NAME = 'chainsaw_service_parts_part_id_chainsaw_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_service_parts` ADD CONSTRAINT `chainsaw_service_parts_part_id_chainsaw_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `chainsaw_parts`(`id`) ON DELETE set null ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaws_created_by_users_id_fk em chainsaws
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaws' AND CONSTRAINT_NAME = 'chainsaws_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaws` ADD CONSTRAINT `chainsaws_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_container_events_container_id_fuel_containers_id_fk em fuel_container_events
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_container_events' AND CONSTRAINT_NAME = 'fuel_container_events_container_id_fuel_containers_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_container_id_fuel_containers_id_fk` FOREIGN KEY (`container_id`) REFERENCES `fuel_containers`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_container_events_source_container_id_fuel_containers_id_fk em fuel_container_events
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_container_events' AND CONSTRAINT_NAME = 'fuel_container_events_source_container_id_fuel_containers_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_source_container_id_fuel_containers_id_fk` FOREIGN KEY (`source_container_id`) REFERENCES `fuel_containers`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_container_events_chainsaw_id_chainsaws_id_fk em fuel_container_events
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_container_events' AND CONSTRAINT_NAME = 'fuel_container_events_chainsaw_id_chainsaws_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_chainsaw_id_chainsaws_id_fk` FOREIGN KEY (`chainsaw_id`) REFERENCES `chainsaws`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_container_events_registered_by_users_id_fk em fuel_container_events
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_container_events' AND CONSTRAINT_NAME = 'fuel_container_events_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: client_id em cargo_destinations
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_destinations' AND COLUMN_NAME = 'client_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_destinations` ADD `client_id` int', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_destinations_client_id_clients_id_fk em cargo_destinations
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_destinations' AND CONSTRAINT_NAME = 'cargo_destinations_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_destinations` ADD CONSTRAINT `cargo_destinations_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: image_url em chainsaw_parts
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_parts' AND COLUMN_NAME = 'image_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `chainsaw_parts` ADD `image_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: image_url em chainsaw_service_orders
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_service_orders' AND COLUMN_NAME = 'image_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `chainsaw_service_orders` ADD `image_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: image_url em chainsaws
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaws' AND COLUMN_NAME = 'image_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `chainsaws` ADD `image_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: extra_expenses
CREATE TABLE IF NOT EXISTS `extra_expenses` (
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

-- FK: extra_expenses_registered_by_users_id_fk em extra_expenses
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'extra_expenses' AND CONSTRAINT_NAME = 'extra_expenses_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `extra_expenses` ADD CONSTRAINT `extra_expenses_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: latitude em collaborator_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND COLUMN_NAME = 'latitude');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `collaborator_attendance` ADD `latitude` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: longitude em collaborator_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND COLUMN_NAME = 'longitude');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `collaborator_attendance` ADD `longitude` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: location_name em collaborator_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND COLUMN_NAME = 'location_name');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `collaborator_attendance` ADD `location_name` varchar(255)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: financial_entries
CREATE TABLE IF NOT EXISTS `financial_entries` (
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

-- FK: financial_entries_client_id_clients_id_fk em financial_entries
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'financial_entries' AND CONSTRAINT_NAME = 'financial_entries_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: financial_entries_registered_by_users_id_fk em financial_entries
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'financial_entries' AND CONSTRAINT_NAME = 'financial_entries_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: gps_locations
CREATE TABLE IF NOT EXISTS `gps_locations` (
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

-- FK: gps_locations_created_by_users_id_fk em gps_locations
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gps_locations' AND CONSTRAINT_NAME = 'gps_locations_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `gps_locations` ADD CONSTRAINT `gps_locations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: cargo_tracking_photos
CREATE TABLE IF NOT EXISTS `cargo_tracking_photos` (
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

-- FK: cargo_tracking_photos_cargo_id_cargo_loads_id_fk em cargo_tracking_photos
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_tracking_photos' AND CONSTRAINT_NAME = 'cargo_tracking_photos_cargo_id_cargo_loads_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_tracking_photos` ADD CONSTRAINT `cargo_tracking_photos_cargo_id_cargo_loads_id_fk` FOREIGN KEY (`cargo_id`) REFERENCES `cargo_loads`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_tracking_photos_registered_by_users_id_fk em cargo_tracking_photos
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_tracking_photos' AND CONSTRAINT_NAME = 'cargo_tracking_photos_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_tracking_photos` ADD CONSTRAINT `cargo_tracking_photos_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ================================================================
-- TABELAS ADICIONAIS (não estavam nas migrações originais)
-- ================================================================

-- Tabela: client_contracts
CREATE TABLE IF NOT EXISTS `client_contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`billing_type` enum('peso_kg','metro_m3','fixo') NOT NULL DEFAULT 'metro_m3',
	`unit_price` varchar(20),
	`estimated_volume` varchar(20),
	`total_amount` varchar(20),
	`due_date` timestamp,
	`status` enum('ativo','pago','atrasado','cancelado') NOT NULL DEFAULT 'ativo',
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_contracts_id` PRIMARY KEY(`id`)
);

SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_contracts' AND CONSTRAINT_NAME = 'client_contracts_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_contracts` ADD CONSTRAINT `client_contracts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_contracts' AND CONSTRAINT_NAME = 'client_contracts_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_contracts` ADD CONSTRAINT `client_contracts_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela: client_payment_receipts
CREATE TABLE IF NOT EXISTS `client_payment_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`contract_id` int,
	`payment_date` timestamp NOT NULL,
	`amount` varchar(20) NOT NULL,
	`payment_method` enum('pix','transferencia','dinheiro','cheque','outros') NOT NULL DEFAULT 'pix',
	`receipt_url` varchar(1000),
	`reference_month` varchar(7),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_payment_receipts_id` PRIMARY KEY(`id`)
);

SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_payment_receipts' AND CONSTRAINT_NAME = 'client_payment_receipts_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_payment_receipts` ADD CONSTRAINT `client_payment_receipts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_payment_receipts' AND CONSTRAINT_NAME = 'client_payment_receipts_contract_id_client_contracts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_payment_receipts` ADD CONSTRAINT `client_payment_receipts_contract_id_client_contracts_id_fk` FOREIGN KEY (`contract_id`) REFERENCES `client_contracts`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_payment_receipts' AND CONSTRAINT_NAME = 'client_payment_receipts_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_payment_receipts` ADD CONSTRAINT `client_payment_receipts_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ================================================================
-- COLUNAS EXTRAS que podem faltar
-- ================================================================

-- default_height_m em equipment
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'default_height_m');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `equipment` ADD `default_height_m` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- default_width_m em equipment
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'default_width_m');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `equipment` ADD `default_width_m` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- default_length_m em equipment
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'default_length_m');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `equipment` ADD `default_length_m` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- weight_out_kg em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_out_kg');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `weight_out_kg` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- weight_in_kg em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_in_kg');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `weight_in_kg` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- final_height_m em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'final_height_m');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `final_height_m` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- final_width_m em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'final_width_m');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `final_width_m` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- final_length_m em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'final_length_m');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `final_length_m` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- final_volume_m3 em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'final_volume_m3');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `final_volume_m3` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- maintenance_location em vehicle_records
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_records' AND COLUMN_NAME = 'maintenance_location');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `vehicle_records` ADD `maintenance_location` varchar(255)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- photos_json em vehicle_records
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_records' AND COLUMN_NAME = 'photos_json');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `vehicle_records` ADD `photos_json` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- photos_json em parts
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts' AND COLUMN_NAME = 'photos_json');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `parts` ADD `photos_json` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

-- ================================================================
-- FIM DO SCRIPT COMPLETO
-- Todas as 54 tabelas e colunas do schema estão cobertas
-- ================================================================