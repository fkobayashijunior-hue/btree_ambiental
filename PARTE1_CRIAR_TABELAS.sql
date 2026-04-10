-- ================================================================
-- BTREE AMBIENTAL - Script SQL Consolidado SEGURO para Hostinger
-- Gerado em: 2026-04-10 (V3 - Reordenado)
-- 
-- INSTRUÇÕES:
-- 1. Execute este script no phpMyAdmin da Hostinger
-- 2. É seguro executar múltiplas vezes (idempotente)
-- 3. Tabelas existentes NÃO serão recriadas
-- 4. Colunas existentes NÃO serão duplicadas
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ================================================================
-- FASE 1: CRIAR TODAS AS TABELAS
-- ================================================================

-- Tabela: users
CREATE TABLE IF NOT EXISTS `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

-- Tabela: attendance_records
CREATE TABLE IF NOT EXISTS `attendance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`employment_type` enum('clt','terceirizado','diarista') NOT NULL,
	`daily_value` varchar(20) NOT NULL,
	`pix_key` varchar(255) NOT NULL,
	`function` varchar(100) NOT NULL,
	`observations` text,
	`payment_status` enum('pendente','pago','atrasado','cancelado') NOT NULL DEFAULT 'pendente',
	`paid_at` timestamp,
	`paid_by` int,
	`registered_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_records_id` PRIMARY KEY(`id`)
);

-- Tabela: cargo_shipments
CREATE TABLE IF NOT EXISTS `cargo_shipments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`truck_id` int NOT NULL,
	`driver_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`height` varchar(20) NOT NULL,
	`width` varchar(20) NOT NULL,
	`length` varchar(20) NOT NULL,
	`volume` varchar(20) NOT NULL,
	`destination` varchar(255),
	`invoice_number` varchar(100),
	`wood_type` varchar(100),
	`client` varchar(255),
	`images_urls` text,
	`registered_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cargo_shipments_id` PRIMARY KEY(`id`)
);

-- Tabela: equipment
CREATE TABLE IF NOT EXISTS `equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`brand` varchar(100),
	`model` varchar(100),
	`year` int,
	`serial_number` varchar(100),
	`image_url` text,
	`status` enum('ativo','manutencao','inativo') NOT NULL DEFAULT 'ativo',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`)
);

-- Tabela: equipment_types
CREATE TABLE IF NOT EXISTS `equipment_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_types_id` PRIMARY KEY(`id`)
);

-- Tabela: fuel_records
CREATE TABLE IF NOT EXISTS `fuel_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`operator_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`fuel_type` enum('diesel','gasolina','mistura_2t') NOT NULL,
	`liters` varchar(20) NOT NULL,
	`total_value` varchar(20) NOT NULL,
	`price_per_liter` varchar(20),
	`odometer` varchar(20),
	`station` varchar(255),
	`invoice_url` text,
	`odometer_image_url` text,
	`registered_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fuel_records_id` PRIMARY KEY(`id`)
);

-- Tabela: user_profiles
CREATE TABLE IF NOT EXISTS `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`profile_type` enum('administrativo','encarregado','mecanico','motosserrista','carregador','operador','motorista','terceirizado') NOT NULL,
	`cpf` varchar(14),
	`phone` varchar(20),
	`pix_key` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`)
);

-- Tabela: password_reset_tokens
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);

-- Tabela: biometric_attendance
CREATE TABLE IF NOT EXISTS `biometric_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collaborator_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`check_in_time` timestamp NOT NULL,
	`check_out_time` timestamp,
	`location` varchar(255),
	`latitude` varchar(20),
	`longitude` varchar(20),
	`photo_url` text,
	`confidence` varchar(10),
	`registered_by` int NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `biometric_attendance_id` PRIMARY KEY(`id`)
);

-- Tabela: collaborators
CREATE TABLE IF NOT EXISTS `collaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`cpf` varchar(14),
	`rg` varchar(20),
	`address` varchar(500),
	`city` varchar(100),
	`state` varchar(2),
	`zip_code` varchar(10),
	`photo_url` text,
	`face_descriptor` text,
	`role` enum('administrativo','encarregado','mecanico','motosserrista','carregador','operador','motorista','terceirizado') NOT NULL DEFAULT 'operador',
	`pix_key` varchar(255),
	`daily_rate` varchar(20),
	`employment_type` enum('clt','terceirizado','diarista') DEFAULT 'diarista',
	`shirt_size` enum('PP','P','M','G','GG','XGG'),
	`pants_size` varchar(10),
	`shoe_size` varchar(5),
	`boot_size` varchar(5),
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `collaborators_id` PRIMARY KEY(`id`)
);

