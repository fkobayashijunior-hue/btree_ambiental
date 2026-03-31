-- ============================================================
-- SQL MOTOSSERRAS - BTREE AMBIENTAL
-- Versão simples: apenas CREATE TABLE IF NOT EXISTS
-- Compatível com MySQL 5.7+ (Hostinger)
-- Execute no phpMyAdmin: selecione o banco e cole este SQL
-- ============================================================

-- 1. MOTOSSERRAS
CREATE TABLE IF NOT EXISTS `chainsaws` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Ex: Motosserra 01',
  `model` varchar(100) DEFAULT NULL COMMENT 'Ex: Stihl MS 381',
  `serial_number` varchar(100) DEFAULT NULL,
  `status` enum('field','workshop','inactive') NOT NULL DEFAULT 'workshop' COMMENT 'field=campo, workshop=oficina, inactive=inativa',
  `chain_type` varchar(20) DEFAULT NULL COMMENT 'Ex: 30 ou 34 dentes',
  `notes` text DEFAULT NULL,
  `created_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  `updated_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. GALÕES DE COMBUSTÍVEL
CREATE TABLE IF NOT EXISTS `fuel_containers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Ex: Galão Vermelho, Galão Verde',
  `color` varchar(20) NOT NULL DEFAULT 'red' COMMENT 'red=vermelho (puro), green=verde (mistura)',
  `fuel_type` enum('pure','mix') NOT NULL DEFAULT 'pure' COMMENT 'pure=gasolina pura, mix=mistura 2T',
  `capacity_liters` decimal(6,2) NOT NULL DEFAULT 20.00 COMMENT 'Capacidade total em litros',
  `current_liters` decimal(6,2) NOT NULL DEFAULT 0.00 COMMENT 'Volume atual em litros',
  `mix_ratio_oil_ml_per_liter` decimal(6,2) DEFAULT NULL COMMENT 'ml de óleo 2T por litro (ex: 20ml/L para 400ml em 20L)',
  `created_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  `updated_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. EVENTOS DE ABASTECIMENTO DE GALÕES
CREATE TABLE IF NOT EXISTS `fuel_supply_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `container_id` int(11) NOT NULL COMMENT 'Galão abastecido',
  `event_type` enum('supply','usage','transfer') NOT NULL DEFAULT 'supply' COMMENT 'supply=abastecimento, usage=uso no campo, transfer=transferência entre galões',
  `liters` decimal(6,2) NOT NULL COMMENT 'Litros adicionados ou removidos',
  `cost` decimal(10,2) DEFAULT NULL COMMENT 'Custo do abastecimento (para financeiro)',
  `source_container_id` int(11) DEFAULT NULL COMMENT 'Galão de origem (para transferência)',
  `chainsaw_id` int(11) DEFAULT NULL COMMENT 'Motosserra abastecida (para uso no campo)',
  `notes` text DEFAULT NULL,
  `registered_by` varchar(100) DEFAULT NULL,
  `event_date` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  `created_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  PRIMARY KEY (`id`),
  KEY `idx_fuel_supply_container` (`container_id`),
  KEY `idx_fuel_supply_date` (`event_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ESTOQUE DE CORRENTES
