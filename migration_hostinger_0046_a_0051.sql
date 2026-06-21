-- ============================================================
-- SCRIPT DE MIGRAÇÃO BTREE AMBIENTAL — Hostinger
-- Migrações: 0046 até 0051 (últimas 6 migrações do sistema)
-- 
-- COMO EXECUTAR:
--   Opção A — phpMyAdmin: Abrir banco → aba "SQL" → colar e executar
--   Opção B — Terminal:
--     mysql -h HOST -u USUARIO -p BANCO < migration_hostinger_0046_a_0051.sql
--
-- IMPORTANTE: Use "IF NOT EXISTS" e "ADD COLUMN IF NOT EXISTS" para
-- evitar erros caso alguma migração já tenha sido parcialmente aplicada.
-- ============================================================

-- ── 0046: Terceirizados de corte + campos de pagamento de frete nas cargas ──

CREATE TABLE IF NOT EXISTS `third_party_contractors` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `rate_per_m3` varchar(20) NOT NULL DEFAULT '0',
  `phone` varchar(30),
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

ALTER TABLE `cargo_destinations`
  ADD COLUMN IF NOT EXISTS `client_id` int,
  ADD COLUMN IF NOT EXISTS `price_per_ton` varchar(20),
  ADD COLUMN IF NOT EXISTS `price_per_m3` varchar(20),
  ADD COLUMN IF NOT EXISTS `price_type` varchar(10) DEFAULT 'ton';

ALTER TABLE `cargo_loads`
  ADD COLUMN IF NOT EXISTS `third_party_contractor` varchar(255),
  ADD COLUMN IF NOT EXISTS `third_party_cost` varchar(20),
  ADD COLUMN IF NOT EXISTS `third_party_paid` tinyint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `third_party_paid_at` datetime,
  ADD COLUMN IF NOT EXISTS `third_party_payment_notes` text;

-- ── 0047: Registros de óleo de equipamentos + campos extras ──

