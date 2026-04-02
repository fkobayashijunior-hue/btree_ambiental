-- ============================================================
-- BTREE Ambiental — Atualização Hostinger v2 (MySQL compatível)
-- Data: 01/04/2026
-- Aplica migrações 0016 e 0017 + inicializa estoque de correntes
-- ============================================================

-- 1. Migração 0016: Adicionar client_id em cargo_destinations
--    (Só execute se a coluna ainda não existir — verifique com:
--     SHOW COLUMNS FROM cargo_destinations LIKE 'client_id';)
ALTER TABLE `cargo_destinations` ADD COLUMN `client_id` int NULL;
ALTER TABLE `cargo_destinations` ADD CONSTRAINT `cargo_destinations_client_id_clients_id_fk`
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`);

-- 2. Migração 0017: Adicionar image_url nas tabelas de motosserra
--    (Só execute se as colunas ainda não existirem)
ALTER TABLE `chainsaw_parts` ADD COLUMN `image_url` text NULL;
ALTER TABLE `chainsaw_service_orders` ADD COLUMN `image_url` text NULL;
ALTER TABLE `chainsaws` ADD COLUMN `image_url` text NULL;

-- 3. Inicializar estoque de correntes (se tabela estiver vazia)
--    Corrige o dropdown vazio no modal de movimentação de correntes
INSERT IGNORE INTO `chainsaw_chain_stock`
  (`chain_type`, `sharpened_in_box`, `in_field`, `in_workshop`, `total_stock`, `created_at`, `updated_at`)
VALUES
  ('30', 0, 0, 0, 0, NOW(), NOW()),
  ('34', 0, 0, 0, 0, NOW(), NOW());

-- ============================================================
-- 4. DIAGNÓSTICO: Ver clientes e suas cargas vinculadas
-- ============================================================
-- SELECT c.id, c.name, c.email,
--        COUNT(cl.id) AS total_cargas_vinculadas
-- FROM clients c
-- LEFT JOIN cargo_loads cl ON cl.client_id = c.id
-- GROUP BY c.id, c.name, c.email;

-- ============================================================
-- 5. CORREÇÃO PORTAL FAZENDA GW:
--    Vincular cargas existentes ao cliente pelo nome
--    (Execute apenas após confirmar o nome exato do cliente com a query acima)
-- ============================================================
-- UPDATE cargo_loads cl
-- JOIN clients c
--   ON cl.client_name LIKE CONCAT('%', c.name, '%')
--   OR c.name LIKE CONCAT('%', cl.client_name, '%')
-- SET cl.client_id = c.id
-- WHERE cl.client_id IS NULL
--   AND cl.client_name IS NOT NULL
--   AND cl.client_name != '';
