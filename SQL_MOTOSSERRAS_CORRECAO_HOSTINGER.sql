-- ============================================================
-- SQL CORREÇÃO MOTOSSERRAS - BTREE AMBIENTAL
-- Execute no phpMyAdmin da Hostinger (banco u629128033_btree_ambienta)
-- Este script CORRIGE as tabelas criadas com estrutura errada
-- e adiciona as colunas faltantes
-- ============================================================

-- 1. CORRIGIR TABELA chainsaws
--    Problema: status em inglês (field/workshop/inactive) e faltam colunas brand e created_by

-- Adicionar coluna brand se não existir
ALTER TABLE `chainsaws` ADD COLUMN IF NOT EXISTS `brand` varchar(100) DEFAULT NULL AFTER `name`;

-- Adicionar coluna created_by se não existir
ALTER TABLE `chainsaws` ADD COLUMN IF NOT EXISTS `created_by` int(11) DEFAULT NULL;

-- Corrigir o enum de status para português
ALTER TABLE `chainsaws` MODIFY COLUMN `status` enum('ativa','oficina','inativa') NOT NULL DEFAULT 'ativa';

-- Corrigir created_at e updated_at para TIMESTAMP (o código usa timestamp, não bigint)
ALTER TABLE `chainsaws` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `chainsaws` DROP COLUMN IF EXISTS `updated_at`;

-- 2. CORRIGIR TABELA fuel_containers
--    Problema: colunas com nomes diferentes e enum em inglês

-- Renomear fuel_type → type (se existir com nome errado)
ALTER TABLE `fuel_containers` ADD COLUMN IF NOT EXISTS `type` enum('puro','mistura') NOT NULL DEFAULT 'puro';
ALTER TABLE `fuel_containers` ADD COLUMN IF NOT EXISTS `color` varchar(30) DEFAULT 'vermelho';
ALTER TABLE `fuel_containers` ADD COLUMN IF NOT EXISTS `capacity_liters` varchar(10) DEFAULT '20';
ALTER TABLE `fuel_containers` ADD COLUMN IF NOT EXISTS `current_volume_liters` varchar(10) DEFAULT '0';
ALTER TABLE `fuel_containers` ADD COLUMN IF NOT EXISTS `is_active` int(11) DEFAULT 1;
ALTER TABLE `fuel_containers` ADD COLUMN IF NOT EXISTS `notes` text DEFAULT NULL;
ALTER TABLE `fuel_containers` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `fuel_containers` DROP COLUMN IF EXISTS `updated_at`;
ALTER TABLE `fuel_containers` DROP COLUMN IF EXISTS `fuel_type`;
ALTER TABLE `fuel_containers` DROP COLUMN IF EXISTS `mix_ratio_oil_ml_per_liter`;
ALTER TABLE `fuel_containers` DROP COLUMN IF EXISTS `current_liters`;

-- 3. RECRIAR TABELA fuel_container_events (nome diferente do SQL antigo que usava fuel_supply_events)
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

-- 4. CORRIGIR TABELA chainsaw_chain_stock
ALTER TABLE `chainsaw_chain_stock` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `chainsaw_chain_stock` DROP COLUMN IF EXISTS `updated_at`;

-- 5. RECRIAR TABELA chainsaw_chain_events (nome diferente do SQL antigo)
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

-- 6. CORRIGIR TABELA chainsaw_parts
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `code` varchar(50) DEFAULT NULL AFTER `id`;
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `category` varchar(100) DEFAULT NULL;
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `unit` varchar(20) DEFAULT 'un';
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `current_stock` varchar(20) DEFAULT '0';
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `min_stock` varchar(20) DEFAULT '0';
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `unit_cost` varchar(20) DEFAULT NULL;
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `is_active` int(11) DEFAULT 1;
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `created_by` int(11) DEFAULT NULL;
ALTER TABLE `chainsaw_parts` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 7. RECRIAR TABELA chainsaw_part_movements (nome diferente)
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

-- 8. CORRIGIR TABELA chainsaw_service_orders
--    Problema: colunas com nomes diferentes e enum em inglês
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `problem_type` enum('motor_falhando','nao_liga','superaquecimento','vazamento','corrente_problema','sabre_problema','manutencao_preventiva','outro') NOT NULL DEFAULT 'outro' AFTER `chainsaw_id`;
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `priority` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media';
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `mechanic_id` int(11) DEFAULT NULL;
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `service_description` text DEFAULT NULL;
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `completed_at` timestamp NULL DEFAULT NULL;
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `opened_by` int(11) DEFAULT NULL;
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `opened_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `chainsaw_service_orders` MODIFY COLUMN `status` enum('aberta','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'aberta';
ALTER TABLE `chainsaw_service_orders` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `chainsaw_service_orders` DROP COLUMN IF EXISTS `updated_at`;

-- 9. RECRIAR TABELA chainsaw_service_parts (o SQL antigo criou chainsaw_os_parts com nome errado)
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
-- MIGRAÇÃO: Copiar motosserras do módulo antigo (equipment) para chainsaws
-- Busca equipamentos do tipo "Motosserra" na tabela equipment
-- ============================================================
INSERT INTO `chainsaws` (`name`, `brand`, `model`, `serial_number`, `chain_type`, `status`, `created_at`)
SELECT 
  e.name,
  e.brand,
  e.model,
  e.serial_number,
  '30' as chain_type,
  'ativa' as status,
  e.created_at
FROM `equipment` e
JOIN `equipment_types` et ON e.type_id = et.id
WHERE LOWER(et.name) LIKE '%motosserra%'
  AND NOT EXISTS (
    SELECT 1 FROM `chainsaws` c WHERE c.name = e.name
  );

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
