-- ============================================================
-- BTREE Ambiental — Corrigir schema da tabela chainsaw_chain_stock
-- Problema: tabela criada com nomes de colunas antigos
-- O código atual espera: sharpened_in_box, in_field, in_workshop, total_stock, updated_at
-- A tabela no Hostinger tem: qty_sharpened, qty_field, qty_workshop, qty_total_stock
-- ============================================================

-- Passo 1: Adicionar coluna updated_at (se não existir)
ALTER TABLE `chainsaw_chain_stock`
  ADD COLUMN `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Passo 2: Copiar dados das colunas antigas para as novas
UPDATE `chainsaw_chain_stock` SET
  `sharpened_in_box` = `qty_sharpened`,
  `in_field`         = `qty_field`,
  `in_workshop`      = `qty_workshop`,
  `total_stock`      = `qty_total_stock`;

-- Passo 3: Remover colunas antigas (não usadas pelo código)
ALTER TABLE `chainsaw_chain_stock`
  DROP COLUMN `qty_sharpened`,
  DROP COLUMN `qty_field`,
  DROP COLUMN `qty_workshop`,
  DROP COLUMN `qty_total_stock`;

-- Passo 4: Verificar resultado final
-- SHOW COLUMNS FROM `chainsaw_chain_stock`;
-- SELECT * FROM `chainsaw_chain_stock`;
