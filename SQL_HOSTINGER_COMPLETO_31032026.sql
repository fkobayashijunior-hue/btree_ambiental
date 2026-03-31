-- ============================================================
-- SQL COMPLETO - BTREE AMBIENTAL - 31/03/2026
-- Execute no phpMyAdmin da Hostinger (banco u629128033_btree_ambienta)
-- Usa CREATE TABLE IF NOT EXISTS e ALTER TABLE IF NOT EXISTS
-- para não quebrar tabelas que já existem
-- ============================================================

-- ============================================================
-- TABELAS DO PORTAL DO CLIENTE (migração 0007)
-- ============================================================

CREATE TABLE IF NOT EXISTS `client_payments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `client_id` int NOT NULL,
  `reference_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `description` varchar(500),
  `volume_m3` varchar(20),
  `price_per_m3` varchar(20),
  `gross_amount` varchar(20) NOT NULL,
  `deductions` varchar(20) DEFAULT '0',
  `net_amount` varchar(20) NOT NULL,
  `status` enum('pendente','pago','atrasado','cancelado') NOT NULL DEFAULT 'pendente',
  `due_date` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `pix_key` varchar(255),
  `notes` text,
  `registered_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `client_portal_access` (
  `id` int AUTO_INCREMENT NOT NULL,
  `client_id` int NOT NULL,
  `access_code` varchar(64) NOT NULL,
  `active` int NOT NULL DEFAULT 1,
  `last_access_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_portal_access_access_code_unique` (`access_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `replanting_records` (
  `id` int AUTO_INCREMENT NOT NULL,
  `client_id` int NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `area` varchar(100),
  `species` varchar(100) DEFAULT 'Eucalipto',
  `quantity` int,
  `area_hectares` varchar(20),
  `notes` text,
  `photos_json` text,
  `registered_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DOCUMENTOS DE COLABORADORES E MANUTENÇÃO DE EQUIPAMENTOS (migração 0008)
-- ============================================================

CREATE TABLE IF NOT EXISTS `collaborator_documents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `collaborator_id` int NOT NULL,
  `type` varchar(100) NOT NULL,
  `number` varchar(100),
  `expiry_date` timestamp NULL DEFAULT NULL,
  `file_url` text,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `equipment_maintenance` (
  `id` int AUTO_INCREMENT NOT NULL,
  `equipment_id` int NOT NULL,
  `type` varchar(100) NOT NULL,
  `description` text,
  `cost` varchar(20),
  `performed_by` varchar(255),
  `performed_at` timestamp NULL DEFAULT NULL,
  `next_maintenance_at` timestamp NULL DEFAULT NULL,
  `notes` text,
  `registered_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `equipment_photos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `equipment_id` int NOT NULL,
  `url` text NOT NULL,
  `caption` varchar(255),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PRESENÇA DE COLABORADORES E ORDENS DE COMPRA (migração 0009)
-- ============================================================

CREATE TABLE IF NOT EXISTS `collaborator_attendance` (
  `id` int AUTO_INCREMENT NOT NULL,
  `collaborator_id` int NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `employment_type_ca` enum('clt','terceirizado','diarista') NOT NULL DEFAULT 'diarista',
  `daily_value` varchar(20) NOT NULL DEFAULT '0',
  `pix_key` varchar(255),
  `activity` varchar(255),
  `observations` text,
  `payment_status_ca` enum('pendente','pago') NOT NULL DEFAULT 'pendente',
  `paid_at` timestamp NULL DEFAULT NULL,
  `registered_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` int AUTO_INCREMENT NOT NULL,
  `title` varchar(255) NOT NULL,
  `status` enum('pendente','aprovado','rejeitado','comprado','cancelado') NOT NULL DEFAULT 'pendente',
  `priority` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
  `total_value` varchar(20),
  `notes` text,
  `requested_by` int,
  `approved_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id` int AUTO_INCREMENT NOT NULL,
  `order_id` int NOT NULL,
  `part_id` int,
  `description` varchar(500) NOT NULL,
  `quantity` varchar(20) NOT NULL,
  `unit` varchar(20) DEFAULT 'un',
  `estimated_unit_cost` varchar(20),
  `actual_unit_cost` varchar(20),
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar colunas faltantes em tabelas existentes (migração 0009)
ALTER TABLE `biometric_attendance` ADD COLUMN IF NOT EXISTS `check_in` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `biometric_attendance` ADD COLUMN IF NOT EXISTS `check_out` timestamp NULL DEFAULT NULL;
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `password` varchar(255);
ALTER TABLE `equipment` ADD COLUMN IF NOT EXISTS `sector_id` int DEFAULT NULL;
ALTER TABLE `parts` ADD COLUMN IF NOT EXISTS `photo_url` text;
ALTER TABLE `vehicle_records` ADD COLUMN IF NOT EXISTS `photo_url` text;

-- ============================================================
-- GPS E MANUTENÇÃO PREVENTIVA (migração 0010)
-- ============================================================

CREATE TABLE IF NOT EXISTS `gps_device_links` (
  `id` int AUTO_INCREMENT NOT NULL,
  `equipment_id` int NOT NULL,
  `device_id` varchar(100) NOT NULL,
  `active` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gps_hours_log` (
  `id` int AUTO_INCREMENT NOT NULL,
  `equipment_id` int NOT NULL,
  `hours` varchar(20) NOT NULL,
  `logged_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `source` varchar(50) DEFAULT 'manual',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `preventive_maintenance_plans` (
  `id` int AUTO_INCREMENT NOT NULL,
  `equipment_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `interval_hours` int,
  `interval_days` int,
  `last_done_at` timestamp NULL DEFAULT NULL,
  `last_done_hours` varchar(20),
  `next_due_at` timestamp NULL DEFAULT NULL,
  `next_due_hours` varchar(20),
  `active` int NOT NULL DEFAULT 1,
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `preventive_maintenance_alerts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `plan_id` int NOT NULL,
  `equipment_id` int NOT NULL,
  `alert_type` enum('horas','dias','ambos') NOT NULL DEFAULT 'ambos',
  `status` enum('pendente','em_andamento','concluido','ignorado') NOT NULL DEFAULT 'pendente',
  `triggered_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` int,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar coluna faltante (migração 0011)
ALTER TABLE `equipment` ADD COLUMN IF NOT EXISTS `license_plate` varchar(20) DEFAULT NULL;

-- ============================================================
-- DESTINOS DE CARGA (migração 0012)
-- ============================================================

CREATE TABLE IF NOT EXISTS `cargo_destinations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` varchar(500),
  `city` varchar(100),
  `state` varchar(2),
  `notes` text,
  `active` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar colunas faltantes em cargo_loads (migração 0012)
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `destination_id` int DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `weight_kg` varchar(20) DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `tracking_status` enum('aguardando','carregando','em_transito','pesagem_saida','descarregando','pesagem_chegada','finalizado') DEFAULT 'aguardando';
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `tracking_updated_at` timestamp NULL DEFAULT NULL;
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `tracking_notes` text;
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `weight_out_photo_url` text;
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `weight_in_photo_url` text;

-- ============================================================
-- TEMPLATES DE MANUTENÇÃO E MOVIMENTAÇÃO DE PEÇAS (migração 0013)
-- ============================================================

CREATE TABLE IF NOT EXISTS `maintenance_templates` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `equipment_type_id` int,
  `active` int NOT NULL DEFAULT 1,
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `maintenance_template_parts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `template_id` int NOT NULL,
  `part_id` int,
  `part_name` varchar(255) NOT NULL,
  `quantity` varchar(20) NOT NULL DEFAULT '1',
  `unit` varchar(20) DEFAULT 'un',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `maintenance_parts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `maintenance_id` int NOT NULL,
  `part_id` int,
  `part_name` varchar(255) NOT NULL,
  `quantity` varchar(20) NOT NULL,
  `unit` varchar(20) DEFAULT 'un',
  `unit_cost` varchar(20),
  `from_stock` int DEFAULT 1,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `parts_stock_movements` (
  `id` int AUTO_INCREMENT NOT NULL,
  `part_id` int NOT NULL,
  `type` enum('entrada','saida') NOT NULL,
  `quantity` varchar(20) NOT NULL,
  `reason` varchar(255),
  `reference_id` int,
  `unit_cost` varchar(20),
  `registered_by` int,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PERMISSÕES DE USUÁRIO (migração 0014)
-- ============================================================

CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `module` varchar(100) NOT NULL,
  `can_view` int NOT NULL DEFAULT 0,
  `can_create` int NOT NULL DEFAULT 0,
  `can_edit` int NOT NULL DEFAULT 0,
  `can_delete` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELAS DE MOTOSSERRAS (migração 0015)
-- ============================================================

-- Corrigir tabela chainsaws (adicionar colunas faltantes e corrigir enum)
ALTER TABLE `chainsaws` ADD COLUMN IF NOT EXISTS `brand` varchar(100) DEFAULT NULL AFTER `name`;
ALTER TABLE `chainsaws` ADD COLUMN IF NOT EXISTS `created_by` int(11) DEFAULT NULL;
ALTER TABLE `chainsaws` MODIFY COLUMN `status` enum('ativa','oficina','inativa') NOT NULL DEFAULT 'ativa';
ALTER TABLE `chainsaws` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `chainsaws` DROP COLUMN IF EXISTS `updated_at`;

-- Corrigir tabela fuel_containers
ALTER TABLE `fuel_containers` ADD COLUMN IF NOT EXISTS `color` varchar(30) DEFAULT 'vermelho';
ALTER TABLE `fuel_containers` ADD COLUMN IF NOT EXISTS `type` enum('puro','mistura') NOT NULL DEFAULT 'puro';
ALTER TABLE `fuel_containers` ADD COLUMN IF NOT EXISTS `capacity_liters` varchar(10) DEFAULT '20';
ALTER TABLE `fuel_containers` ADD COLUMN IF NOT EXISTS `current_volume_liters` varchar(10) DEFAULT '0';
ALTER TABLE `fuel_containers` ADD COLUMN IF NOT EXISTS `is_active` int(11) DEFAULT 1;
ALTER TABLE `fuel_containers` ADD COLUMN IF NOT EXISTS `notes` text DEFAULT NULL;
ALTER TABLE `fuel_containers` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `fuel_containers` DROP COLUMN IF EXISTS `fuel_type`;
ALTER TABLE `fuel_containers` DROP COLUMN IF EXISTS `mix_ratio_oil_ml_per_liter`;
ALTER TABLE `fuel_containers` DROP COLUMN IF EXISTS `current_liters`;
ALTER TABLE `fuel_containers` DROP COLUMN IF EXISTS `updated_at`;

-- Criar tabela fuel_container_events (nome correto)
CREATE TABLE IF NOT EXISTS `fuel_container_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `container_id` int(11) NOT NULL,
  `event_type` enum('abastecimento','uso','transferencia') NOT NULL,
  `volume_liters` varchar(10) NOT NULL,
  `cost_per_liter` varchar(20) DEFAULT NULL,
  `total_cost` varchar(20) DEFAULT NULL,
  `oil2t_ml` varchar(10) DEFAULT NULL,
  `source_container_id` int(11) DEFAULT NULL,
  `chainsaw_id` int(11) DEFAULT NULL,
  `registered_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `event_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Corrigir tabela chainsaw_chain_stock
ALTER TABLE `chainsaw_chain_stock` ADD COLUMN IF NOT EXISTS `sharpened_in_box` int(11) NOT NULL DEFAULT 0;
ALTER TABLE `chainsaw_chain_stock` ADD COLUMN IF NOT EXISTS `in_field` int(11) NOT NULL DEFAULT 0;
ALTER TABLE `chainsaw_chain_stock` ADD COLUMN IF NOT EXISTS `in_workshop` int(11) NOT NULL DEFAULT 0;
ALTER TABLE `chainsaw_chain_stock` ADD COLUMN IF NOT EXISTS `total_stock` int(11) NOT NULL DEFAULT 0;
ALTER TABLE `chainsaw_chain_stock` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `chainsaw_chain_stock` DROP COLUMN IF EXISTS `updated_at`;

-- Criar tabela chainsaw_chain_events (nome correto)
CREATE TABLE IF NOT EXISTS `chainsaw_chain_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chain_type` varchar(20) NOT NULL,
  `event_type` enum('envio_campo','retorno_oficina','afiacao_concluida','baixa_estoque','entrada_estoque') NOT NULL,
  `quantity` int(11) NOT NULL,
  `chainsaw_id` int(11) DEFAULT NULL,
  `registered_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `event_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Corrigir tabela chainsaw_parts
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `code` varchar(50) DEFAULT NULL;
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `category` varchar(100) DEFAULT NULL;
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `unit` varchar(20) DEFAULT 'un';
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `current_stock` varchar(20) DEFAULT '0';
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `min_stock` varchar(20) DEFAULT '0';
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `unit_cost` varchar(20) DEFAULT NULL;
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `is_active` int(11) DEFAULT 1;
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `created_by` int(11) DEFAULT NULL;
ALTER TABLE `chainsaw_parts` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Criar tabela chainsaw_part_movements (nome correto)
CREATE TABLE IF NOT EXISTS `chainsaw_part_movements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `part_id` int(11) NOT NULL,
  `type` enum('entrada','saida') NOT NULL,
  `quantity` varchar(20) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `service_order_id` int(11) DEFAULT NULL,
  `unit_cost` varchar(20) DEFAULT NULL,
  `registered_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Corrigir tabela chainsaw_service_orders
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `problem_type` enum('motor_falhando','nao_liga','superaquecimento','vazamento','corrente_problema','sabre_problema','manutencao_preventiva','outro') NOT NULL DEFAULT 'outro';
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `priority` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media';
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `mechanic_id` int(11) DEFAULT NULL;
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `service_description` text DEFAULT NULL;
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `completed_at` timestamp NULL DEFAULT NULL;
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `opened_by` int(11) DEFAULT NULL;
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `opened_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `chainsaw_service_orders` MODIFY COLUMN `status` enum('aberta','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'aberta';
ALTER TABLE `chainsaw_service_orders` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `chainsaw_service_orders` DROP COLUMN IF EXISTS `updated_at`;

-- Criar tabela chainsaw_service_parts (nome correto)
CREATE TABLE IF NOT EXISTS `chainsaw_service_parts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_order_id` int(11) NOT NULL,
  `part_id` int(11) DEFAULT NULL,
  `part_name` varchar(255) NOT NULL,
  `quantity` varchar(20) NOT NULL,
  `unit` varchar(20) DEFAULT 'un',
  `unit_cost` varchar(20) DEFAULT NULL,
  `from_stock` int(11) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Remover tabelas antigas com nomes errados (se existirem)
DROP TABLE IF EXISTS `chainsaw_os_parts`;
DROP TABLE IF EXISTS `fuel_supply_events`;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
