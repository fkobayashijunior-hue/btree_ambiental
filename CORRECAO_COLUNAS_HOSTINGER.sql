-- ============================================================
-- BTREE AMBIENTAL - Correção de Colunas e Novas Tabelas
-- Data: 29/03/2026
-- Execute este script no phpMyAdmin da Hostinger
-- Banco: u629128033_btree
-- ============================================================

-- 1. Adicionar coluna license_plate na tabela equipment
--    (campo Placa para veículos/caminhões)
ALTER TABLE `equipment`
  ADD COLUMN IF NOT EXISTS `license_plate` varchar(20) DEFAULT NULL;

-- 2. Adicionar novos campos na tabela cargo_loads
--    (peso, status de tracking, fotos de pesagem, destino cadastrado)
ALTER TABLE `cargo_loads`
  ADD COLUMN IF NOT EXISTS `weight_kg` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `destination_id` int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `tracking_status` varchar(50) DEFAULT 'aguardando',
  ADD COLUMN IF NOT EXISTS `tracking_notes` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `weight_out_photo_url` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `weight_in_photo_url` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `photos_json` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `tracking_updated_at` timestamp NULL DEFAULT NULL;

-- 3. Criar tabela de destinos de carga
CREATE TABLE IF NOT EXISTS `cargo_destinations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `active` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Templates de Manutenção
CREATE TABLE IF NOT EXISTS `maintenance_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` enum('preventiva','corretiva','revisao') NOT NULL DEFAULT 'preventiva',
  `description` text DEFAULT NULL,
  `estimated_cost` varchar(20) DEFAULT NULL,
  `active` int NOT NULL DEFAULT 1,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Peças de cada Template
CREATE TABLE IF NOT EXISTS `maintenance_template_parts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `part_id` int DEFAULT NULL,
  `part_code` varchar(50) DEFAULT NULL,
  `part_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL DEFAULT 1,
  `unit` varchar(20) DEFAULT 'un',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mtp_template` (`template_id`),
  CONSTRAINT `fk_mtp_template` FOREIGN KEY (`template_id`) REFERENCES `maintenance_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Peças Utilizadas em cada Manutenção
CREATE TABLE IF NOT EXISTS `maintenance_parts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `maintenance_id` int NOT NULL,
  `part_id` int DEFAULT NULL,
  `part_code` varchar(50) DEFAULT NULL,
  `part_name` varchar(255) NOT NULL,
  `part_photo_url` text DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT 1,
  `unit` varchar(20) DEFAULT 'un',
  `unit_cost` varchar(20) DEFAULT NULL,
  `total_cost` varchar(20) DEFAULT NULL,
  `from_stock` int DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mp_maintenance` (`maintenance_id`),
  CONSTRAINT `fk_mp_maintenance` FOREIGN KEY (`maintenance_id`) REFERENCES `equipment_maintenance` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Movimentações de Estoque de Peças
CREATE TABLE IF NOT EXISTS `parts_stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `part_id` int NOT NULL,
  `type` enum('entrada','saida') NOT NULL,
  `quantity` int NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `unit_cost` varchar(20) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `registered_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_psm_part` (`part_id`),
  CONSTRAINT `fk_psm_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FIM DO SCRIPT
-- Após executar, as seguintes mudanças estarão aplicadas:
--   equipment.license_plate (coluna nova)
--   cargo_loads: 8 novas colunas (peso, tracking, fotos, destino)
--   cargo_destinations (tabela nova)
--   maintenance_templates (tabela nova)
--   maintenance_template_parts (tabela nova)
--   maintenance_parts (tabela nova)
--   parts_stock_movements (tabela nova)
-- ============================================================
