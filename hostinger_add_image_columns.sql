-- ============================================================
-- BTREE Ambiental — Adicionar colunas image_url (migração 0017)
-- Execute no phpMyAdmin dentro do banco u629128033_btree_ambienta
-- ============================================================

-- 1. Adicionar image_url na tabela de motosserras
ALTER TABLE `chainsaws` ADD COLUMN `image_url` text NULL;

-- 2. Adicionar image_url na tabela de peças de motosserra
ALTER TABLE `chainsaw_parts` ADD COLUMN `image_url` text NULL;

-- 3. Adicionar image_url na tabela de ordens de serviço
ALTER TABLE `chainsaw_service_orders` ADD COLUMN `image_url` text NULL;

-- Verificar resultado:
-- SHOW COLUMNS FROM `chainsaws` LIKE 'image_url';
-- SHOW COLUMNS FROM `chainsaw_parts` LIKE 'image_url';
-- SHOW COLUMNS FROM `chainsaw_service_orders` LIKE 'image_url';