CREATE TABLE IF NOT EXISTS `chainsaw_chain_stock` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chain_type` varchar(20) NOT NULL COMMENT 'Ex: 30, 34 (dentes)',
  `qty_sharpened` int(11) NOT NULL DEFAULT 0 COMMENT 'Correntes afiadas em caixa (prontas para uso)',
  `qty_field` int(11) NOT NULL DEFAULT 0 COMMENT 'Correntes em campo (em uso nas motosserras)',
  `qty_workshop` int(11) NOT NULL DEFAULT 0 COMMENT 'Correntes na oficina (aguardando afiação)',
  `qty_total_stock` int(11) NOT NULL DEFAULT 0 COMMENT 'Total em estoque (novas, para substituição)',
  `created_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  `updated_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chain_type` (`chain_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. MOVIMENTAÇÕES DE CORRENTES
CREATE TABLE IF NOT EXISTS `chainsaw_chain_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chain_type` varchar(20) NOT NULL COMMENT 'Tipo de corrente (30 ou 34 dentes)',
  `event_type` enum('send_field','return_workshop','sharpen_done','stock_out','stock_in') NOT NULL
    COMMENT 'send_field=enviar para campo, return_workshop=retornar para oficina, sharpen_done=afiação concluída, stock_out=baixa de estoque, stock_in=entrada de estoque',
  `quantity` int(11) NOT NULL DEFAULT 1,
  `chainsaw_id` int(11) DEFAULT NULL COMMENT 'Motosserra relacionada',
  `notes` text DEFAULT NULL COMMENT 'Observações para o mecânico (ex: precisa baixar guias)',
  `registered_by` varchar(100) DEFAULT NULL,
  `event_date` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  `created_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  PRIMARY KEY (`id`),
  KEY `idx_chain_events_type` (`chain_type`),
  KEY `idx_chain_events_date` (`event_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. PEÇAS E CONSUMÍVEIS DO SETOR MOTOSSERRA
CREATE TABLE IF NOT EXISTS `chainsaw_parts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) DEFAULT NULL COMMENT 'Código interno da peça',
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `unit` varchar(20) NOT NULL DEFAULT 'un' COMMENT 'Unidade: un, L, ml, kg, m',
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `stock_qty` decimal(10,3) NOT NULL DEFAULT 0.000 COMMENT 'Quantidade em estoque',
  `min_stock` decimal(10,3) DEFAULT NULL COMMENT 'Estoque mínimo para alerta',
  `notes` text DEFAULT NULL,
  `created_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  `updated_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  PRIMARY KEY (`id`),
  KEY `idx_chainsaw_parts_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. MOVIMENTAÇÕES DE ESTOQUE DE PEÇAS
CREATE TABLE IF NOT EXISTS `chainsaw_parts_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `part_id` int(11) NOT NULL,
  `event_type` enum('in','out') NOT NULL COMMENT 'in=entrada, out=saída',
  `quantity` decimal(10,3) NOT NULL,
  `reason` varchar(200) DEFAULT NULL COMMENT 'Motivo: compra, uso em OS, uso no campo, etc.',
  `service_order_id` int(11) DEFAULT NULL COMMENT 'OS relacionada (se saída por OS)',
  `registered_by` varchar(100) DEFAULT NULL,
  `event_date` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  `created_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  PRIMARY KEY (`id`),
  KEY `idx_chainsaw_parts_events_part` (`part_id`),
  KEY `idx_chainsaw_parts_events_date` (`event_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. ORDENS DE SERVIÇO (OS) DE MOTOSSERRAS
CREATE TABLE IF NOT EXISTS `chainsaw_service_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chainsaw_id` int(11) NOT NULL COMMENT 'Motosserra com problema',
  `problem_description` text NOT NULL COMMENT 'Descrição do problema reportado',
  `reported_by` varchar(100) DEFAULT NULL COMMENT 'Quem reportou o problema',
  `status` enum('open','in_progress','done') NOT NULL DEFAULT 'open'
    COMMENT 'open=aberta, in_progress=em andamento, done=concluída',
  `assigned_to` varchar(100) DEFAULT NULL COMMENT 'Mecânico responsável',
  `resolution_notes` text DEFAULT NULL COMMENT 'O que foi feito para resolver',
  `started_at` bigint(20) DEFAULT NULL,
  `completed_at` bigint(20) DEFAULT NULL,
  `created_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  `updated_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  PRIMARY KEY (`id`),
  KEY `idx_chainsaw_os_chainsaw` (`chainsaw_id`),
  KEY `idx_chainsaw_os_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. PEÇAS USADAS POR OS
CREATE TABLE IF NOT EXISTS `chainsaw_os_parts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_order_id` int(11) NOT NULL,
  `part_id` int(11) NOT NULL,
  `quantity` decimal(10,3) NOT NULL DEFAULT 1.000,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `created_at` bigint(20) NOT NULL DEFAULT (UNIX_TIMESTAMP() * 1000),
  PRIMARY KEY (`id`),
  KEY `idx_chainsaw_os_parts_os` (`service_order_id`),
  KEY `idx_chainsaw_os_parts_part` (`part_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VERIFICAÇÃO FINAL: listar tabelas criadas
-- ============================================================
SELECT table_name AS 'Tabela Criada', table_rows AS 'Registros'
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'chainsaws', 'fuel_containers', 'fuel_supply_events',
    'chainsaw_chain_stock', 'chainsaw_chain_events',
    'chainsaw_parts', 'chainsaw_parts_events',
    'chainsaw_service_orders', 'chainsaw_os_parts'
  )
ORDER BY table_name;
