-- ============================================================
-- BTREE Ambiental — Atualização Hostinger v2
-- Data: 01/04/2026
-- Aplica migrações 0016 e 0017 + inicializa estoque de correntes
-- ============================================================

-- 1. Migração 0016: Adicionar client_id em cargo_destinations
-- (Executar apenas se a coluna ainda não existir)
ALTER TABLE `cargo_destinations` ADD COLUMN IF NOT EXISTS `client_id` int;
ALTER TABLE `cargo_destinations` ADD CONSTRAINT IF NOT EXISTS `cargo_destinations_client_id_clients_id_fk`
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;

-- 2. Migração 0017: Adicionar image_url nas tabelas de motosserra
ALTER TABLE `chainsaw_parts` ADD COLUMN IF NOT EXISTS `image_url` text;
ALTER TABLE `chainsaw_service_orders` ADD COLUMN IF NOT EXISTS `image_url` text;
ALTER TABLE `chainsaws` ADD COLUMN IF NOT EXISTS `image_url` text;

-- 3. Inicializar estoque de correntes (se tabela estiver vazia)
-- Isso corrige o dropdown de tipo de corrente na movimentação
INSERT IGNORE INTO `chainsaw_chain_stock` (`chain_type`, `sharpened_in_box`, `in_field`, `in_workshop`, `total_stock`, `created_at`, `updated_at`)
VALUES
  ('30', 0, 0, 0, 0, NOW(), NOW()),
  ('34', 0, 0, 0, 0, NOW(), NOW());

-- 4. Diagnóstico do portal do cliente (Fazenda GW)
-- Execute esta query para ver os clientes cadastrados e suas cargas:
-- SELECT c.id, c.name, c.email, COUNT(cl.id) as total_cargas
-- FROM clients c
-- LEFT JOIN cargo_loads cl ON cl.client_id = c.id
-- GROUP BY c.id, c.name, c.email;

-- Se as cargas da Fazenda GW estiverem com client_id NULL mas client_name preenchido,
-- execute o seguinte para vincular automaticamente:
-- UPDATE cargo_loads cl
-- JOIN clients c ON cl.client_name LIKE CONCAT('%', c.name, '%') OR c.name LIKE CONCAT('%', cl.client_name, '%')
-- SET cl.client_id = c.id
-- WHERE cl.client_id IS NULL AND cl.client_name IS NOT NULL AND cl.client_name != '';

-- ============================================================
-- Registrar migrações na tabela de controle do Drizzle
-- (Apenas se as migrações não estiverem registradas)
-- ============================================================
INSERT IGNORE INTO `__drizzle_migrations` (`hash`, `created_at`)
VALUES
  ('0016_friendly_avengers', UNIX_TIMESTAMP() * 1000),
  ('0017_violet_sleeper', UNIX_TIMESTAMP() * 1000);
