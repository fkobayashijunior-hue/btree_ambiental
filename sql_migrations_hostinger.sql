-- ============================================================
-- BTREE AMBIENTAL - Migrações para phpMyAdmin (Hostinger)
-- Data: 04/04/2026
-- Execute este SQL no phpMyAdmin do banco de dados da Hostinger
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABELA: financial_entries (Módulo Financeiro)
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
-- TABELA: gps_locations (Locais GPS cadastrados)
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
-- VERIFICAÇÃO: confirmar que as tabelas foram criadas
-- ─────────────────────────────────────────────────────────────
SHOW TABLES LIKE 'financial_entries';
SHOW TABLES LIKE 'gps_locations';
