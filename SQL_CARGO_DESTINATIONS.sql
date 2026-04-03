-- ============================================================
-- MIGRAÇÃO: Criar tabela cargo_destinations
-- Execute no phpMyAdmin → banco u629128033_btree_ambienta
-- ============================================================

CREATE TABLE IF NOT EXISTS `cargo_destinations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(500) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `state` VARCHAR(2) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `active` INT NOT NULL DEFAULT 1,
  `client_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT DEFAULT NULL,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar coluna destination_id na tabela cargo_loads (se não existir)
ALTER TABLE `cargo_loads`
  ADD COLUMN IF NOT EXISTS `destination_id` INT DEFAULT NULL,
  ADD FOREIGN KEY (`destination_id`) REFERENCES `cargo_destinations`(`id`) ON DELETE SET NULL;

-- Confirmar criação
SHOW TABLES LIKE 'cargo_destinations';
DESCRIBE cargo_destinations;
