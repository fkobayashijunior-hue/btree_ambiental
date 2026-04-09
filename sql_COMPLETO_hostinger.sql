-- =====================================================
-- BTREE AMBIENTAL - SCRIPT SQL COMPLETO
-- Todas as alterações da sprint 05/04/2026
-- Rodar no banco MySQL da Hostinger
-- =====================================================
-- ATENÇÃO: Este script usa IF NOT EXISTS e IF NOT EXISTS
-- para ser seguro de rodar múltiplas vezes sem erro.
-- =====================================================

-- =====================================================
-- 1. NOVA TABELA: cargo_tracking_photos
-- Armazena fotos de cada etapa do tracking de cargas
-- =====================================================
CREATE TABLE IF NOT EXISTS `cargo_tracking_photos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cargo_id` INT NOT NULL,
  `stage` VARCHAR(50) NOT NULL COMMENT 'aguardando, carregando, pesagem_saida, em_transito, descarregando, pesagem_chegada, finalizado',
  `photo_url` TEXT NOT NULL,
  `notes` TEXT,
  `registered_by` INT,
  `registered_by_name` VARCHAR(255),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cargo_tracking_photos_cargo_id` (`cargo_id`),
  INDEX `idx_cargo_tracking_photos_stage` (`stage`),
  CONSTRAINT `fk_cargo_tracking_photos_cargo` FOREIGN KEY (`cargo_id`) REFERENCES `cargo_loads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cargo_tracking_photos_user` FOREIGN KEY (`registered_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. NOVAS COLUNAS na tabela cargo_loads
-- Peso saída/chegada e metragem final
-- =====================================================

-- Peso na pesagem de saída (kg)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_out_kg') = 0,
  'ALTER TABLE `cargo_loads` ADD COLUMN `weight_out_kg` VARCHAR(20) DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Peso na pesagem de chegada (kg)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_in_kg') = 0,
  'ALTER TABLE `cargo_loads` ADD COLUMN `weight_in_kg` VARCHAR(20) DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Foto do ticket de pesagem saída
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_out_photo_url') = 0,
  'ALTER TABLE `cargo_loads` ADD COLUMN `weight_out_photo_url` TEXT DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Foto do ticket de pesagem chegada
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'weight_in_photo_url') = 0,
  'ALTER TABLE `cargo_loads` ADD COLUMN `weight_in_photo_url` TEXT DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Metragem final - Altura (m)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'final_height_m') = 0,
  'ALTER TABLE `cargo_loads` ADD COLUMN `final_height_m` VARCHAR(20) DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Metragem final - Largura (m)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'final_width_m') = 0,
  'ALTER TABLE `cargo_loads` ADD COLUMN `final_width_m` VARCHAR(20) DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Metragem final - Comprimento (m)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'final_length_m') = 0,
  'ALTER TABLE `cargo_loads` ADD COLUMN `final_length_m` VARCHAR(20) DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Volume final (m³) calculado
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'final_volume_m3') = 0,
  'ALTER TABLE `cargo_loads` ADD COLUMN `final_volume_m3` VARCHAR(20) DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tracking status (se não existir)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'tracking_status') = 0,
  'ALTER TABLE `cargo_loads` ADD COLUMN `tracking_status` ENUM(''aguardando'',''carregando'',''em_transito'',''pesagem_saida'',''descarregando'',''pesagem_chegada'',''finalizado'') DEFAULT ''aguardando''',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tracking updated at (se não existir)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'tracking_updated_at') = 0,
  'ALTER TABLE `cargo_loads` ADD COLUMN `tracking_updated_at` TIMESTAMP NULL DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tracking notes (se não existir)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_loads' AND COLUMN_NAME = 'tracking_notes') = 0,
  'ALTER TABLE `cargo_loads` ADD COLUMN `tracking_notes` TEXT DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 3. NOVAS COLUNAS na tabela equipment
-- Medidas padrão por caminhão
-- =====================================================

-- Altura padrão (m)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'default_height_m') = 0,
  'ALTER TABLE `equipment` ADD COLUMN `default_height_m` VARCHAR(20) DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Largura padrão (m)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'default_width_m') = 0,
  'ALTER TABLE `equipment` ADD COLUMN `default_width_m` VARCHAR(20) DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Comprimento padrão (m)
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment' AND COLUMN_NAME = 'default_length_m') = 0,
  'ALTER TABLE `equipment` ADD COLUMN `default_length_m` VARCHAR(20) DEFAULT NULL',
  'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
SELECT 'Script executado com sucesso!' AS resultado;

-- Verificar tabela criada
SELECT TABLE_NAME, TABLE_ROWS 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cargo_tracking_photos';

-- Verificar novas colunas em cargo_loads
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'cargo_loads' 
  AND COLUMN_NAME IN ('weight_out_kg','weight_in_kg','weight_out_photo_url','weight_in_photo_url','final_height_m','final_width_m','final_length_m','final_volume_m3','tracking_status','tracking_updated_at','tracking_notes');

-- Verificar novas colunas em equipment
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'equipment' 
  AND COLUMN_NAME IN ('default_height_m','default_width_m','default_length_m');