-- Tabela: role_permissions
CREATE TABLE IF NOT EXISTS `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_name` varchar(50) NOT NULL,
	`module` varchar(50) NOT NULL,
	`can_view` int NOT NULL DEFAULT 0,
	`can_create` int NOT NULL DEFAULT 0,
	`can_edit` int NOT NULL DEFAULT 0,
	`can_delete` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updated_by` int,
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`)
);

-- Tabela: sectors
CREATE TABLE IF NOT EXISTS `sectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(20) DEFAULT '#16a34a',
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `sectors_id` PRIMARY KEY(`id`)
);

-- Tabela: cargo_loads
CREATE TABLE IF NOT EXISTS `cargo_loads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`vehicle_id` int,
	`vehicle_plate` varchar(20),
	`driver_collaborator_id` int,
	`driver_name` varchar(255),
	`height_m` varchar(20) NOT NULL,
	`width_m` varchar(20) NOT NULL,
	`length_m` varchar(20) NOT NULL,
	`volume_m3` varchar(20) NOT NULL,
	`wood_type` varchar(100),
	`destination` varchar(255),
	`invoice_number` varchar(100),
	`client_id` int,
	`client_name` varchar(255),
	`photos_json` text,
	`notes` text,
	`status` enum('pendente','entregue','cancelado') NOT NULL DEFAULT 'pendente',
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cargo_loads_id` PRIMARY KEY(`id`)
);

-- Tabela: clients
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);

-- Tabela: machine_fuel
CREATE TABLE IF NOT EXISTS `machine_fuel` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`hour_meter` varchar(20),
	`fuel_type` enum('diesel','gasolina','mistura_2t','arla') NOT NULL,
	`liters` varchar(20) NOT NULL,
	`price_per_liter` varchar(20),
	`total_value` varchar(20),
	`supplier` varchar(255),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `machine_fuel_id` PRIMARY KEY(`id`)
);

-- Tabela: machine_hours
CREATE TABLE IF NOT EXISTS `machine_hours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`operator_collaborator_id` int,
	`date` timestamp NOT NULL,
	`start_hour_meter` varchar(20) NOT NULL,
	`end_hour_meter` varchar(20) NOT NULL,
	`hours_worked` varchar(20) NOT NULL,
	`activity` varchar(255),
	`location` varchar(255),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `machine_hours_id` PRIMARY KEY(`id`)
);

-- Tabela: machine_maintenance
CREATE TABLE IF NOT EXISTS `machine_maintenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`hour_meter` varchar(20),
	`type` enum('preventiva','corretiva','revisao') NOT NULL DEFAULT 'corretiva',
	`service_type` enum('proprio','terceirizado') NOT NULL DEFAULT 'proprio',
	`mechanic_collaborator_id` int,
	`mechanic_name` varchar(255),
	`third_party_company` varchar(255),
	`parts_replaced` text,
	`labor_cost` varchar(20),
	`total_cost` varchar(20),
	`description` text,
	`next_maintenance_hours` varchar(20),
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machine_maintenance_id` PRIMARY KEY(`id`)
);

-- Tabela: parts
CREATE TABLE IF NOT EXISTS `parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50),
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`unit` varchar(20) DEFAULT 'un',
	`stock_quantity` int NOT NULL DEFAULT 0,
	`min_stock` int DEFAULT 0,
	`unit_cost` varchar(20),
	`supplier` varchar(255),
	`notes` text,
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `parts_id` PRIMARY KEY(`id`)
);

-- Tabela: parts_requests
CREATE TABLE IF NOT EXISTS `parts_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`part_id` int,
	`part_name` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`urgency` enum('baixa','media','alta') NOT NULL DEFAULT 'media',
	`equipment_id` int,
	`equipment_name` varchar(255),
	`reason` text,
	`status` enum('pendente','aprovado','rejeitado','comprado','entregue') NOT NULL DEFAULT 'pendente',
	`approved_by` int,
	`approved_at` timestamp,
	`rejection_reason` text,
	`estimated_cost` varchar(20),
	`requested_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parts_requests_id` PRIMARY KEY(`id`)
);

