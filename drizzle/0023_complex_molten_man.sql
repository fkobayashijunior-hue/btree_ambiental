CREATE TABLE `client_contracts` (
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
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `client_payment_receipts` (
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
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `client_portal_access` DROP INDEX `client_portal_access_access_code_unique`;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` DROP INDEX `password_reset_tokens_token_unique`;--> statement-breakpoint
ALTER TABLE `user_permissions` DROP INDEX `user_permissions_user_id_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_email_unique`;--> statement-breakpoint
ALTER TABLE `cargo_destinations` DROP FOREIGN KEY `cargo_destinations_client_id_clients_id_fk`;
--> statement-breakpoint
ALTER TABLE `cargo_destinations` DROP FOREIGN KEY `cargo_destinations_created_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `cargo_loads` DROP FOREIGN KEY `cargo_loads_destination_id_cargo_destinations_id_fk`;
--> statement-breakpoint
ALTER TABLE `chainsaw_chain_events` DROP FOREIGN KEY `chainsaw_chain_events_chainsaw_id_chainsaws_id_fk`;
--> statement-breakpoint
ALTER TABLE `chainsaw_chain_events` DROP FOREIGN KEY `chainsaw_chain_events_registered_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `chainsaw_part_movements` DROP FOREIGN KEY `chainsaw_part_movements_part_id_chainsaw_parts_id_fk`;
--> statement-breakpoint
ALTER TABLE `chainsaw_part_movements` DROP FOREIGN KEY `chainsaw_part_movements_registered_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `chainsaw_parts` DROP FOREIGN KEY `chainsaw_parts_created_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` DROP FOREIGN KEY `chainsaw_service_orders_chainsaw_id_chainsaws_id_fk`;
--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` DROP FOREIGN KEY `chainsaw_service_orders_mechanic_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` DROP FOREIGN KEY `chainsaw_service_orders_opened_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `chainsaw_service_parts` DROP FOREIGN KEY `chainsaw_service_parts_service_order_id_chainsaw_service_orders_id_fk`;
--> statement-breakpoint
ALTER TABLE `chainsaw_service_parts` DROP FOREIGN KEY `chainsaw_service_parts_part_id_chainsaw_parts_id_fk`;
--> statement-breakpoint
ALTER TABLE `chainsaws` DROP FOREIGN KEY `chainsaws_created_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `collaborator_attendance` DROP FOREIGN KEY `collaborator_attendance_collaborator_id_collaborators_id_fk`;
--> statement-breakpoint
ALTER TABLE `collaborator_attendance` DROP FOREIGN KEY `collaborator_attendance_registered_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `financial_entries` DROP FOREIGN KEY `financial_entries_client_id_clients_id_fk`;
--> statement-breakpoint
ALTER TABLE `financial_entries` DROP FOREIGN KEY `financial_entries_registered_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `fuel_container_events` DROP FOREIGN KEY `fuel_container_events_container_id_fuel_containers_id_fk`;
--> statement-breakpoint
ALTER TABLE `fuel_container_events` DROP FOREIGN KEY `fuel_container_events_source_container_id_fuel_containers_id_fk`;
--> statement-breakpoint
ALTER TABLE `fuel_container_events` DROP FOREIGN KEY `fuel_container_events_chainsaw_id_chainsaws_id_fk`;
--> statement-breakpoint
ALTER TABLE `fuel_container_events` DROP FOREIGN KEY `fuel_container_events_registered_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `gps_device_links` DROP FOREIGN KEY `gps_device_links_equipment_id_equipment_id_fk`;
--> statement-breakpoint
ALTER TABLE `gps_device_links` DROP FOREIGN KEY `gps_device_links_created_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `gps_hours_log` DROP FOREIGN KEY `gps_hours_log_equipment_id_equipment_id_fk`;
--> statement-breakpoint
ALTER TABLE `gps_hours_log` DROP FOREIGN KEY `gps_hours_log_gps_device_link_id_gps_device_links_id_fk`;
--> statement-breakpoint
ALTER TABLE `gps_locations` DROP FOREIGN KEY `gps_locations_created_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `maintenance_templates` DROP FOREIGN KEY `maintenance_templates_created_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `parts_stock_movements` DROP FOREIGN KEY `parts_stock_movements_registered_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `preventive_maintenance_alerts` DROP FOREIGN KEY `preventive_maintenance_alerts_equipment_id_equipment_id_fk`;
--> statement-breakpoint
ALTER TABLE `preventive_maintenance_alerts` DROP FOREIGN KEY `preventive_maintenance_alerts_plan_id_preventive_maintenance_plans_id_fk`;
--> statement-breakpoint
ALTER TABLE `preventive_maintenance_alerts` DROP FOREIGN KEY `preventive_maintenance_alerts_resolved_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `preventive_maintenance_plans` DROP FOREIGN KEY `preventive_maintenance_plans_equipment_id_equipment_id_fk`;
--> statement-breakpoint
ALTER TABLE `preventive_maintenance_plans` DROP FOREIGN KEY `preventive_maintenance_plans_created_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `purchase_order_items` DROP FOREIGN KEY `purchase_order_items_part_id_parts_id_fk`;
--> statement-breakpoint
ALTER TABLE `purchase_orders` DROP FOREIGN KEY `purchase_orders_created_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `purchase_orders` DROP FOREIGN KEY `purchase_orders_approved_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `user_permissions` DROP FOREIGN KEY `user_permissions_updated_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `attendance_records` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `cargo_destinations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `cargo_loads` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `cargo_shipments` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `chainsaw_chain_events` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `chainsaw_chain_stock` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `chainsaw_part_movements` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `chainsaw_parts` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `chainsaw_service_parts` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `chainsaws` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `client_payments` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `client_portal_access` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `clients` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `collaborator_attendance` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `collaborator_documents` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `collaborators` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `equipment` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `equipment_maintenance` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `equipment_photos` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `equipment_types` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `extra_expenses` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `financial_entries` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `fuel_container_events` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `fuel_containers` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `fuel_records` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `gps_device_links` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `gps_hours_log` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `gps_locations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `machine_fuel` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `machine_hours` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `machine_maintenance` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `maintenance_parts` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `maintenance_template_parts` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `maintenance_templates` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `parts` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `parts_requests` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `parts_stock_movements` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `preventive_maintenance_alerts` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `preventive_maintenance_plans` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `purchase_order_items` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `purchase_orders` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `replanting_records` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `role_permissions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `sectors` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `user_permissions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `user_profiles` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `vehicle_records` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `attendance_records` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `biometric_attendance` MODIFY COLUMN `registered_by` int NOT NULL;--> statement-breakpoint
ALTER TABLE `biometric_attendance` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `cargo_destinations` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `cargo_loads` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `cargo_shipments` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `cargo_tracking_photos` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `chainsaw_chain_events` MODIFY COLUMN `event_date` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `chainsaw_chain_events` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `chainsaw_part_movements` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `chainsaw_parts` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` MODIFY COLUMN `opened_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `chainsaw_service_orders` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `chainsaw_service_parts` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `chainsaws` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `client_payments` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `client_portal_access` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `clients` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `collaborator_attendance` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `collaborator_documents` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `collaborators` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `equipment` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `equipment_maintenance` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `equipment_photos` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `equipment_types` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `extra_expenses` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `financial_entries` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `fuel_container_events` MODIFY COLUMN `event_date` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `fuel_container_events` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `fuel_containers` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `fuel_records` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `gps_device_links` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `gps_hours_log` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `gps_locations` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `machine_fuel` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `machine_hours` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `machine_maintenance` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `maintenance_parts` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `maintenance_template_parts` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `maintenance_templates` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `parts` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `parts_requests` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `parts_stock_movements` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `password_reset_tokens` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `preventive_maintenance_alerts` MODIFY COLUMN `generated_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `preventive_maintenance_alerts` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `preventive_maintenance_plans` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `purchase_order_items` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `purchase_orders` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `replanting_records` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `sectors` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `user_permissions` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `user_profiles` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `vehicle_records` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD `date` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD `check_in_time` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD `check_out_time` timestamp;--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD `photo_url` text;--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `weight_out_kg` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `weight_in_kg` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `final_height_m` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `final_width_m` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `final_length_m` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `final_volume_m3` varchar(20);--> statement-breakpoint
ALTER TABLE `cargo_loads` ADD `work_location_id` int;--> statement-breakpoint
ALTER TABLE `collaborator_attendance` ADD `work_location_id` int;--> statement-breakpoint
ALTER TABLE `equipment` ADD `default_height_m` varchar(20);--> statement-breakpoint
ALTER TABLE `equipment` ADD `default_width_m` varchar(20);--> statement-breakpoint
ALTER TABLE `equipment` ADD `default_length_m` varchar(20);--> statement-breakpoint
ALTER TABLE `extra_expenses` ADD `work_location_id` int;--> statement-breakpoint
ALTER TABLE `fuel_container_events` ADD `work_location_id` int;--> statement-breakpoint
ALTER TABLE `fuel_records` ADD `work_location_id` int;--> statement-breakpoint
ALTER TABLE `machine_fuel` ADD `work_location_id` int;--> statement-breakpoint
ALTER TABLE `machine_hours` ADD `work_location_id` int;--> statement-breakpoint
ALTER TABLE `parts` ADD `photos_json` text;--> statement-breakpoint
ALTER TABLE `vehicle_records` ADD `maintenance_location` varchar(255);--> statement-breakpoint
ALTER TABLE `vehicle_records` ADD `photos_json` text;--> statement-breakpoint
ALTER TABLE `vehicle_records` ADD `work_location_id` int;--> statement-breakpoint
ALTER TABLE `client_contracts` ADD CONSTRAINT `client_contracts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_contracts` ADD CONSTRAINT `client_contracts_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_payment_receipts` ADD CONSTRAINT `client_payment_receipts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_payment_receipts` ADD CONSTRAINT `client_payment_receipts_contract_id_client_contracts_id_fk` FOREIGN KEY (`contract_id`) REFERENCES `client_contracts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_payment_receipts` ADD CONSTRAINT `client_payment_receipts_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD CONSTRAINT `biometric_attendance_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `biometric_attendance` ADD CONSTRAINT `biometric_attendance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_portal_access` ADD CONSTRAINT `client_portal_access_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `client_portal_access_access_code_unique` ON `client_portal_access` (`access_code`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_token_unique` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `user_id` ON `user_permissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP COLUMN `check_in`;--> statement-breakpoint
ALTER TABLE `biometric_attendance` DROP COLUMN `check_out`;--> statement-breakpoint
ALTER TABLE `cargo_destinations` DROP COLUMN `client_id`;