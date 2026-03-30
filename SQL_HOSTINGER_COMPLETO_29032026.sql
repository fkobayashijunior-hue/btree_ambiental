-- ============================================================
-- SQL COMPLETO PARA HOSTINGER - BTREE AMBIENTAL
-- Gerado em: 29/03/2026
-- Execute este SQL no phpMyAdmin ou MySQL Workbench
-- Todas as operações usam IF NOT EXISTS / IF EXISTS para segurança
-- ============================================================

-- ============================================================
-- MIGRATION 0006: Tabela clients
-- ============================================================
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

-- ============================================================
-- MIGRATION 0007: Tabelas do portal do cliente
-- ============================================================
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
    `due_date` timestamp NULL,
    `paid_at` timestamp NULL,
    `pix_key` varchar(255),
    `notes` text,
    `registered_by` int,
    `created_at` timestamp NOT NULL DEFAULT (now()),
    `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `client_payments_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `client_portal_access` (
    `id` int AUTO_INCREMENT NOT NULL,
    `client_id` int NOT NULL,
    `access_code` varchar(64) NOT NULL,
    `active` int NOT NULL DEFAULT 1,
    `last_access_at` timestamp NULL,
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

-- ============================================================
-- MIGRATION 0008: Documentos e manutenção de equipamentos
-- ============================================================
CREATE TABLE IF NOT EXISTS `collaborator_documents` (
    `id` int AUTO_INCREMENT NOT NULL,
    `collaborator_id` int NOT NULL,
    `type` enum('cnh','certificado','aso','contrato','rg','cpf','outros') NOT NULL DEFAULT 'outros',
    `title` varchar(255) NOT NULL,
    `file_url` varchar(1000) NOT NULL,
    `file_type` varchar(50),
    `issue_date` timestamp NULL,
    `expiry_date` timestamp NULL,
    `notes` text,
    `uploaded_by` int,
    `created_at` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT `collaborator_documents_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `equipment_maintenance` (
    `id` int AUTO_INCREMENT NOT NULL,
    `equipment_id` int NOT NULL,
    `type` enum('preventiva','corretiva','revisao') NOT NULL DEFAULT 'preventiva',
    `service_type` enum('troca_oleo','filtro_ar','filtro_combustivel','correia','revisao_geral','outros') DEFAULT 'outros',
    `description` text NOT NULL,
    `mechanic_name` varchar(255),
    `third_party_company` varchar(255),
    `cost` varchar(20),
    `total_cost` varchar(20),
    `next_maintenance_hours` varchar(20),
    `next_maintenance_date` timestamp NULL,
    `photos_json` text,
    `registered_by` int,
    `performed_at` timestamp NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT (now()),
    `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
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

-- ============================================================
-- MIGRATION 0009: Senha do cliente, setor, foto de peças
-- ============================================================
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `password` varchar(255);
ALTER TABLE `equipment` ADD COLUMN IF NOT EXISTS `sector_id` int;
ALTER TABLE `parts` ADD COLUMN IF NOT EXISTS `photo_url` text;
ALTER TABLE `vehicle_records` ADD COLUMN IF NOT EXISTS `photo_url` text;

-- ============================================================
-- MIGRATION 0010: GPS e manutenção preventiva
-- ============================================================
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

CREATE TABLE IF NOT EXISTS `preventive_maintenance_alerts` (
    `id` int AUTO_INCREMENT NOT NULL,
    `equipment_id` int NOT NULL,
    `plan_id` int NOT NULL,
    `status` enum('pendente','em_andamento','concluido','ignorado') NOT NULL DEFAULT 'pendente',
    `current_hours` varchar(20) NOT NULL,
    `due_hours` varchar(20) NOT NULL,
    `generated_at` timestamp NOT NULL DEFAULT (now()),
    `resolved_at` timestamp NULL,
    `resolved_by` int,
    `notes` text,
    `created_at` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT `preventive_maintenance_alerts_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `preventive_maintenance_plans` (
    `id` int AUTO_INCREMENT NOT NULL,
    `equipment_id` int NOT NULL,
    `name` varchar(255) NOT NULL,
    `type` enum('troca_oleo','engraxamento','filtro_ar','filtro_combustivel','correia','revisao_geral','abastecimento','outros') NOT NULL DEFAULT 'outros',
    `interval_hours` int NOT NULL,
    `last_done_hours` varchar(20) DEFAULT '0',
    `last_done_at` timestamp NULL,
    `alert_threshold_hours` int DEFAULT 10,
    `active` int NOT NULL DEFAULT 1,
    `notes` text,
    `created_by` int,
    `created_at` timestamp NOT NULL DEFAULT (now()),
    `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `preventive_maintenance_plans_id` PRIMARY KEY(`id`)
);

-- ============================================================
-- MIGRATION 0011: Placa do equipamento
-- ============================================================
ALTER TABLE `equipment` ADD COLUMN IF NOT EXISTS `license_plate` varchar(20);

-- ============================================================
-- MIGRATION 0012: Destinos de carga e colunas de rastreamento
-- ============================================================
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

ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `destination_id` int;
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `weight_kg` varchar(20);
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `tracking_status` enum('aguardando','carregando','em_transito','pesagem_saida','descarregando','pesagem_chegada','finalizado') DEFAULT 'aguardando';
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `tracking_updated_at` timestamp NULL;
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `tracking_notes` text;
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `weight_out_photo_url` text;
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `weight_in_photo_url` text;

-- ============================================================
-- MIGRATION 0013: Templates e peças de manutenção
-- ============================================================
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

-- ============================================================
-- COLUNAS ADICIONAIS EM equipment_maintenance
-- (caso a tabela já exista com estrutura antiga)
-- ============================================================
ALTER TABLE `equipment_maintenance` ADD COLUMN IF NOT EXISTS `type` enum('preventiva','corretiva','revisao') NOT NULL DEFAULT 'preventiva';
ALTER TABLE `equipment_maintenance` ADD COLUMN IF NOT EXISTS `service_type` enum('troca_oleo','filtro_ar','filtro_combustivel','correia','revisao_geral','outros') DEFAULT 'outros';
ALTER TABLE `equipment_maintenance` ADD COLUMN IF NOT EXISTS `mechanic_name` varchar(255);
ALTER TABLE `equipment_maintenance` ADD COLUMN IF NOT EXISTS `third_party_company` varchar(255);
ALTER TABLE `equipment_maintenance` ADD COLUMN IF NOT EXISTS `total_cost` varchar(20);
ALTER TABLE `equipment_maintenance` ADD COLUMN IF NOT EXISTS `next_maintenance_hours` varchar(20);
ALTER TABLE `equipment_maintenance` ADD COLUMN IF NOT EXISTS `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;

-- ============================================================
-- FOREIGN KEYS (aplicar apenas se as tabelas existirem)
-- ============================================================

-- client_payments
ALTER TABLE `client_payments` 
    ADD CONSTRAINT IF NOT EXISTS `client_payments_client_id_fk` 
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`);

-- replanting_records
ALTER TABLE `replanting_records` 
    ADD CONSTRAINT IF NOT EXISTS `replanting_records_client_id_fk` 
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`);

-- cargo_destinations
ALTER TABLE `cargo_destinations` 
    ADD CONSTRAINT IF NOT EXISTS `cargo_destinations_created_by_fk` 
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`);

