-- ============================================================
-- SQL COMPLETO PARA HOSTINGER - BTREE AMBIENTAL v3
-- Gerado em: 29/03/2026
-- Compatível com MySQL 5.7+
-- Execute este SQL no phpMyAdmin (banco: u629128033_btree_ambienta)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- PARTE 1: CRIAR TABELAS NOVAS (seguro - IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS `client_portal_access` (
    `id` int AUTO_INCREMENT NOT NULL,
    `client_id` int NOT NULL,
    `access_token` varchar(255) NOT NULL,
    `expires_at` timestamp NULL,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `client_payments` (
    `id` int AUTO_INCREMENT NOT NULL,
    `client_id` int NOT NULL,
    `reference_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `due_date` timestamp NULL,
    `gross_amount` varchar(20) NOT NULL DEFAULT '0',
    `deductions` varchar(20) DEFAULT NULL,
    `net_amount` varchar(20) NOT NULL DEFAULT '0',
    `volume_m3` varchar(20) DEFAULT NULL,
    `description` text,
    `status` varchar(50) NOT NULL DEFAULT 'pendente',
    `paid_at` timestamp NULL,
    `notes` text,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` int DEFAULT NULL,
    PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `replanting_records` (
    `id` int AUTO_INCREMENT NOT NULL,
    `client_id` int NOT NULL,
    `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `species` varchar(255) DEFAULT NULL,
    `quantity` int DEFAULT NULL,
    `area` varchar(255) DEFAULT NULL,
    `area_hectares` varchar(20) DEFAULT NULL,
    `notes` text,
    `photos_json` text,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` int DEFAULT NULL,
    PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
    PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `maintenance_templates` (
    `id` int AUTO_INCREMENT NOT NULL,
    `name` varchar(255) NOT NULL,
    `equipment_type` varchar(100) DEFAULT NULL,
    `description` text,
    `active` int NOT NULL DEFAULT 1,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` int DEFAULT NULL,
    PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `maintenance_template_parts` (
    `id` int AUTO_INCREMENT NOT NULL,
    `template_id` int NOT NULL,
    `part_id` int DEFAULT NULL,
    `part_code` varchar(100) DEFAULT NULL,
    `part_name` varchar(255) NOT NULL,
    `quantity` int NOT NULL DEFAULT 1,
    `notes` text,
    PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
    PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
    PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `gps_devices` (
    `id` int AUTO_INCREMENT NOT NULL,
    `traccar_id` int DEFAULT NULL,
    `name` varchar(255) NOT NULL,
    `unique_id` varchar(255) NOT NULL,
    `equipment_id` int DEFAULT NULL,
    `active` int NOT NULL DEFAULT 1,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
    PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
    PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PARTE 2: ADICIONAR COLUNAS FALTANTES (via PROCEDURE segura)
-- Cada CALL verifica se a coluna existe antes de adicionar
-- ============================================================

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

DELIMITER //
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN columnDef TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = tableName
          AND COLUMN_NAME = columnName
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- clients
CALL AddColumnIfNotExists('clients', 'password', 'varchar(255) DEFAULT NULL');
CALL AddColumnIfNotExists('clients', 'access_code', 'varchar(50) DEFAULT NULL');
CALL AddColumnIfNotExists('clients', 'portal_active', 'int NOT NULL DEFAULT 1');

-- replanting_records (caso a tabela já existia sem essas colunas)
CALL AddColumnIfNotExists('replanting_records', 'area_hectares', 'varchar(20) DEFAULT NULL');
CALL AddColumnIfNotExists('replanting_records', 'photos_json', 'text DEFAULT NULL');

-- cargo_loads
CALL AddColumnIfNotExists('cargo_loads', 'destination_id', 'int DEFAULT NULL');
CALL AddColumnIfNotExists('cargo_loads', 'client_id', 'int DEFAULT NULL');
CALL AddColumnIfNotExists('cargo_loads', 'client_name', 'varchar(255) DEFAULT NULL');
CALL AddColumnIfNotExists('cargo_loads', 'vehicle_id', 'int DEFAULT NULL');
CALL AddColumnIfNotExists('cargo_loads', 'driver_collaborator_id', 'int DEFAULT NULL');
CALL AddColumnIfNotExists('cargo_loads', 'weight_kg', 'varchar(20) DEFAULT NULL');
CALL AddColumnIfNotExists('cargo_loads', 'weight_out_photo_url', 'text DEFAULT NULL');
CALL AddColumnIfNotExists('cargo_loads', 'weight_in_photo_url', 'text DEFAULT NULL');
CALL AddColumnIfNotExists('cargo_loads', 'tracking_status', "varchar(50) DEFAULT 'aguardando'");
CALL AddColumnIfNotExists('cargo_loads', 'tracking_updated_at', 'timestamp NULL DEFAULT NULL');
CALL AddColumnIfNotExists('cargo_loads', 'tracking_notes', 'text DEFAULT NULL');
CALL AddColumnIfNotExists('cargo_loads', 'photos_json', 'text DEFAULT NULL');
CALL AddColumnIfNotExists('cargo_loads', 'invoice_number', 'varchar(100) DEFAULT NULL');

-- equipment
CALL AddColumnIfNotExists('equipment', 'license_plate', 'varchar(20) DEFAULT NULL');
CALL AddColumnIfNotExists('equipment', 'sector_id', 'int DEFAULT NULL');
CALL AddColumnIfNotExists('equipment', 'gps_device_id', 'int DEFAULT NULL');

-- collaborators
CALL AddColumnIfNotExists('collaborators', 'sector_id', 'int DEFAULT NULL');
CALL AddColumnIfNotExists('collaborators', 'pix_key', 'varchar(255) DEFAULT NULL');
CALL AddColumnIfNotExists('collaborators', 'daily_rate', 'varchar(20) DEFAULT NULL');

-- collaborator_attendance
CALL AddColumnIfNotExists('collaborator_attendance', 'work_location', 'varchar(255) DEFAULT NULL');
CALL AddColumnIfNotExists('collaborator_attendance', 'registered_by_name', 'varchar(255) DEFAULT NULL');

-- parts
CALL AddColumnIfNotExists('parts', 'code', 'varchar(100) DEFAULT NULL');
CALL AddColumnIfNotExists('parts', 'unit_value', 'varchar(20) DEFAULT NULL');
CALL AddColumnIfNotExists('parts', 'stock_quantity', 'int NOT NULL DEFAULT 0');
CALL AddColumnIfNotExists('parts', 'min_stock', 'int NOT NULL DEFAULT 0');
CALL AddColumnIfNotExists('parts', 'photo_url', 'text DEFAULT NULL');

-- equipment_maintenance
CALL AddColumnIfNotExists('equipment_maintenance', 'labor_cost', 'varchar(20) DEFAULT NULL');
CALL AddColumnIfNotExists('equipment_maintenance', 'total_cost', 'varchar(20) DEFAULT NULL');
CALL AddColumnIfNotExists('equipment_maintenance', 'template_id', 'int DEFAULT NULL');

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;

-- VERIFICAÇÃO FINAL
SELECT 'SQL executado com sucesso!' AS status;
SELECT TABLE_NAME 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
ORDER BY TABLE_NAME;
-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