-- Tabela: vehicle_records
CREATE TABLE IF NOT EXISTS `vehicle_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`record_type` enum('abastecimento','manutencao','km') NOT NULL,
	`fuel_type` enum('diesel','gasolina','etanol','gnv'),
	`liters` varchar(20),
	`fuel_cost` varchar(20),
	`price_per_liter` varchar(20),
	`supplier` varchar(255),
	`odometer` varchar(20),
	`km_driven` varchar(20),
	`maintenance_type` varchar(255),
	`maintenance_cost` varchar(20),
	`service_type` enum('proprio','terceirizado'),
	`mechanic_name` varchar(255),
	`driver_collaborator_id` int,
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehicle_records_id` PRIMARY KEY(`id`)
);

-- Tabela: client_payments
CREATE TABLE IF NOT EXISTS `client_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`reference_date` timestamp NOT NULL,
	`description` varchar(500),
	`volume_m3` varchar(20),
	`price_per_m3` varchar(20),
	`gross_amount` varchar(20) NOT NULL,
	`deductions` varchar(20) DEFAULT '0',
	`net_amount` varchar(20) NOT NULL,
	`status` enum('pendente','pago','atrasado','cancelado') NOT NULL DEFAULT 'pendente',
	`due_date` timestamp,
	`paid_at` timestamp,
	`pix_key` varchar(255),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_payments_id` PRIMARY KEY(`id`)
);

-- Tabela: client_portal_access
CREATE TABLE IF NOT EXISTS `client_portal_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`access_code` varchar(64) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`last_access_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `client_portal_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_portal_access_access_code_unique` UNIQUE(`access_code`)
);

-- Tabela: replanting_records
CREATE TABLE IF NOT EXISTS `replanting_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`area` varchar(100),
	`species` varchar(100) DEFAULT 'Eucalipto',
	`quantity` int,
	`area_hectares` varchar(20),
	`notes` text,
	`photos_json` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `replanting_records_id` PRIMARY KEY(`id`)
);

-- Tabela: collaborator_documents
CREATE TABLE IF NOT EXISTS `collaborator_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collaborator_id` int NOT NULL,
	`type` enum('cnh','certificado','aso','contrato','rg','cpf','outros') NOT NULL DEFAULT 'outros',
	`title` varchar(255) NOT NULL,
	`file_url` varchar(1000) NOT NULL,
	`file_type` varchar(50),
	`issue_date` timestamp,
	`expiry_date` timestamp,
	`notes` text,
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collaborator_documents_id` PRIMARY KEY(`id`)
);

-- Tabela: equipment_maintenance
CREATE TABLE IF NOT EXISTS `equipment_maintenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`type` enum('manutencao','limpeza','afiacao','revisao','troca_oleo','outros') NOT NULL DEFAULT 'manutencao',
	`description` text NOT NULL,
	`performed_by` varchar(255),
	`cost` varchar(20),
	`next_maintenance_date` timestamp,
	`photos_json` text,
	`registered_by` int,
	`performed_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_maintenance_id` PRIMARY KEY(`id`)
);

-- Tabela: equipment_photos
CREATE TABLE IF NOT EXISTS `equipment_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`photo_url` varchar(1000) NOT NULL,
	`caption` varchar(255),
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_photos_id` PRIMARY KEY(`id`)
);

-- Tabela: collaborator_attendance
CREATE TABLE IF NOT EXISTS `collaborator_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collaborator_id` int NOT NULL,
	`date` timestamp NOT NULL,
	`employment_type_ca` enum('clt','terceirizado','diarista') NOT NULL DEFAULT 'diarista',
	`daily_value` varchar(20) NOT NULL DEFAULT '0',
	`pix_key` varchar(255),
	`activity` varchar(255),
	`observations` text,
	`payment_status_ca` enum('pendente','pago') NOT NULL DEFAULT 'pendente',
	`paid_at` timestamp,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collaborator_attendance_id` PRIMARY KEY(`id`)
);

