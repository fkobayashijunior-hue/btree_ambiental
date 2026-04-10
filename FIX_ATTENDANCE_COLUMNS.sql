-- ================================================================
-- FIX: Adicionar colunas faltantes na tabela collaborator_attendance
-- Execute este script no phpMyAdmin da Hostinger
-- ================================================================

-- Verificar e adicionar coluna employment_type_ca
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND COLUMN_NAME = 'employment_type_ca');
SET @sql = IF(@col_exists = 0, 
  "ALTER TABLE `collaborator_attendance` ADD COLUMN `employment_type_ca` ENUM('clt','terceirizado','diarista') NOT NULL DEFAULT 'diarista' AFTER `date`", 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar coluna payment_status_ca
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND COLUMN_NAME = 'payment_status_ca');
SET @sql = IF(@col_exists = 0, 
  "ALTER TABLE `collaborator_attendance` ADD COLUMN `payment_status_ca` ENUM('pendente','pago') NOT NULL DEFAULT 'pendente' AFTER `observations`", 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar coluna latitude
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND COLUMN_NAME = 'latitude');
SET @sql = IF(@col_exists = 0, 
  "ALTER TABLE `collaborator_attendance` ADD COLUMN `latitude` VARCHAR(20) DEFAULT NULL", 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar coluna longitude
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND COLUMN_NAME = 'longitude');
SET @sql = IF(@col_exists = 0, 
  "ALTER TABLE `collaborator_attendance` ADD COLUMN `longitude` VARCHAR(20) DEFAULT NULL", 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar coluna location_name
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance' AND COLUMN_NAME = 'location_name');
SET @sql = IF(@col_exists = 0, 
  "ALTER TABLE `collaborator_attendance` ADD COLUMN `location_name` VARCHAR(255) DEFAULT NULL", 
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar estrutura final
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collaborator_attendance'
ORDER BY ORDINAL_POSITION;

-- ================================================================
-- FIM - Após executar, a listagem de presenças deve funcionar
-- ================================================================
