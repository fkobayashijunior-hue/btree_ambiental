-- ============================================================
-- CORREÇÃO: cargo_destinations + vínculo portal do cliente
-- Execute no phpMyAdmin da Hostinger
-- Banco: u629128033_btree_ambienta
-- ============================================================

-- PASSO 1: Adicionar coluna client_id em cargo_destinations (se não existir)
ALTER TABLE `cargo_destinations` 
  ADD COLUMN IF NOT EXISTS `client_id` int NULL;

-- PASSO 2: Adicionar a foreign key (ignora se já existir)
ALTER TABLE `cargo_destinations`
  ADD CONSTRAINT `cargo_destinations_client_id_clients_id_fk`
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`)
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- PASSO 3: Vincular destinos existentes ao cliente correto
-- (Busca por nome similar entre destinos e clientes)
UPDATE `cargo_destinations` d
JOIN `clients` c ON (
  LOWER(d.name COLLATE utf8mb4_unicode_ci) LIKE CONCAT('%', LOWER(c.name COLLATE utf8mb4_unicode_ci), '%')
  OR LOWER(c.name COLLATE utf8mb4_unicode_ci) LIKE CONCAT('%', LOWER(d.name COLLATE utf8mb4_unicode_ci), '%')
)
SET d.client_id = c.id
WHERE d.client_id IS NULL;

-- PASSO 4: Vincular cargas existentes ao clientId correto
-- (Atualiza cargas que têm clientName mas não têm clientId)
UPDATE `cargo_loads` cl
JOIN `clients` c ON (
  LOWER(cl.client_name COLLATE utf8mb4_unicode_ci) LIKE CONCAT('%', LOWER(c.name COLLATE utf8mb4_unicode_ci), '%')
  OR LOWER(c.name COLLATE utf8mb4_unicode_ci) LIKE CONCAT('%', LOWER(cl.client_name COLLATE utf8mb4_unicode_ci), '%')
)
SET cl.client_id = c.id
WHERE cl.client_id IS NULL AND cl.client_name IS NOT NULL AND cl.client_name != '';

-- PASSO 5: Verificar resultado
SELECT 
  'cargo_destinations com cliente vinculado' AS descricao,
  COUNT(*) AS total
FROM `cargo_destinations` WHERE client_id IS NOT NULL
UNION ALL
SELECT 
  'cargo_loads com clientId preenchido' AS descricao,
  COUNT(*) AS total
FROM `cargo_loads` WHERE client_id IS NOT NULL;
