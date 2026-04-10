SET FOREIGN_KEY_CHECKS = 0;

-- ================================================================
-- FASE 3: ADICIONAR CONSTRAINTS (FKs e UNIQUE)
-- ================================================================

-- FK: attendance_records_user_id_users_id_fk em attendance_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance_records' AND CONSTRAINT_NAME = 'attendance_records_user_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: attendance_records_paid_by_users_id_fk em attendance_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance_records' AND CONSTRAINT_NAME = 'attendance_records_paid_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_paid_by_users_id_fk` FOREIGN KEY (`paid_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: attendance_records_registered_by_users_id_fk em attendance_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance_records' AND CONSTRAINT_NAME = 'attendance_records_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_shipments_truck_id_equipment_id_fk em cargo_shipments
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_shipments' AND CONSTRAINT_NAME = 'cargo_shipments_truck_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_shipments` ADD CONSTRAINT `cargo_shipments_truck_id_equipment_id_fk` FOREIGN KEY (`truck_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_shipments_driver_id_users_id_fk em cargo_shipments
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_shipments' AND CONSTRAINT_NAME = 'cargo_shipments_driver_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_shipments` ADD CONSTRAINT `cargo_shipments_driver_id_users_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_shipments_registered_by_users_id_fk em cargo_shipments
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_shipments' AND CONSTRAINT_NAME = 'cargo_shipments_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_shipments` ADD CONSTRAINT `cargo_shipments_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: equipment_type_id_equipment_types_id_fk em equipment
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND CONSTRAINT_NAME = 'equipment_type_id_equipment_types_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `equipment` ADD CONSTRAINT `equipment_type_id_equipment_types_id_fk` FOREIGN KEY (`type_id`) REFERENCES `equipment_types`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_records_equipment_id_equipment_id_fk em fuel_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_records' AND CONSTRAINT_NAME = 'fuel_records_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_records` ADD CONSTRAINT `fuel_records_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_records_operator_id_users_id_fk em fuel_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_records' AND CONSTRAINT_NAME = 'fuel_records_operator_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_records` ADD CONSTRAINT `fuel_records_operator_id_users_id_fk` FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_records_registered_by_users_id_fk em fuel_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_records' AND CONSTRAINT_NAME = 'fuel_records_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_records` ADD CONSTRAINT `fuel_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: user_profiles_user_id_users_id_fk em user_profiles
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_profiles' AND CONSTRAINT_NAME = 'user_profiles_user_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- UNIQUE: users_email_unique em users
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND CONSTRAINT_NAME = 'users_email_unique');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: password_reset_tokens_user_id_users_id_fk em password_reset_tokens
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_reset_tokens' AND CONSTRAINT_NAME = 'password_reset_tokens_user_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: biometric_attendance_collaborator_id_collaborators_id_fk em biometric_attendance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND CONSTRAINT_NAME = 'biometric_attendance_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `biometric_attendance` ADD CONSTRAINT `biometric_attendance_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: biometric_attendance_registered_by_users_id_fk em biometric_attendance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND CONSTRAINT_NAME = 'biometric_attendance_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `biometric_attendance` ADD CONSTRAINT `biometric_attendance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: collaborators_user_id_users_id_fk em collaborators
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborators' AND CONSTRAINT_NAME = 'collaborators_user_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `collaborators` ADD CONSTRAINT `collaborators_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: collaborators_created_by_users_id_fk em collaborators
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborators' AND CONSTRAINT_NAME = 'collaborators_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `collaborators` ADD CONSTRAINT `collaborators_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: role_permissions_updated_by_users_id_fk em role_permissions
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permissions' AND CONSTRAINT_NAME = 'role_permissions_updated_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: sectors_created_by_users_id_fk em sectors
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sectors' AND CONSTRAINT_NAME = 'sectors_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `sectors` ADD CONSTRAINT `sectors_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_loads_vehicle_id_equipment_id_fk em cargo_loads
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND CONSTRAINT_NAME = 'cargo_loads_vehicle_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_vehicle_id_equipment_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_loads_driver_collaborator_id_collaborators_id_fk em cargo_loads
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND CONSTRAINT_NAME = 'cargo_loads_driver_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_driver_collaborator_id_collaborators_id_fk` FOREIGN KEY (`driver_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_loads_client_id_clients_id_fk em cargo_loads
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND CONSTRAINT_NAME = 'cargo_loads_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_loads_registered_by_users_id_fk em cargo_loads
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND CONSTRAINT_NAME = 'cargo_loads_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: clients_created_by_users_id_fk em clients
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND CONSTRAINT_NAME = 'clients_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `clients` ADD CONSTRAINT `clients_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_fuel_equipment_id_equipment_id_fk em machine_fuel
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_fuel' AND CONSTRAINT_NAME = 'machine_fuel_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_fuel` ADD CONSTRAINT `machine_fuel_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_fuel_registered_by_users_id_fk em machine_fuel
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_fuel' AND CONSTRAINT_NAME = 'machine_fuel_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_fuel` ADD CONSTRAINT `machine_fuel_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_hours_equipment_id_equipment_id_fk em machine_hours
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_hours' AND CONSTRAINT_NAME = 'machine_hours_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_hours` ADD CONSTRAINT `machine_hours_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_hours_operator_collaborator_id_collaborators_id_fk em machine_hours
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_hours' AND CONSTRAINT_NAME = 'machine_hours_operator_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_hours` ADD CONSTRAINT `machine_hours_operator_collaborator_id_collaborators_id_fk` FOREIGN KEY (`operator_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_hours_registered_by_users_id_fk em machine_hours
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_hours' AND CONSTRAINT_NAME = 'machine_hours_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_hours` ADD CONSTRAINT `machine_hours_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_maintenance_equipment_id_equipment_id_fk em machine_maintenance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_maintenance' AND CONSTRAINT_NAME = 'machine_maintenance_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_maintenance` ADD CONSTRAINT `machine_maintenance_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_maintenance_mechanic_collaborator_id_collaborators_id_fk em machine_maintenance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_maintenance' AND CONSTRAINT_NAME = 'machine_maintenance_mechanic_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_maintenance` ADD CONSTRAINT `machine_maintenance_mechanic_collaborator_id_collaborators_id_fk` FOREIGN KEY (`mechanic_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: machine_maintenance_registered_by_users_id_fk em machine_maintenance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_maintenance' AND CONSTRAINT_NAME = 'machine_maintenance_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `machine_maintenance` ADD CONSTRAINT `machine_maintenance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_created_by_users_id_fk em parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts' AND CONSTRAINT_NAME = 'parts_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts` ADD CONSTRAINT `parts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_requests_part_id_parts_id_fk em parts_requests
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts_requests' AND CONSTRAINT_NAME = 'parts_requests_part_id_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts_requests` ADD CONSTRAINT `parts_requests_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_requests_equipment_id_equipment_id_fk em parts_requests
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts_requests' AND CONSTRAINT_NAME = 'parts_requests_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts_requests` ADD CONSTRAINT `parts_requests_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_requests_approved_by_users_id_fk em parts_requests
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts_requests' AND CONSTRAINT_NAME = 'parts_requests_approved_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts_requests` ADD CONSTRAINT `parts_requests_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_requests_requested_by_users_id_fk em parts_requests
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts_requests' AND CONSTRAINT_NAME = 'parts_requests_requested_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts_requests` ADD CONSTRAINT `parts_requests_requested_by_users_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: vehicle_records_equipment_id_equipment_id_fk em vehicle_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_records' AND CONSTRAINT_NAME = 'vehicle_records_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `vehicle_records` ADD CONSTRAINT `vehicle_records_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: vehicle_records_driver_collaborator_id_collaborators_id_fk em vehicle_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_records' AND CONSTRAINT_NAME = 'vehicle_records_driver_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `vehicle_records` ADD CONSTRAINT `vehicle_records_driver_collaborator_id_collaborators_id_fk` FOREIGN KEY (`driver_collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: vehicle_records_registered_by_users_id_fk em vehicle_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_records' AND CONSTRAINT_NAME = 'vehicle_records_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `vehicle_records` ADD CONSTRAINT `vehicle_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: client_payments_client_id_clients_id_fk em client_payments
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_payments' AND CONSTRAINT_NAME = 'client_payments_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_payments` ADD CONSTRAINT `client_payments_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: client_payments_registered_by_users_id_fk em client_payments
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_payments' AND CONSTRAINT_NAME = 'client_payments_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_payments` ADD CONSTRAINT `client_payments_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: client_portal_access_client_id_clients_id_fk em client_portal_access
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_portal_access' AND CONSTRAINT_NAME = 'client_portal_access_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_portal_access` ADD CONSTRAINT `client_portal_access_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: client_portal_access_created_by_users_id_fk em client_portal_access
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_portal_access' AND CONSTRAINT_NAME = 'client_portal_access_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_portal_access` ADD CONSTRAINT `client_portal_access_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: replanting_records_client_id_clients_id_fk em replanting_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'replanting_records' AND CONSTRAINT_NAME = 'replanting_records_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `replanting_records` ADD CONSTRAINT `replanting_records_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: replanting_records_registered_by_users_id_fk em replanting_records
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'replanting_records' AND CONSTRAINT_NAME = 'replanting_records_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `replanting_records` ADD CONSTRAINT `replanting_records_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: collaborator_documents_collaborator_id_collaborators_id_fk em collaborator_documents
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_documents' AND CONSTRAINT_NAME = 'collaborator_documents_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `collaborator_documents` ADD CONSTRAINT `collaborator_documents_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: collaborator_documents_uploaded_by_users_id_fk em collaborator_documents
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_documents' AND CONSTRAINT_NAME = 'collaborator_documents_uploaded_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `collaborator_documents` ADD CONSTRAINT `collaborator_documents_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: equipment_maintenance_registered_by_users_id_fk em equipment_maintenance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment_maintenance' AND CONSTRAINT_NAME = 'equipment_maintenance_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `equipment_maintenance` ADD CONSTRAINT `equipment_maintenance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: equipment_photos_uploaded_by_users_id_fk em equipment_photos
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment_photos' AND CONSTRAINT_NAME = 'equipment_photos_uploaded_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `equipment_photos` ADD CONSTRAINT `equipment_photos_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: collaborator_attendance_collaborator_id_collaborators_id_fk em collaborator_attendance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND CONSTRAINT_NAME = 'collaborator_attendance_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `collaborator_attendance` ADD CONSTRAINT `collaborator_attendance_collaborator_id_collaborators_id_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `collaborators`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: collaborator_attendance_registered_by_users_id_fk em collaborator_attendance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND CONSTRAINT_NAME = 'collaborator_attendance_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `collaborator_attendance` ADD CONSTRAINT `collaborator_attendance_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: purchase_order_items_order_id_purchase_orders_id_fk em purchase_order_items
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_order_items' AND CONSTRAINT_NAME = 'purchase_order_items_order_id_purchase_orders_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_order_id_purchase_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: purchase_order_items_part_id_parts_id_fk em purchase_order_items
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_order_items' AND CONSTRAINT_NAME = 'purchase_order_items_part_id_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: purchase_orders_created_by_users_id_fk em purchase_orders
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_orders' AND CONSTRAINT_NAME = 'purchase_orders_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: purchase_orders_approved_by_users_id_fk em purchase_orders
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_orders' AND CONSTRAINT_NAME = 'purchase_orders_approved_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: gps_device_links_equipment_id_equipment_id_fk em gps_device_links
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gps_device_links' AND CONSTRAINT_NAME = 'gps_device_links_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `gps_device_links` ADD CONSTRAINT `gps_device_links_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: gps_device_links_created_by_users_id_fk em gps_device_links
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gps_device_links' AND CONSTRAINT_NAME = 'gps_device_links_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `gps_device_links` ADD CONSTRAINT `gps_device_links_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: gps_hours_log_equipment_id_equipment_id_fk em gps_hours_log
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gps_hours_log' AND CONSTRAINT_NAME = 'gps_hours_log_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `gps_hours_log` ADD CONSTRAINT `gps_hours_log_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: gps_hours_log_gps_device_link_id_gps_device_links_id_fk em gps_hours_log
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gps_hours_log' AND CONSTRAINT_NAME = 'gps_hours_log_gps_device_link_id_gps_device_links_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `gps_hours_log` ADD CONSTRAINT `gps_hours_log_gps_device_link_id_gps_device_links_id_fk` FOREIGN KEY (`gps_device_link_id`) REFERENCES `gps_device_links`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: preventive_maintenance_alerts_equipment_id_equipment_id_fk em preventive_maintenance_alerts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'preventive_maintenance_alerts' AND CONSTRAINT_NAME = 'preventive_maintenance_alerts_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `preventive_maintenance_alerts` ADD CONSTRAINT `preventive_maintenance_alerts_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: preventive_maintenance_alerts_plan_id_preventive_maintenance_plans_id_fk em preventive_maintenance_alerts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'preventive_maintenance_alerts' AND CONSTRAINT_NAME = 'preventive_maintenance_alerts_plan_id_preventive_maintenance_plans_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `preventive_maintenance_alerts` ADD CONSTRAINT `preventive_maintenance_alerts_plan_id_preventive_maintenance_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `preventive_maintenance_plans`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: preventive_maintenance_alerts_resolved_by_users_id_fk em preventive_maintenance_alerts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'preventive_maintenance_alerts' AND CONSTRAINT_NAME = 'preventive_maintenance_alerts_resolved_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `preventive_maintenance_alerts` ADD CONSTRAINT `preventive_maintenance_alerts_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: preventive_maintenance_plans_equipment_id_equipment_id_fk em preventive_maintenance_plans
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'preventive_maintenance_plans' AND CONSTRAINT_NAME = 'preventive_maintenance_plans_equipment_id_equipment_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `preventive_maintenance_plans` ADD CONSTRAINT `preventive_maintenance_plans_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: preventive_maintenance_plans_created_by_users_id_fk em preventive_maintenance_plans
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'preventive_maintenance_plans' AND CONSTRAINT_NAME = 'preventive_maintenance_plans_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `preventive_maintenance_plans` ADD CONSTRAINT `preventive_maintenance_plans_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_destinations_created_by_users_id_fk em cargo_destinations
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_destinations' AND CONSTRAINT_NAME = 'cargo_destinations_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_destinations` ADD CONSTRAINT `cargo_destinations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_loads_destination_id_cargo_destinations_id_fk em cargo_loads
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND CONSTRAINT_NAME = 'cargo_loads_destination_id_cargo_destinations_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_loads` ADD CONSTRAINT `cargo_loads_destination_id_cargo_destinations_id_fk` FOREIGN KEY (`destination_id`) REFERENCES `cargo_destinations`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: maintenance_parts_maintenance_id_equipment_maintenance_id_fk em maintenance_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_parts' AND CONSTRAINT_NAME = 'maintenance_parts_maintenance_id_equipment_maintenance_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `maintenance_parts` ADD CONSTRAINT `maintenance_parts_maintenance_id_equipment_maintenance_id_fk` FOREIGN KEY (`maintenance_id`) REFERENCES `equipment_maintenance`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: maintenance_parts_part_id_parts_id_fk em maintenance_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_parts' AND CONSTRAINT_NAME = 'maintenance_parts_part_id_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `maintenance_parts` ADD CONSTRAINT `maintenance_parts_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE set null ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: maintenance_template_parts_template_id_maintenance_templates_id_fk em maintenance_template_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_template_parts' AND CONSTRAINT_NAME = 'maintenance_template_parts_template_id_maintenance_templates_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `maintenance_template_parts` ADD CONSTRAINT `maintenance_template_parts_template_id_maintenance_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `maintenance_templates`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: maintenance_template_parts_part_id_parts_id_fk em maintenance_template_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_template_parts' AND CONSTRAINT_NAME = 'maintenance_template_parts_part_id_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `maintenance_template_parts` ADD CONSTRAINT `maintenance_template_parts_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE set null ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: maintenance_templates_created_by_users_id_fk em maintenance_templates
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_templates' AND CONSTRAINT_NAME = 'maintenance_templates_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `maintenance_templates` ADD CONSTRAINT `maintenance_templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_stock_movements_part_id_parts_id_fk em parts_stock_movements
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts_stock_movements' AND CONSTRAINT_NAME = 'parts_stock_movements_part_id_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts_stock_movements` ADD CONSTRAINT `parts_stock_movements_part_id_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: parts_stock_movements_registered_by_users_id_fk em parts_stock_movements
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts_stock_movements' AND CONSTRAINT_NAME = 'parts_stock_movements_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `parts_stock_movements` ADD CONSTRAINT `parts_stock_movements_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: user_permissions_user_id_users_id_fk em user_permissions
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_permissions' AND CONSTRAINT_NAME = 'user_permissions_user_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: user_permissions_updated_by_users_id_fk em user_permissions
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_permissions' AND CONSTRAINT_NAME = 'user_permissions_updated_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_chain_events_chainsaw_id_chainsaws_id_fk em chainsaw_chain_events
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_chain_events' AND CONSTRAINT_NAME = 'chainsaw_chain_events_chainsaw_id_chainsaws_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_chain_events` ADD CONSTRAINT `chainsaw_chain_events_chainsaw_id_chainsaws_id_fk` FOREIGN KEY (`chainsaw_id`) REFERENCES `chainsaws`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_chain_events_registered_by_users_id_fk em chainsaw_chain_events
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_chain_events' AND CONSTRAINT_NAME = 'chainsaw_chain_events_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_chain_events` ADD CONSTRAINT `chainsaw_chain_events_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_part_movements_part_id_chainsaw_parts_id_fk em chainsaw_part_movements
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_part_movements' AND CONSTRAINT_NAME = 'chainsaw_part_movements_part_id_chainsaw_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_part_movements` ADD CONSTRAINT `chainsaw_part_movements_part_id_chainsaw_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `chainsaw_parts`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_part_movements_registered_by_users_id_fk em chainsaw_part_movements
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_part_movements' AND CONSTRAINT_NAME = 'chainsaw_part_movements_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_part_movements` ADD CONSTRAINT `chainsaw_part_movements_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_parts_created_by_users_id_fk em chainsaw_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_parts' AND CONSTRAINT_NAME = 'chainsaw_parts_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_parts` ADD CONSTRAINT `chainsaw_parts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_service_orders_chainsaw_id_chainsaws_id_fk em chainsaw_service_orders
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_service_orders' AND CONSTRAINT_NAME = 'chainsaw_service_orders_chainsaw_id_chainsaws_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_service_orders` ADD CONSTRAINT `chainsaw_service_orders_chainsaw_id_chainsaws_id_fk` FOREIGN KEY (`chainsaw_id`) REFERENCES `chainsaws`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_service_orders_mechanic_id_users_id_fk em chainsaw_service_orders
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_service_orders' AND CONSTRAINT_NAME = 'chainsaw_service_orders_mechanic_id_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_service_orders` ADD CONSTRAINT `chainsaw_service_orders_mechanic_id_users_id_fk` FOREIGN KEY (`mechanic_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_service_orders_opened_by_users_id_fk em chainsaw_service_orders
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_service_orders' AND CONSTRAINT_NAME = 'chainsaw_service_orders_opened_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_service_orders` ADD CONSTRAINT `chainsaw_service_orders_opened_by_users_id_fk` FOREIGN KEY (`opened_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_service_parts_service_order_id_chainsaw_service_orders_id_fk em chainsaw_service_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_service_parts' AND CONSTRAINT_NAME = 'chainsaw_service_parts_service_order_id_chainsaw_service_orders_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_service_parts` ADD CONSTRAINT `chainsaw_service_parts_service_order_id_chainsaw_service_orders_id_fk` FOREIGN KEY (`service_order_id`) REFERENCES `chainsaw_service_orders`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaw_service_parts_part_id_chainsaw_parts_id_fk em chainsaw_service_parts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_service_parts' AND CONSTRAINT_NAME = 'chainsaw_service_parts_part_id_chainsaw_parts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaw_service_parts` ADD CONSTRAINT `chainsaw_service_parts_part_id_chainsaw_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `chainsaw_parts`(`id`) ON DELETE set null ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: chainsaws_created_by_users_id_fk em chainsaws
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaws' AND CONSTRAINT_NAME = 'chainsaws_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `chainsaws` ADD CONSTRAINT `chainsaws_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_container_events_container_id_fuel_containers_id_fk em fuel_container_events
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_container_events' AND CONSTRAINT_NAME = 'fuel_container_events_container_id_fuel_containers_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_container_id_fuel_containers_id_fk` FOREIGN KEY (`container_id`) REFERENCES `fuel_containers`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_container_events_source_container_id_fuel_containers_id_fk em fuel_container_events
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_container_events' AND CONSTRAINT_NAME = 'fuel_container_events_source_container_id_fuel_containers_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_source_container_id_fuel_containers_id_fk` FOREIGN KEY (`source_container_id`) REFERENCES `fuel_containers`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_container_events_chainsaw_id_chainsaws_id_fk em fuel_container_events
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_container_events' AND CONSTRAINT_NAME = 'fuel_container_events_chainsaw_id_chainsaws_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_chainsaw_id_chainsaws_id_fk` FOREIGN KEY (`chainsaw_id`) REFERENCES `chainsaws`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: fuel_container_events_registered_by_users_id_fk em fuel_container_events
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuel_container_events' AND CONSTRAINT_NAME = 'fuel_container_events_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `fuel_container_events` ADD CONSTRAINT `fuel_container_events_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_destinations_client_id_clients_id_fk em cargo_destinations
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_destinations' AND CONSTRAINT_NAME = 'cargo_destinations_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_destinations` ADD CONSTRAINT `cargo_destinations_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: extra_expenses_registered_by_users_id_fk em extra_expenses
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'extra_expenses' AND CONSTRAINT_NAME = 'extra_expenses_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `extra_expenses` ADD CONSTRAINT `extra_expenses_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: financial_entries_client_id_clients_id_fk em financial_entries
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'financial_entries' AND CONSTRAINT_NAME = 'financial_entries_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: financial_entries_registered_by_users_id_fk em financial_entries
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'financial_entries' AND CONSTRAINT_NAME = 'financial_entries_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `financial_entries` ADD CONSTRAINT `financial_entries_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: gps_locations_created_by_users_id_fk em gps_locations
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'gps_locations' AND CONSTRAINT_NAME = 'gps_locations_created_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `gps_locations` ADD CONSTRAINT `gps_locations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_tracking_photos_cargo_id_cargo_loads_id_fk em cargo_tracking_photos
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_tracking_photos' AND CONSTRAINT_NAME = 'cargo_tracking_photos_cargo_id_cargo_loads_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_tracking_photos` ADD CONSTRAINT `cargo_tracking_photos_cargo_id_cargo_loads_id_fk` FOREIGN KEY (`cargo_id`) REFERENCES `cargo_loads`(`id`) ON DELETE cascade ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: cargo_tracking_photos_registered_by_users_id_fk em cargo_tracking_photos
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_tracking_photos' AND CONSTRAINT_NAME = 'cargo_tracking_photos_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `cargo_tracking_photos` ADD CONSTRAINT `cargo_tracking_photos_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK (extra): client_contracts_client_id_clients_id_fk em client_contracts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_contracts' AND CONSTRAINT_NAME = 'client_contracts_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_contracts` ADD CONSTRAINT `client_contracts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK (extra): client_contracts_registered_by_users_id_fk em client_contracts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_contracts' AND CONSTRAINT_NAME = 'client_contracts_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_contracts` ADD CONSTRAINT `client_contracts_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK (extra): client_payment_receipts_client_id_clients_id_fk em client_payment_receipts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_payment_receipts' AND CONSTRAINT_NAME = 'client_payment_receipts_client_id_clients_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_payment_receipts` ADD CONSTRAINT `client_payment_receipts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK (extra): client_payment_receipts_contract_id_client_contracts_id_fk em client_payment_receipts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_payment_receipts' AND CONSTRAINT_NAME = 'client_payment_receipts_contract_id_client_contracts_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_payment_receipts` ADD CONSTRAINT `client_payment_receipts_contract_id_client_contracts_id_fk` FOREIGN KEY (`contract_id`) REFERENCES `client_contracts`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK (extra): client_payment_receipts_registered_by_users_id_fk em client_payment_receipts
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_payment_receipts' AND CONSTRAINT_NAME = 'client_payment_receipts_registered_by_users_id_fk');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `client_payment_receipts` ADD CONSTRAINT `client_payment_receipts_registered_by_users_id_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET FOREIGN_KEY_CHECKS = 1;

-- ================================================================
-- FIM DO SCRIPT COMPLETO
-- Todas as tabelas e colunas do schema estão cobertas
-- ================================================================