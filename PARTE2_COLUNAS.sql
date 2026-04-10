SET FOREIGN_KEY_CHECKS = 0;

-- ================================================================
-- FASE 2: ADICIONAR/MODIFICAR COLUNAS
-- ================================================================

-- DROP FK: biometric_attendance_collaborator_id_collaborators_id_fk de biometric_attendance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND CONSTRAINT_NAME = 'biometric_attendance_collaborator_id_collaborators_id_fk');
SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `biometric_attendance` DROP FOREIGN KEY `biometric_attendance_collaborator_id_collaborators_id_fk`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- DROP FK: biometric_attendance_registered_by_users_id_fk de biometric_attendance
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND CONSTRAINT_NAME = 'biometric_attendance_registered_by_users_id_fk');
SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `biometric_attendance` DROP FOREIGN KEY `biometric_attendance_registered_by_users_id_fk`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- DROP FK: client_portal_access_created_by_users_id_fk de client_portal_access
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_portal_access' AND CONSTRAINT_NAME = 'client_portal_access_created_by_users_id_fk');
SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `client_portal_access` DROP FOREIGN KEY `client_portal_access_created_by_users_id_fk`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- DROP COLUMN: date de biometric_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND COLUMN_NAME = 'date');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `biometric_attendance` DROP COLUMN `date`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- DROP COLUMN: check_in_time de biometric_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND COLUMN_NAME = 'check_in_time');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `biometric_attendance` DROP COLUMN `check_in_time`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- DROP COLUMN: check_out_time de biometric_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND COLUMN_NAME = 'check_out_time');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `biometric_attendance` DROP COLUMN `check_out_time`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- DROP COLUMN: photo_url de biometric_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND COLUMN_NAME = 'photo_url');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `biometric_attendance` DROP COLUMN `photo_url`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: password_hash em users
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `users` ADD `password_hash` varchar(255)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: check_in em biometric_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND COLUMN_NAME = 'check_in');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `biometric_attendance` ADD `check_in` timestamp NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: check_out em biometric_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'biometric_attendance' AND COLUMN_NAME = 'check_out');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `biometric_attendance` ADD `check_out` timestamp', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: password em clients
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'password');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `clients` ADD `password` varchar(255)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: sector_id em equipment
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'sector_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `equipment` ADD `sector_id` int', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: photo_url em parts
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts' AND COLUMN_NAME = 'photo_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `parts` ADD `photo_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: photo_url em vehicle_records
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_records' AND COLUMN_NAME = 'photo_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `vehicle_records` ADD `photo_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: license_plate em equipment
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'license_plate');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `equipment` ADD `license_plate` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: destination_id em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'destination_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `destination_id` int', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: weight_kg em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_kg');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `weight_kg` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: tracking_status em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'tracking_status');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `tracking_status` enum(\'aguardando\',\'carregando\',\'em_transito\',\'pesagem_saida\',\'descarregando\',\'pesagem_chegada\',\'finalizado\') DEFAULT \'aguardando\'', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: tracking_updated_at em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'tracking_updated_at');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `tracking_updated_at` timestamp', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: tracking_notes em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'tracking_notes');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `tracking_notes` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: weight_out_photo_url em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_out_photo_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `weight_out_photo_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: weight_in_photo_url em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_in_photo_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `weight_in_photo_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: client_id em cargo_destinations
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_destinations' AND COLUMN_NAME = 'client_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_destinations` ADD `client_id` int', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: image_url em chainsaw_parts
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_parts' AND COLUMN_NAME = 'image_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `chainsaw_parts` ADD `image_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: image_url em chainsaw_service_orders
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaw_service_orders' AND COLUMN_NAME = 'image_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `chainsaw_service_orders` ADD `image_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: image_url em chainsaws
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chainsaws' AND COLUMN_NAME = 'image_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `chainsaws` ADD `image_url` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: latitude em collaborator_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND COLUMN_NAME = 'latitude');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `collaborator_attendance` ADD `latitude` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: longitude em collaborator_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND COLUMN_NAME = 'longitude');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `collaborator_attendance` ADD `longitude` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN: location_name em collaborator_attendance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND COLUMN_NAME = 'location_name');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `collaborator_attendance` ADD `location_name` varchar(255)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN (extra): default_height_m em equipment
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'default_height_m');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `equipment` ADD `default_height_m` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN (extra): default_width_m em equipment
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'default_width_m');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `equipment` ADD `default_width_m` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN (extra): default_length_m em equipment
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'default_length_m');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `equipment` ADD `default_length_m` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN (extra): weight_out_kg em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_out_kg');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `weight_out_kg` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN (extra): weight_in_kg em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_in_kg');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `weight_in_kg` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN (extra): final_height_m em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'final_height_m');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `final_height_m` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN (extra): final_width_m em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'final_width_m');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `final_width_m` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN (extra): final_length_m em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'final_length_m');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `final_length_m` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN (extra): final_volume_m3 em cargo_loads
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'final_volume_m3');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `cargo_loads` ADD `final_volume_m3` varchar(20)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN (extra): maintenance_location em vehicle_records
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_records' AND COLUMN_NAME = 'maintenance_location');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `vehicle_records` ADD `maintenance_location` varchar(255)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN (extra): photos_json em vehicle_records
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicle_records' AND COLUMN_NAME = 'photos_json');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `vehicle_records` ADD `photos_json` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ADD COLUMN (extra): photos_json em parts
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parts' AND COLUMN_NAME = 'photos_json');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `parts` ADD `photos_json` text', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- MODIFY
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);

-- MODIFY
ALTER TABLE `users` MODIFY COLUMN `name` text NOT NULL;

-- MODIFY
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;

-- MODIFY
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) NOT NULL DEFAULT 'email';

-- MODIFY
ALTER TABLE `biometric_attendance` MODIFY COLUMN `registered_by` int;

