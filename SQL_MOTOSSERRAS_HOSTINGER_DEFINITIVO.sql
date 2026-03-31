-- ============================================================
-- SQL MOTOSSERRAS - BTREE AMBIENTAL - VERSÃO DEFINITIVA
-- Execute no phpMyAdmin da Hostinger (banco u629128033_btree_ambienta)
-- 
-- ATENÇÃO: Este script APAGA as tabelas antigas com estrutura errada
-- e recria com a estrutura correta. Execute tudo de uma vez.
-- ============================================================

-- 1. Remover tabelas antigas com estrutura errada (se existirem)
DROP TABLE IF EXISTS `chainsaw_os_parts`;
DROP TABLE IF EXISTS `fuel_supply_events`;

-- 2. Corrigir tabela chainsaws (adicionar colunas faltantes e corrigir enum)
ALTER TABLE `chainsaws` 
  ADD COLUMN IF NOT EXISTS `brand` varchar(100) DEFAULT NULL AFTER `name`,
  ADD COLUMN IF NOT EXISTS `created_by` int(11) DEFAULT NULL;

ALTER TABLE `chainsaws` MODIFY COLUMN `status` enum('ativa','oficina','inativa') NOT NULL DEFAULT 'ativa';
ALTER TABLE `chainsaws` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `chainsaws` DROP COLUMN IF EXISTS `updated_at`;

-- 3. Corrigir tabela fuel_containers
ALTER TABLE `fuel_containers`
  ADD COLUMN IF NOT EXISTS `color` varchar(30) DEFAULT 'vermelho',
  ADD COLUMN IF NOT EXISTS `type` enum('puro','mistura') NOT NULL DEFAULT 'puro',
  ADD COLUMN IF NOT EXISTS `capacity_liters` varchar(10) DEFAULT '20',
  ADD COLUMN IF NOT EXISTS `current_volume_liters` varchar(10) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS `is_active` int(11) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `notes` text DEFAULT NULL;

ALTER TABLE `fuel_containers` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `fuel_containers` DROP COLUMN IF EXISTS `fuel_type`;
ALTER TABLE `fuel_containers` DROP COLUMN IF EXISTS `mix_ratio_oil_ml_per_liter`;
ALTER TABLE `fuel_containers` DROP COLUMN IF EXISTS `current_liters`;
ALTER TABLE `fuel_containers` DROP COLUMN IF EXISTS `updated_at`;

-- 4. Criar tabela fuel_container_events (nome correto)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Corrigir tabela chainsaw_chain_stock
ALTER TABLE `chainsaw_chain_stock` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `chainsaw_chain_stock` DROP COLUMN IF EXISTS `updated_at`;
ALTER TABLE `chainsaw_chain_stock` ADD COLUMN IF NOT EXISTS `sharpened_in_box` int(11) NOT NULL DEFAULT 0;
ALTER TABLE `chainsaw_chain_stock` ADD COLUMN IF NOT EXISTS `in_field` int(11) NOT NULL DEFAULT 0;
ALTER TABLE `chainsaw_chain_stock` ADD COLUMN IF NOT EXISTS `in_workshop` int(11) NOT NULL DEFAULT 0;
ALTER TABLE `chainsaw_chain_stock` ADD COLUMN IF NOT EXISTS `total_stock` int(11) NOT NULL DEFAULT 0;

-- 6. Criar tabela chainsaw_chain_events (nome correto)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Corrigir tabela chainsaw_parts
ALTER TABLE `chainsaw_parts`
  ADD COLUMN IF NOT EXISTS `code` varchar(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `category` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `unit` varchar(20) DEFAULT 'un',
  ADD COLUMN IF NOT EXISTS `current_stock` varchar(20) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS `min_stock` varchar(20) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS `unit_cost` varchar(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `is_active` int(11) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `created_by` int(11) DEFAULT NULL;

ALTER TABLE `chainsaw_parts` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 8. Criar tabela chainsaw_part_movements (nome correto)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Corrigir tabela chainsaw_service_orders
ALTER TABLE `chainsaw_service_orders`
  ADD COLUMN IF NOT EXISTS `problem_type` enum('motor_falhando','nao_liga','superaquecimento','vazamento','corrente_problema','sabre_problema','manutencao_preventiva','outro') NOT NULL DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS `priority` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS `mechanic_id` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `service_description` text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `completed_at` timestamp NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `opened_by` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `opened_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE `chainsaw_service_orders` MODIFY COLUMN `status` enum('aberta','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'aberta';
ALTER TABLE `chainsaw_service_orders` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `chainsaw_service_orders` DROP COLUMN IF EXISTS `updated_at`;

-- 10. Criar tabela chainsaw_service_parts (nome correto)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- MIGRAÇÃO AUTOMÁTICA: Copiar motosserras do módulo antigo
-- Busca equipamentos do tipo "Motosserra" na tabela equipment
-- ============================================================
INSERT INTO `chainsaws` (`name`, `brand`, `model`, `serial_number`, `chain_type`, `status`, `created_at`)
SELECT 
  e.name,
  e.brand,
  e.model,
  e.serial_number,
  '30' AS chain_type,
  'ativa' AS status,
  e.created_at
FROM `equipment` e
JOIN `equipment_types` et ON e.type_id = et.id
WHERE (LOWER(et.name) LIKE '%motosserra%' OR LOWER(e.name) LIKE '%motosserra%')
  AND NOT EXISTS (
    SELECT 1 FROM `chainsaws` c WHERE c.name = e.name
  );

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