-- cargo_loads destination_id
ALTER TABLE `cargo_loads` 
    ADD CONSTRAINT IF NOT EXISTS `cargo_loads_destination_id_fk` 
    FOREIGN KEY (`destination_id`) REFERENCES `cargo_destinations`(`id`);

-- gps_device_links
ALTER TABLE `gps_device_links` 
    ADD CONSTRAINT IF NOT EXISTS `gps_device_links_equipment_id_fk` 
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE CASCADE;

-- gps_hours_log
ALTER TABLE `gps_hours_log` 
    ADD CONSTRAINT IF NOT EXISTS `gps_hours_log_equipment_id_fk` 
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`);

-- preventive_maintenance_plans
ALTER TABLE `preventive_maintenance_plans` 
    ADD CONSTRAINT IF NOT EXISTS `preventive_maintenance_plans_equipment_id_fk` 
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE CASCADE;

-- preventive_maintenance_alerts
ALTER TABLE `preventive_maintenance_alerts` 
    ADD CONSTRAINT IF NOT EXISTS `preventive_maintenance_alerts_equipment_id_fk` 
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`);

ALTER TABLE `preventive_maintenance_alerts` 
    ADD CONSTRAINT IF NOT EXISTS `preventive_maintenance_alerts_plan_id_fk` 
    FOREIGN KEY (`plan_id`) REFERENCES `preventive_maintenance_plans`(`id`);

-- maintenance_parts
ALTER TABLE `maintenance_parts` 
    ADD CONSTRAINT IF NOT EXISTS `maintenance_parts_maintenance_id_fk` 
    FOREIGN KEY (`maintenance_id`) REFERENCES `equipment_maintenance`(`id`) ON DELETE CASCADE;

-- maintenance_template_parts
ALTER TABLE `maintenance_template_parts` 
    ADD CONSTRAINT IF NOT EXISTS `maintenance_template_parts_template_id_fk` 
    FOREIGN KEY (`template_id`) REFERENCES `maintenance_templates`(`id`) ON DELETE CASCADE;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