-- Tabela: purchase_order_items
CREATE TABLE IF NOT EXISTS `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`part_id` int,
	`part_name` varchar(255) NOT NULL,
	`part_code` varchar(50),
	`part_category` varchar(100),
	`supplier` varchar(255),
	`unit` varchar(20) DEFAULT 'un',
	`quantity` int NOT NULL,
	`unit_cost` varchar(20),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);

-- Tabela: purchase_orders
CREATE TABLE IF NOT EXISTS `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('rascunho','enviado','aprovado','rejeitado','comprado') NOT NULL DEFAULT 'rascunho',
	`notes` text,
	`created_by` int,
	`approved_by` int,
	`approved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`)
);

-- Tabela: gps_device_links
CREATE TABLE IF NOT EXISTS `gps_device_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`traccar_device_id` int NOT NULL,
	`traccar_device_name` varchar(255),
	`traccar_unique_id` varchar(100),
	`active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gps_device_links_id` PRIMARY KEY(`id`)
);

-- Tabela: gps_hours_log
CREATE TABLE IF NOT EXISTS `gps_hours_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`gps_device_link_id` int,
	`date` timestamp NOT NULL,
	`hours_worked` varchar(20) NOT NULL,
	`hour_meter_start` varchar(20),
	`hour_meter_end` varchar(20),
	`distance_km` varchar(20),
	`source` enum('gps_auto','manual') NOT NULL DEFAULT 'gps_auto',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gps_hours_log_id` PRIMARY KEY(`id`)
);

-- Tabela: preventive_maintenance_alerts
CREATE TABLE IF NOT EXISTS `preventive_maintenance_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`status` enum('pendente','em_andamento','concluido','ignorado') NOT NULL DEFAULT 'pendente',
	`current_hours` varchar(20) NOT NULL,
	`due_hours` varchar(20) NOT NULL,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`resolved_at` timestamp,
	`resolved_by` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `preventive_maintenance_alerts_id` PRIMARY KEY(`id`)
);

-- Tabela: preventive_maintenance_plans
CREATE TABLE IF NOT EXISTS `preventive_maintenance_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('troca_oleo','engraxamento','filtro_ar','filtro_combustivel','correia','revisao_geral','abastecimento','outros') NOT NULL DEFAULT 'outros',
	`interval_hours` int NOT NULL,
	`last_done_hours` varchar(20) DEFAULT '0',
	`last_done_at` timestamp,
	`alert_threshold_hours` int DEFAULT 10,
	`active` int NOT NULL DEFAULT 1,
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `preventive_maintenance_plans_id` PRIMARY KEY(`id`)
);

-- Tabela: cargo_destinations
CREATE TABLE IF NOT EXISTS `cargo_destinations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` varchar(500),
	`city` varchar(100),
	`state` varchar(2),
	`notes` text,
	`active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`created_by` int,
	CONSTRAINT `cargo_destinations_id` PRIMARY KEY(`id`)
);

-- Tabela: maintenance_parts
CREATE TABLE IF NOT EXISTS `maintenance_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`maintenance_id` int NOT NULL,
	`part_id` int,
	`part_code` varchar(50),
	`part_name` varchar(255) NOT NULL,
	`part_photo_url` text,
	`quantity` int NOT NULL DEFAULT 1,
	`unit` varchar(20) DEFAULT 'un',
	`unit_cost` varchar(20),
	`total_cost` varchar(20),
	`from_stock` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_parts_id` PRIMARY KEY(`id`)
);

-- Tabela: maintenance_template_parts
CREATE TABLE IF NOT EXISTS `maintenance_template_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`part_id` int,
	`part_code` varchar(50),
	`part_name` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit` varchar(20) DEFAULT 'un',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_template_parts_id` PRIMARY KEY(`id`)
);

-- Tabela: maintenance_templates
CREATE TABLE IF NOT EXISTS `maintenance_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('preventiva','corretiva','revisao') NOT NULL DEFAULT 'preventiva',
	`description` text,
	`estimated_cost` varchar(20),
	`active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_templates_id` PRIMARY KEY(`id`)
);

