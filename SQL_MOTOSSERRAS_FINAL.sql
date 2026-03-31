-- ============================================================
-- SQL MOTOSSERRAS - BTREE AMBIENTAL
-- Apenas CREATE TABLE IF NOT EXISTS (sem PROCEDURE, sem information_schema)
-- Compatível com Hostinger MySQL 5.7+
-- ============================================================

CREATE TABLE IF NOT EXISTS `chainsaws` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `model` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `status` enum('field','workshop','inactive') NOT NULL DEFAULT 'workshop',
  `chain_type` varchar(20) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` bigint(20) NOT NULL DEFAULT 0,
  `updated_at` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fuel_containers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `color` varchar(20) NOT NULL DEFAULT 'red',
  `fuel_type` enum('pure','mix') NOT NULL DEFAULT 'pure',
  `capacity_liters` decimal(6,2) NOT NULL DEFAULT 20.00,
  `current_liters` decimal(6,2) NOT NULL DEFAULT 0.00,
  `mix_ratio_oil_ml_per_liter` decimal(6,2) DEFAULT NULL,
  `created_at` bigint(20) NOT NULL DEFAULT 0,
  `updated_at` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `fuel_supply_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `container_id` int(11) NOT NULL,
  `event_type` enum('supply','usage','transfer') NOT NULL DEFAULT 'supply',
  `liters` decimal(6,2) NOT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `source_container_id` int(11) DEFAULT NULL,
  `chainsaw_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `registered_by` varchar(100) DEFAULT NULL,
  `event_date` bigint(20) NOT NULL DEFAULT 0,
  `created_at` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chainsaw_chain_stock` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chain_type` varchar(20) NOT NULL,
  `qty_sharpened` int(11) NOT NULL DEFAULT 0,
  `qty_field` int(11) NOT NULL DEFAULT 0,
  `qty_workshop` int(11) NOT NULL DEFAULT 0,
  `qty_total_stock` int(11) NOT NULL DEFAULT 0,
  `created_at` bigint(20) NOT NULL DEFAULT 0,
  `updated_at` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chain_type` (`chain_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chainsaw_chain_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chain_type` varchar(20) NOT NULL,
  `event_type` enum('send_field','return_workshop','sharpen_done','stock_out','stock_in') NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `chainsaw_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `registered_by` varchar(100) DEFAULT NULL,
  `event_date` bigint(20) NOT NULL DEFAULT 0,
  `created_at` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chainsaw_parts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `unit` varchar(20) NOT NULL DEFAULT 'un',
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `stock_qty` decimal(10,3) NOT NULL DEFAULT 0.000,
  `min_stock` decimal(10,3) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` bigint(20) NOT NULL DEFAULT 0,
  `updated_at` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chainsaw_parts_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `part_id` int(11) NOT NULL,
  `event_type` enum('in','out') NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `reason` varchar(200) DEFAULT NULL,
  `service_order_id` int(11) DEFAULT NULL,
  `registered_by` varchar(100) DEFAULT NULL,
  `event_date` bigint(20) NOT NULL DEFAULT 0,
  `created_at` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chainsaw_service_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chainsaw_id` int(11) NOT NULL,
  `problem_description` text NOT NULL,
  `reported_by` varchar(100) DEFAULT NULL,
  `status` enum('open','in_progress','done') NOT NULL DEFAULT 'open',
  `assigned_to` varchar(100) DEFAULT NULL,
  `resolution_notes` text DEFAULT NULL,
  `started_at` bigint(20) DEFAULT NULL,
  `completed_at` bigint(20) DEFAULT NULL,
  `created_at` bigint(20) NOT NULL DEFAULT 0,
  `updated_at` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chainsaw_os_parts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_order_id` int(11) NOT NULL,
  `part_id` int(11) NOT NULL,
  `quantity` decimal(10,3) NOT NULL DEFAULT 1.000,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `created_at` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
