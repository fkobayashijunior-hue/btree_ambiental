-- FIX: Adicionar colunas faltantes na tabela cargo_destinations
-- Execute no phpMyAdmin da Hostinger

ALTER TABLE `cargo_destinations`
  ADD COLUMN IF NOT EXISTS `notes` TEXT NULL AFTER `state`,
  ADD COLUMN IF NOT EXISTS `created_by` INT NULL AFTER `created_at`;

-- Verificação
SHOW COLUMNS FROM cargo_destinations;
