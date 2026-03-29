-- ============================================================
-- BTREE AMBIENTAL - Sistema de Manutenção Avançado
-- Data: 29/03/2026
-- Execute este script no phpMyAdmin da Hostinger
-- Banco: u629128033_btree
-- ============================================================

-- 1. Templates de Manutenção
-- (define quais peças são necessárias para cada tipo de manutenção)
CREATE TABLE IF NOT EXISTS `maintenance_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Ex: Troca de Óleo Motor, Revisão 250h',
  `type` enum('preventiva','corretiva','revisao') NOT NULL DEFAULT 'preventiva',
  `description` text,
  `estimated_cost` varchar(20),
  `active` int NOT NULL DEFAULT 1,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Peças de cada Template
-- (lista de peças necessárias para executar o template)
CREATE TABLE IF NOT EXISTS `maintenance_template_parts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `part_id` int DEFAULT NULL COMMENT 'FK para tabela parts (se peça já cadastrada)',
  `part_code` varchar(50) DEFAULT NULL,
  `part_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL DEFAULT 1,
  `unit` varchar(20) DEFAULT 'un',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mtp_template` (`template_id`),
  KEY `fk_mtp_part` (`part_id`),
  CONSTRAINT `fk_mtp_template` FOREIGN KEY (`template_id`) REFERENCES `maintenance_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mtp_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Peças Utilizadas em cada Manutenção
-- (registro das peças efetivamente usadas em uma manutenção executada)
CREATE TABLE IF NOT EXISTS `maintenance_parts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `maintenance_id` int NOT NULL COMMENT 'FK para equipment_maintenance',
  `part_id` int DEFAULT NULL COMMENT 'FK para parts (se peça cadastrada)',
  `part_code` varchar(50) DEFAULT NULL,
  `part_name` varchar(255) NOT NULL,
  `part_photo_url` text COMMENT 'URL da foto da peça no momento do uso',
  `quantity` int NOT NULL DEFAULT 1,
  `unit` varchar(20) DEFAULT 'un',
  `unit_cost` varchar(20) COMMENT 'Valor unitário no momento do uso',
  `total_cost` varchar(20) COMMENT 'Valor total (qty * unit_cost)',
  `from_stock` int DEFAULT 1 COMMENT '1 = baixou do estoque, 0 = avulso',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mp_maintenance` (`maintenance_id`),
  KEY `fk_mp_part` (`part_id`),
  CONSTRAINT `fk_mp_maintenance` FOREIGN KEY (`maintenance_id`) REFERENCES `equipment_maintenance` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mp_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Movimentações de Estoque de Peças
-- (histórico de entradas e saídas de cada peça)
CREATE TABLE IF NOT EXISTS `parts_stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `part_id` int NOT NULL,
  `type` enum('entrada','saida') NOT NULL COMMENT 'entrada = compra, saida = uso em manutenção',
  `quantity` int NOT NULL,
  `reason` varchar(255) DEFAULT NULL COMMENT 'Motivo da movimentação',
  `reference_id` int DEFAULT NULL COMMENT 'ID da manutenção ou pedido relacionado',
  `reference_type` varchar(50) DEFAULT NULL COMMENT 'maintenance, purchase, etc.',
  `unit_cost` varchar(20) DEFAULT NULL,
  `notes` text,
  `registered_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_psm_part` (`part_id`),
  CONSTRAINT `fk_psm_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FIM DO SCRIPT
-- Após executar, as 4 tabelas estarão disponíveis:
--   maintenance_templates
--   maintenance_template_parts
--   maintenance_parts
--   parts_stock_movements
-- ============================================================
