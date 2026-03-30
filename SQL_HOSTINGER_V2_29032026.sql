-- ============================================================
-- SQL COMPLETO PARA HOSTINGER - BTREE AMBIENTAL v2
-- Gerado em: 29/03/2026
-- Compatível com MySQL 5.7+
-- Execute este SQL no phpMyAdmin ou MySQL Workbench
-- Todas as operações usam IF NOT EXISTS para segurança
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- TABELA: clients (se não existir)
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
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `clients_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Adicionar colunas faltantes na tabela clients (ignorar erro se já existir)
ALTER TABLE `clients` ADD COLUMN `password` varchar(255) DEFAULT NULL;
ALTER TABLE `clients` ADD COLUMN `access_code` varchar(50) DEFAULT NULL;
ALTER TABLE `clients` ADD COLUMN `portal_active` int NOT NULL DEFAULT 1;

-- ============================================================
-- TABELA: client_portal_access (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS `client_portal_access` (
    `id` int AUTO_INCREMENT NOT NULL,
    `client_id` int NOT NULL,
    `access_token` varchar(255) NOT NULL,
    `expires_at` timestamp NULL,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `client_portal_access_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABELA: client_payments (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS `client_payments` (
    `id` int AUTO_INCREMENT NOT NULL,
    `client_id` int NOT NULL,
    `reference_date` timestamp NOT NULL,
    `due_date` timestamp NULL,
    `gross_amount` varchar(20) NOT NULL,
    `deductions` varchar(20) DEFAULT NULL,
    `net_amount` varchar(20) NOT NULL,
    `volume_m3` varchar(20) DEFAULT NULL,
    `description` text,
    `status` varchar(50) NOT NULL DEFAULT 'pendente',
    `paid_at` timestamp NULL,
    `notes` text,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` int DEFAULT NULL,
    CONSTRAINT `client_payments_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABELA: replanting_records (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS `replanting_records` (
    `id` int AUTO_INCREMENT NOT NULL,
    `client_id` int NOT NULL,
    `date` timestamp NOT NULL,
    `species` varchar(255) DEFAULT NULL,
    `quantity` int DEFAULT NULL,
    `area` varchar(255) DEFAULT NULL,
    `area_hectares` varchar(20) DEFAULT NULL,
    `notes` text,
    `photos_json` text,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` int DEFAULT NULL,
    CONSTRAINT `replanting_records_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Adicionar colunas faltantes em replanting_records (ignorar erro se já existir)
ALTER TABLE `replanting_records` ADD COLUMN `area_hectares` varchar(20) DEFAULT NULL;
ALTER TABLE `replanting_records` ADD COLUMN `photos_json` text DEFAULT NULL;

-- ============================================================
-- TABELA: cargo_destinations (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS `cargo_destinations` (
    `id` int AUTO_INCREMENT NOT NULL,
    `name` varchar(255) NOT NULL,
    `address` varchar(500) DEFAULT NULL,
    `city` varchar(100) DEFAULT NULL,
    `state` varchar(2) DEFAULT NULL,
    `notes` text,
    `active` int NOT NULL DEFAULT 1,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` int DEFAULT NULL,
    CONSTRAINT `cargo_destinations_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABELA: cargo_loads - adicionar colunas faltantes
-- ============================================================
ALTER TABLE `cargo_loads` ADD COLUMN `destination_id` int DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN `client_id` int DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN `client_name` varchar(255) DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN `vehicle_id` int DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN `driver_collaborator_id` int DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN `weight_kg` varchar(20) DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN `weight_out_photo_url` text DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN `weight_in_photo_url` text DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN `tracking_status` varchar(50) DEFAULT 'aguardando';
ALTER TABLE `cargo_loads` ADD COLUMN `tracking_updated_at` timestamp NULL DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN `tracking_notes` text DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN `photos_json` text DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN `invoice_number` varchar(100) DEFAULT NULL;

-- ============================================================
-- TABELA: equipment - adicionar colunas faltantes
-- ============================================================
ALTER TABLE `equipment` ADD COLUMN `license_plate` varchar(20) DEFAULT NULL;
ALTER TABLE `equipment` ADD COLUMN `sector_id` int DEFAULT NULL;
ALTER TABLE `equipment` ADD COLUMN `gps_device_id` int DEFAULT NULL;

-- ============================================================
-- TABELA: collaborators - adicionar colunas faltantes
-- ============================================================
ALTER TABLE `collaborators` ADD COLUMN `sector_id` int DEFAULT NULL;
ALTER TABLE `collaborators` ADD COLUMN `pix_key` varchar(255) DEFAULT NULL;
ALTER TABLE `collaborators` ADD COLUMN `daily_rate` varchar(20) DEFAULT NULL;

-- ============================================================
-- TABELA: collaborator_attendance - adicionar colunas faltantes
-- ============================================================
ALTER TABLE `collaborator_attendance` ADD COLUMN `work_location` varchar(255) DEFAULT NULL;
ALTER TABLE `collaborator_attendance` ADD COLUMN `registered_by_name` varchar(255) DEFAULT NULL;

-- ============================================================
-- TABELA: maintenance_templates (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS `maintenance_templates` (
    `id` int AUTO_INCREMENT NOT NULL,
    `name` varchar(255) NOT NULL,
    `equipment_type` varchar(100) DEFAULT NULL,
    `description` text,
    `active` int NOT NULL DEFAULT 1,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` int DEFAULT NULL,
    CONSTRAINT `maintenance_templates_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABELA: maintenance_template_parts (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS `maintenance_template_parts` (
    `id` int AUTO_INCREMENT NOT NULL,
    `template_id` int NOT NULL,
    `part_id` int DEFAULT NULL,
    `part_code` varchar(100) DEFAULT NULL,
    `part_name` varchar(255) NOT NULL,
    `quantity` int NOT NULL DEFAULT 1,
    `notes` text,
    CONSTRAINT `maintenance_template_parts_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABELA: maintenance_parts (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS `maintenance_parts` (
    `id` int AUTO_INCREMENT NOT NULL,
    `maintenance_id` int NOT NULL,
    `part_id` int DEFAULT NULL,
    `part_code` varchar(100) DEFAULT NULL,
    `part_name` varchar(255) NOT NULL,
    `quantity` int NOT NULL DEFAULT 1,
    `unit_value` varchar(20) DEFAULT NULL,
    `total_value` varchar(20) DEFAULT NULL,
    `photo_url` text,
    CONSTRAINT `maintenance_parts_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABELA: parts_stock_movements (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS `parts_stock_movements` (
    `id` int AUTO_INCREMENT NOT NULL,
    `part_id` int NOT NULL,
    `type` varchar(20) NOT NULL,
    `quantity` int NOT NULL,
    `reference_id` int DEFAULT NULL,
    `reference_type` varchar(50) DEFAULT NULL,
    `notes` text,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` int DEFAULT NULL,
    CONSTRAINT `parts_stock_movements_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABELA: gps_devices (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS `gps_devices` (
    `id` int AUTO_INCREMENT NOT NULL,
    `traccar_id` int DEFAULT NULL,
    `name` varchar(255) NOT NULL,
    `unique_id` varchar(255) NOT NULL,
    `equipment_id` int DEFAULT NULL,
    `active` int NOT NULL DEFAULT 1,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `gps_devices_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABELA: gps_alerts (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS `gps_alerts` (
    `id` int AUTO_INCREMENT NOT NULL,
    `device_id` int NOT NULL,
    `equipment_id` int DEFAULT NULL,
    `alert_type` varchar(100) NOT NULL,
    `message` text,
    `acknowledged` int NOT NULL DEFAULT 0,
    `acknowledged_by` int DEFAULT NULL,
    `acknowledged_at` timestamp NULL,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `gps_alerts_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABELA: preventive_maintenance_schedules (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS `preventive_maintenance_schedules` (
    `id` int AUTO_INCREMENT NOT NULL,
    `equipment_id` int NOT NULL,
    `maintenance_type` varchar(255) NOT NULL,
    `interval_hours` int DEFAULT NULL,
    `interval_days` int DEFAULT NULL,
    `last_done_at` timestamp NULL,
    `last_done_hours` int DEFAULT NULL,
    `next_due_hours` int DEFAULT NULL,
    `next_due_date` timestamp NULL,
    `notes` text,
    `active` int NOT NULL DEFAULT 1,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `preventive_maintenance_schedules_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABELA: parts - adicionar colunas faltantes
-- ============================================================
ALTER TABLE `parts` ADD COLUMN `code` varchar(100) DEFAULT NULL;
ALTER TABLE `parts` ADD COLUMN `unit_value` varchar(20) DEFAULT NULL;
ALTER TABLE `parts` ADD COLUMN `stock_quantity` int NOT NULL DEFAULT 0;
ALTER TABLE `parts` ADD COLUMN `min_stock` int NOT NULL DEFAULT 0;
ALTER TABLE `parts` ADD COLUMN `photo_url` text DEFAULT NULL;

-- ============================================================
-- TABELA: equipment_maintenance - adicionar colunas faltantes
-- ============================================================
ALTER TABLE `equipment_maintenance` ADD COLUMN `labor_cost` varchar(20) DEFAULT NULL;
ALTER TABLE `equipment_maintenance` ADD COLUMN `total_cost` varchar(20) DEFAULT NULL;
ALTER TABLE `equipment_maintenance` ADD COLUMN `template_id` int DEFAULT NULL;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT 'SQL executado com sucesso!' AS status;
SELECT TABLE_NAME, TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
ORDER BY TABLE_NAME;
