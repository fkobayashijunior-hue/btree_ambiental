-- ============================================================
-- BTREE AMBIENTAL - Migrações para phpMyAdmin (Hostinger)
-- Data: 04/04/2026
-- Execute este SQL no phpMyAdmin do banco de dados da Hostinger
-- IMPORTANTE: Execute TUDO de uma vez (selecione tudo e clique em Executar)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. COLUNAS GPS na tabela collaborator_attendance
--    NECESSÁRIO para o módulo de Presenças funcionar!
-- ─────────────────────────────────────────────────────────────
ALTER TABLE `collaborator_attendance`
  ADD COLUMN IF NOT EXISTS `latitude` VARCHAR(20) NULL AFTER `paid_at`,
  ADD COLUMN IF NOT EXISTS `longitude` VARCHAR(20) NULL AFTER `latitude`,
  ADD COLUMN IF NOT EXISTS `location_name` VARCHAR(255) NULL AFTER `longitude`;

-- ─────────────────────────────────────────────────────────────
-- 2. TABELA: financial_entries (Módulo Financeiro)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `financial_entries` (
  `id`                INT NOT NULL AUTO_INCREMENT,
  `type`              ENUM('receita', 'despesa') NOT NULL,
  `category`          VARCHAR(100) NOT NULL,
  `description`       VARCHAR(500) NOT NULL,
  `amount`            VARCHAR(20) NOT NULL,
  `date`              DATETIME NOT NULL,
  `reference_month`   VARCHAR(7) NULL,
  `payment_method`    ENUM('dinheiro', 'pix', 'cartao', 'transferencia', 'boleto', 'cheque') NOT NULL DEFAULT 'pix',
  `status`            ENUM('pendente', 'confirmado', 'cancelado') NOT NULL DEFAULT 'confirmado',
  `client_id`         INT NULL,
  `client_name`       VARCHAR(255) NULL,
  `receipt_image_url` TEXT NULL,
  `notes`             TEXT NULL,
  `registered_by`     INT NULL,
  `registered_by_name` VARCHAR(255) NULL,
  `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_financial_type` (`type`),
  INDEX `idx_financial_date` (`date`),
  INDEX `idx_financial_ref_month` (`reference_month`),
  INDEX `idx_financial_status` (`status`),
  CONSTRAINT `fk_financial_client`
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_financial_user`
    FOREIGN KEY (`registered_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 3. TABELA: gps_locations (Locais GPS cadastrados)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `gps_locations` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `name`            VARCHAR(255) NOT NULL,
  `latitude`        VARCHAR(30) NOT NULL,
  `longitude`       VARCHAR(30) NOT NULL,
  `radius_meters`   INT NOT NULL DEFAULT 2000,
  `is_active`       TINYINT(1) NOT NULL DEFAULT 1,
  `notes`           TEXT NULL,
  `created_by`      INT NULL,
  `created_by_name` VARCHAR(255) NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_gps_active` (`is_active`),
  CONSTRAINT `fk_gps_user`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 4. TABELA: replanting_records (Replantios - Portal do Cliente)
--    NECESSÁRIO para o Portal do Cliente funcionar!
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `replanting_records` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `client_id`       INT NOT NULL,
  `date`            DATETIME NOT NULL,
  `area`            VARCHAR(100) NULL,
  `species`         VARCHAR(100) DEFAULT 'Eucalipto',
  `quantity`        INT NULL,
  `area_hectares`   VARCHAR(20) NULL,
  `notes`           TEXT NULL,
  `photos_json`     TEXT NULL,
  `registered_by`   INT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_replanting_client` (`client_id`),
  INDEX `idx_replanting_date` (`date`),
  CONSTRAINT `fk_replanting_client`
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_replanting_user`
    FOREIGN KEY (`registered_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 5. TABELA: client_payments (Pagamentos - Portal do Cliente)
--    NECESSÁRIO para o Portal do Cliente funcionar!
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `client_payments` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `client_id`       INT NOT NULL,
  `reference_date`  DATETIME NOT NULL,
  `description`     VARCHAR(500) NULL,
  `volume_m3`       VARCHAR(20) NULL,
  `price_per_m3`    VARCHAR(20) NULL,
  `gross_amount`    VARCHAR(20) NOT NULL,
  `deductions`      VARCHAR(20) DEFAULT '0',
  `net_amount`      VARCHAR(20) NOT NULL,
  `status`          ENUM('pendente', 'pago', 'atrasado', 'cancelado') NOT NULL DEFAULT 'pendente',
  `due_date`        DATETIME NULL,
  `paid_at`         DATETIME NULL,
  `pix_key`         VARCHAR(255) NULL,
  `notes`           TEXT NULL,
  `registered_by`   INT NULL,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_payments_client` (`client_id`),
  INDEX `idx_payments_status` (`status`),
  INDEX `idx_payments_ref_date` (`reference_date`),
  CONSTRAINT `fk_payments_client`
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_user`
    FOREIGN KEY (`registered_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- VERIFICAÇÃO: confirmar que as alterações foram aplicadas
-- ─────────────────────────────────────────────────────────────
SHOW COLUMNS FROM `collaborator_attendance` LIKE 'latitude';
SHOW COLUMNS FROM `collaborator_attendance` LIKE 'longitude';
SHOW COLUMNS FROM `collaborator_attendance` LIKE 'location_name';
SHOW TABLES LIKE 'financial_entries';
SHOW TABLES LIKE 'gps_locations';
SHOW TABLES LIKE 'replanting_records';
SHOW TABLES LIKE 'client_payments';