-- Tabela: parts_stock_movements
CREATE TABLE IF NOT EXISTS `parts_stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`part_id` int NOT NULL,
	`type` enum('entrada','saida') NOT NULL,
	`quantity` int NOT NULL,
	`reason` varchar(255),
	`reference_id` int,
	`reference_type` varchar(50),
	`unit_cost` varchar(20),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parts_stock_movements_id` PRIMARY KEY(`id`)
);

-- Tabela: user_permissions
CREATE TABLE IF NOT EXISTS `user_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`modules` text,
	`profile` varchar(64) DEFAULT 'custom',
	`updated_by` int,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_permissions_user_id_unique` UNIQUE(`user_id`)
);

-- Tabela: chainsaw_chain_events
CREATE TABLE IF NOT EXISTS `chainsaw_chain_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chain_type` varchar(20) NOT NULL,
	`event_type` enum('envio_campo','retorno_oficina','afiacao_concluida','baixa_estoque','entrada_estoque') NOT NULL,
	`quantity` int NOT NULL,
	`chainsaw_id` int,
	`registered_by` int,
	`notes` text,
	`event_date` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_chain_events_id` PRIMARY KEY(`id`)
);

-- Tabela: chainsaw_chain_stock
CREATE TABLE IF NOT EXISTS `chainsaw_chain_stock` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chain_type` varchar(20) NOT NULL,
	`sharpened_in_box` int NOT NULL DEFAULT 0,
	`in_field` int NOT NULL DEFAULT 0,
	`in_workshop` int NOT NULL DEFAULT 0,
	`total_stock` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chainsaw_chain_stock_id` PRIMARY KEY(`id`)
);

-- Tabela: chainsaw_part_movements
CREATE TABLE IF NOT EXISTS `chainsaw_part_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`part_id` int NOT NULL,
	`type` enum('entrada','saida') NOT NULL,
	`quantity` varchar(20) NOT NULL,
	`reason` varchar(255),
	`service_order_id` int,
	`unit_cost` varchar(20),
	`registered_by` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_part_movements_id` PRIMARY KEY(`id`)
);

-- Tabela: chainsaw_parts
CREATE TABLE IF NOT EXISTS `chainsaw_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50),
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`unit` varchar(20) DEFAULT 'un',
	`current_stock` varchar(20) DEFAULT '0',
	`min_stock` varchar(20) DEFAULT '0',
	`unit_cost` varchar(20),
	`notes` text,
	`is_active` int DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_parts_id` PRIMARY KEY(`id`)
);

-- Tabela: chainsaw_service_orders
CREATE TABLE IF NOT EXISTS `chainsaw_service_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chainsaw_id` int NOT NULL,
	`problem_type` enum('motor_falhando','nao_liga','superaquecimento','vazamento','corrente_problema','sabre_problema','manutencao_preventiva','outro') NOT NULL,
	`problem_description` text,
	`priority` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
	`status` enum('aberta','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'aberta',
	`mechanic_id` int,
	`service_description` text,
	`completed_at` timestamp,
	`opened_by` int,
	`opened_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_service_orders_id` PRIMARY KEY(`id`)
);

-- Tabela: chainsaw_service_parts
CREATE TABLE IF NOT EXISTS `chainsaw_service_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`service_order_id` int NOT NULL,
	`part_id` int,
	`part_name` varchar(255) NOT NULL,
	`quantity` varchar(20) NOT NULL,
	`unit` varchar(20) DEFAULT 'un',
	`unit_cost` varchar(20),
	`from_stock` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaw_service_parts_id` PRIMARY KEY(`id`)
);

-- Tabela: chainsaws
CREATE TABLE IF NOT EXISTS `chainsaws` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`brand` varchar(100),
	`model` varchar(100),
	`serial_number` varchar(100),
	`chain_type` varchar(20) DEFAULT '30',
	`status` enum('ativa','oficina','inativa') NOT NULL DEFAULT 'ativa',
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chainsaws_id` PRIMARY KEY(`id`)
);

