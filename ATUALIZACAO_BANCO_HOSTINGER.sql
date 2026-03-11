-- ============================================================
-- ATUALIZAÇÃO DO BANCO DE DADOS NA HOSTINGER
-- Execute este SQL no phpMyAdmin da Hostinger
--
-- Este script cria tabelas que podem estar faltando e
-- remove FK constraints problemáticas.
-- É seguro executar mesmo que as tabelas já existam (IF NOT EXISTS).
-- ============================================================

-- ============================================================
-- PARTE 1: Criar tabelas que podem estar faltando
-- ============================================================

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

CREATE TABLE IF NOT EXISTS `equipment_photos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `equipment_id` int NOT NULL,
  `photo_url` varchar(1000) NOT NULL,
  `caption` varchar(255),
  `uploaded_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `equipment_photos_id` PRIMARY KEY(`id`)
);

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

CREATE TABLE IF NOT EXISTS `client_payments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `client_id` int NOT NULL,
  `description` varchar(500) NOT NULL,
  `amount` varchar(20) NOT NULL,
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

CREATE TABLE IF NOT EXISTS `client_payment_receipts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `payment_id` int NOT NULL,
  `file_url` varchar(1000) NOT NULL,
  `file_type` varchar(50),
  `notes` text,
  `registered_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `client_payment_receipts_id` PRIMARY KEY(`id`)
);

-- ============================================================
-- PARTE 2: Corrigir coluna registered_by na biometric_attendance
-- (tornar nullable para evitar erros de FK)
-- ============================================================

ALTER TABLE `biometric_attendance` MODIFY COLUMN `registered_by` int NULL;

-- ============================================================
-- PARTE 3: Remover FK constraints problemáticas
-- (campos opcionais que referenciam users.id)
-- ============================================================

ALTER TABLE `biometric_attendance` DROP FOREIGN KEY IF EXISTS `biometric_attendance_registered_by_users_id_fk`;
ALTER TABLE `biometric_attendance` DROP FOREIGN KEY IF EXISTS `biometric_attendance_collaborator_id_collaborators_id_fk`;

ALTER TABLE `client_portal_access` DROP FOREIGN KEY IF EXISTS `client_portal_access_created_by_users_id_fk`;
ALTER TABLE `client_portal_access` DROP FOREIGN KEY IF EXISTS `client_portal_access_client_id_clients_id_fk`;

ALTER TABLE `collaborator_documents` DROP FOREIGN KEY IF EXISTS `collaborator_documents_uploaded_by_users_id_fk`;
ALTER TABLE `collaborator_documents` DROP FOREIGN KEY IF EXISTS `collaborator_documents_collaborator_id_collaborators_id_fk`;

ALTER TABLE `equipment_maintenance` DROP FOREIGN KEY IF EXISTS `equipment_maintenance_registered_by_users_id_fk`;
ALTER TABLE `equipment_maintenance` DROP FOREIGN KEY IF EXISTS `equipment_maintenance_equipment_id_equipment_id_fk`;

ALTER TABLE `equipment_photos` DROP FOREIGN KEY IF EXISTS `equipment_photos_uploaded_by_users_id_fk`;
ALTER TABLE `equipment_photos` DROP FOREIGN KEY IF EXISTS `equipment_photos_equipment_id_equipment_id_fk`;

ALTER TABLE `replanting_records` DROP FOREIGN KEY IF EXISTS `replanting_records_registered_by_users_id_fk`;
ALTER TABLE `replanting_records` DROP FOREIGN KEY IF EXISTS `replanting_records_client_id_clients_id_fk`;

ALTER TABLE `client_payments` DROP FOREIGN KEY IF EXISTS `client_payments_registered_by_users_id_fk`;
ALTER TABLE `client_payments` DROP FOREIGN KEY IF EXISTS `client_payments_client_id_clients_id_fk`;

ALTER TABLE `client_payment_receipts` DROP FOREIGN KEY IF EXISTS `client_payment_receipts_registered_by_users_id_fk`;
ALTER TABLE `client_payment_receipts` DROP FOREIGN KEY IF EXISTS `client_payment_receipts_payment_id_client_payments_id_fk`;

ALTER TABLE `clients` DROP FOREIGN KEY IF EXISTS `clients_created_by_users_id_fk`;
ALTER TABLE `collaborators` DROP FOREIGN KEY IF EXISTS `collaborators_created_by_users_id_fk`;
ALTER TABLE `fuel_records` DROP FOREIGN KEY IF EXISTS `fuel_records_registered_by_users_id_fk`;
ALTER TABLE `fuel_records` DROP FOREIGN KEY IF EXISTS `fuel_records_operator_id_users_id_fk`;
ALTER TABLE `machine_fuel` DROP FOREIGN KEY IF EXISTS `machine_fuel_registered_by_users_id_fk`;
ALTER TABLE `machine_hours` DROP FOREIGN KEY IF EXISTS `machine_hours_registered_by_users_id_fk`;
ALTER TABLE `machine_maintenance` DROP FOREIGN KEY IF EXISTS `machine_maintenance_registered_by_users_id_fk`;
ALTER TABLE `parts` DROP FOREIGN KEY IF EXISTS `parts_created_by_users_id_fk`;
ALTER TABLE `parts_requests` DROP FOREIGN KEY IF EXISTS `parts_requests_requested_by_users_id_fk`;
ALTER TABLE `parts_requests` DROP FOREIGN KEY IF EXISTS `parts_requests_approved_by_users_id_fk`;
ALTER TABLE `replanting_records` DROP FOREIGN KEY IF EXISTS `replanting_records_registered_by_users_id_fk`;
ALTER TABLE `sectors` DROP FOREIGN KEY IF EXISTS `sectors_created_by_users_id_fk`;
ALTER TABLE `vehicle_records` DROP FOREIGN KEY IF EXISTS `vehicle_records_registered_by_users_id_fk`;
ALTER TABLE `role_permissions` DROP FOREIGN KEY IF EXISTS `role_permissions_updated_by_users_id_fk`;
ALTER TABLE `cargo_loads` DROP FOREIGN KEY IF EXISTS `cargo_loads_registered_by_users_id_fk`;

-- ============================================================
-- FIM DA ATUALIZAÇÃO
-- ============================================================
-- Para verificar as tabelas criadas:
-- SHOW TABLES;
-- ============================================================