CREATE TABLE IF NOT EXISTS `equipment_oil_records` (
  `id` int AUTO_INCREMENT NOT NULL,
  `equipment_id` int NOT NULL,
  `date` timestamp NOT NULL,
  `hour_meter` varchar(20),
  `oil_type` enum('hidraulico','motor','transmissao','diferencial','outros') NOT NULL,
  `quantity_liters` varchar(20) NOT NULL,
  `brand` varchar(100),
  `supplier` varchar(255),
  `price_per_liter` varchar(20),
  `total_value` varchar(20),
  `notes` text,
  `registered_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

ALTER TABLE `extra_expenses`
  ADD COLUMN IF NOT EXISTS `equipment_id` int;

ALTER TABLE `financial_entries`
  ADD COLUMN IF NOT EXISTS `equipment_id` int,
  ADD COLUMN IF NOT EXISTS `equipment_name` varchar(255);

ALTER TABLE `machine_hours`
  ADD COLUMN IF NOT EXISTS `source` enum('manual','gps') DEFAULT 'manual' NOT NULL;

-- ── 0048: Viagens automáticas de frete + campos de destino e equipamento ──

CREATE TABLE IF NOT EXISTS `auto_freight_trips` (
  `id` int AUTO_INCREMENT NOT NULL,
  `equipment_id` int NOT NULL,
  `equipment_name` varchar(255),
  `traccar_device_id` int,
  `trip_date` varchar(10) NOT NULL,
  `start_time` varchar(30),
  `end_time` varchar(30),
  `distance_km` varchar(20),
  `duration_minutes` int,
  `start_address` text,
  `end_address` text,
  `fuel_cost` varchar(20) DEFAULT '0',
  `maintenance_cost` varchar(20) DEFAULT '0',
  `total_cost` varchar(20) DEFAULT '0',
  `status` enum('detectado','confirmado','ignorado') NOT NULL DEFAULT 'detectado',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
);

ALTER TABLE `cargo_destinations`
  ADD COLUMN IF NOT EXISTS `is_buyer` tinyint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `cnpj_cpf` varchar(30),
  ADD COLUMN IF NOT EXISTS `inscricao_estadual` varchar(30),
  ADD COLUMN IF NOT EXISTS `phone` varchar(30),
  ADD COLUMN IF NOT EXISTS `email` varchar(255),
  ADD COLUMN IF NOT EXISTS `cep` varchar(10),
  ADD COLUMN IF NOT EXISTS `contact_person` varchar(255),
  ADD COLUMN IF NOT EXISTS `product` varchar(255),
  ADD COLUMN IF NOT EXISTS `payment_method` varchar(100),
  ADD COLUMN IF NOT EXISTS `price_per_unit` varchar(20),
  ADD COLUMN IF NOT EXISTS `unit` varchar(20) DEFAULT 'ton';

ALTER TABLE `equipment`
  ADD COLUMN IF NOT EXISTS `category` enum('maquina','veiculo','caminhao') DEFAULT 'maquina',
  ADD COLUMN IF NOT EXISTS `accumulated_hours` varchar(20) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS `accumulated_km` varchar(20) DEFAULT '0';

-- ── 0049: Compras, cotações, fornecedores ──

CREATE TABLE IF NOT EXISTS `purchase_categories` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(100) NOT NULL,
  `color` varchar(20) NOT NULL DEFAULT '#6B7280',
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `purchase_request_items` (
  `id` int AUTO_INCREMENT NOT NULL,
  `request_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `quantity` varchar(50) NOT NULL,
  `unit` varchar(50),
  `notes` text,
  `confirmed` tinyint NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `purchase_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `images` text,
  `link_url` varchar(500),
  `category_id` int,
  `status` enum('pendente','lida','aprovada','comprada','recebida','cancelada') NOT NULL DEFAULT 'pendente',
  `urgency` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
  `request_date` timestamp NOT NULL DEFAULT (now()),
  `read_date` timestamp,
  `purchase_date` timestamp,
  `expected_arrival` timestamp,
  `received_date` timestamp,
  `items_confirmed_date` timestamp,
  `requested_by` int,
  `approved_by` int,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `quotations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `supplier_id` int NOT NULL,
  `category_id` int,
  `request_id` int,
  `product_name` varchar(255) NOT NULL,
  `unit` varchar(50),
  `price` varchar(30) NOT NULL,
  `quotation_date` timestamp NOT NULL DEFAULT (now()),
  `notes` text,
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` varchar(500),
  `city` varchar(100),
  `state` varchar(2),
  `phone` varchar(30),
  `whatsapp` varchar(30),
  `email` varchar(255),
  `website` varchar(500),
  `notes` text,
  `active` tinyint NOT NULL DEFAULT 1,
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- ── 0050: Geofences, ciclos de frete, cotações formais, verificação de notas ──

CREATE TABLE IF NOT EXISTS `farm_geofences` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `latitude` varchar(30) NOT NULL,
  `longitude` varchar(30) NOT NULL,
  `radius_meters` int NOT NULL DEFAULT 500,
  `equipment_id` int,
  `active` tinyint NOT NULL DEFAULT 1,
  `notes` text,
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `freight_cycles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `equipment_id` int,
  `geofence_id` int,
  `driver_collaborator_id` int,
  `driver_name` varchar(255),
  `status` enum('em_fazenda','em_transito','concluido','cancelado') NOT NULL DEFAULT 'em_fazenda',
  `arrived_farm_at` timestamp,
  `left_farm_at` timestamp,
  `returned_farm_at` timestamp,
  `start_lat` varchar(30),
  `start_lng` varchar(30),
  `end_lat` varchar(30),
  `end_lng` varchar(30),
  `distance_km` varchar(20),
  `cargo_load_id` int,
  `destination` varchar(255),
  `total_fuel_cost` varchar(20) DEFAULT '0',
  `total_maintenance_cost` varchar(20) DEFAULT '0',
  `total_cost` varchar(20) DEFAULT '0',
  `trajectory_json` text,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `quotation_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `title` varchar(255) NOT NULL,
  `requester_id` int,
  `requester_name` varchar(255),
  `requester_phone` varchar(30),
  `requester_email` varchar(255),
  `items_json` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `expires_at` bigint NOT NULL,
  `status` enum('ativa','respondida','expirada','cancelada') NOT NULL DEFAULT 'ativa',
  `notes` text,
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `quotation_responses` (
  `id` int AUTO_INCREMENT NOT NULL,
  `quotation_request_id` int NOT NULL,
  `supplier_name` varchar(255) NOT NULL,
  `cnpj` varchar(30),
  `address` text,
  `seller_name` varchar(255),
  `seller_phone` varchar(30),
  `seller_email` varchar(255),
  `items_json` text NOT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
);

ALTER TABLE `cargo_loads`
  ADD COLUMN IF NOT EXISTS `invoice_checked` int DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS `invoice_checked_at` bigint DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS `invoice_checked_by` int,
  ADD COLUMN IF NOT EXISTS `invoice_checked_by_name` varchar(255);

-- ── 0051: Tarifas de frete terceirizado + combustível de terceirizados ──

CREATE TABLE IF NOT EXISTS `freight_rates` (
  `id` int AUTO_INCREMENT NOT NULL,
  `worksite` varchar(255) NOT NULL,
  `destination` varchar(255) NOT NULL,
  `rate_per_ton` varchar(20) NOT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `third_party_fuel` (
  `id` int AUTO_INCREMENT NOT NULL,
  `equipment_id` int NOT NULL,
  `date` timestamp NOT NULL,
  `liters` varchar(20) NOT NULL,
  `price_per_liter` varchar(20) NOT NULL,
  `total` varchar(20) NOT NULL,
  `location` varchar(255),
  `notes` text,
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
);

ALTER TABLE `equipment`
  ADD COLUMN IF NOT EXISTS `is_third_party` tinyint DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS `third_party_owner` varchar(255);

-- Remover coluna updated_at de quotation_requests (pode ignorar erro se não existir)
ALTER TABLE `quotation_requests` DROP COLUMN IF EXISTS `updated_at`;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