-- Tabela: fuel_container_events
CREATE TABLE IF NOT EXISTS `fuel_container_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`container_id` int NOT NULL,
	`event_type` enum('abastecimento','uso','transferencia') NOT NULL,
	`volume_liters` varchar(10) NOT NULL,
	`cost_per_liter` varchar(20),
	`total_cost` varchar(20),
	`oil2t_ml` varchar(10),
	`source_container_id` int,
	`chainsaw_id` int,
	`registered_by` int,
	`notes` text,
	`event_date` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_container_events_id` PRIMARY KEY(`id`)
);

-- Tabela: fuel_containers
CREATE TABLE IF NOT EXISTS `fuel_containers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(30) DEFAULT 'vermelho',
	`type` enum('puro','mistura') NOT NULL,
	`capacity_liters` varchar(10) DEFAULT '20',
	`current_volume_liters` varchar(10) DEFAULT '0',
	`is_active` int DEFAULT 1,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_containers_id` PRIMARY KEY(`id`)
);

-- Tabela: extra_expenses
CREATE TABLE IF NOT EXISTS `extra_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`category` enum('abastecimento','refeicao','compra_material','servico_terceiro','pedagio','outro') NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` varchar(20) NOT NULL,
	`payment_method` enum('dinheiro','pix','cartao','transferencia') NOT NULL DEFAULT 'dinheiro',
	`receipt_image_url` text,
	`notes` text,
	`registered_by` int,
	`registered_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `extra_expenses_id` PRIMARY KEY(`id`)
);

-- Tabela: financial_entries
CREATE TABLE IF NOT EXISTS `financial_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('receita','despesa') NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` varchar(20) NOT NULL,
	`date` timestamp NOT NULL,
	`reference_month` varchar(7),
	`payment_method` enum('dinheiro','pix','cartao','transferencia','boleto','cheque') NOT NULL DEFAULT 'pix',
	`status` enum('pendente','confirmado','cancelado') NOT NULL DEFAULT 'confirmado',
	`client_id` int,
	`client_name` varchar(255),
	`receipt_image_url` text,
	`notes` text,
	`registered_by` int,
	`registered_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_entries_id` PRIMARY KEY(`id`)
);

-- Tabela: gps_locations
CREATE TABLE IF NOT EXISTS `gps_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`latitude` varchar(30) NOT NULL,
	`longitude` varchar(30) NOT NULL,
	`radius_meters` int NOT NULL DEFAULT 2000,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`notes` text,
	`created_by` int,
	`created_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gps_locations_id` PRIMARY KEY(`id`)
);

-- Tabela: cargo_tracking_photos
CREATE TABLE IF NOT EXISTS `cargo_tracking_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cargo_id` int NOT NULL,
	`stage` varchar(50) NOT NULL,
	`photo_url` text NOT NULL,
	`notes` text,
	`registered_by` int,
	`registered_by_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cargo_tracking_photos_id` PRIMARY KEY(`id`)
);

-- Tabela: client_contracts (adicional)
CREATE TABLE IF NOT EXISTS `client_contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`description` varchar(500) NOT NULL,
	`billing_type` enum('peso_kg','metro_m3','fixo') NOT NULL DEFAULT 'metro_m3',
	`unit_price` varchar(20),
	`estimated_volume` varchar(20),
	`total_amount` varchar(20),
	`due_date` timestamp,
	`status` enum('ativo','pago','atrasado','cancelado') NOT NULL DEFAULT 'ativo',
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_contracts_id` PRIMARY KEY(`id`)
);

-- Tabela: client_payment_receipts (adicional)
CREATE TABLE IF NOT EXISTS `client_payment_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`contract_id` int,
	`payment_date` timestamp NOT NULL,
	`amount` varchar(20) NOT NULL,
	`payment_method` enum('pix','transferencia','dinheiro','cheque','outros') NOT NULL DEFAULT 'pix',
	`receipt_url` varchar(1000),
	`reference_month` varchar(7),
	`notes` text,
	`registered_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_payment_receipts_id` PRIMARY KEY(`id`)
);
