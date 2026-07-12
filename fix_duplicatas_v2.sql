-- ============================================================
-- SCRIPT v2: Corrigir duplicatas de Setores e Clientes
-- Sistema: BTREE Ambiental
-- Data: 2026-07-12
-- ============================================================
-- INSTRUÇÕES:
-- 1. Acesse o phpMyAdmin da Hostinger
-- 2. Selecione o banco: u629128033_btree_ambienta
-- 3. Clique em "SQL" e cole este script completo
-- 4. Clique em "Executar"
-- ============================================================

-- Desabilitar verificação de chaves estrangeiras temporariamente
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- PARTE 1: Corrigir duplicata "Fazenda GW" em clients
-- ============================================================

-- Passo 1: Descobrir os IDs (o menor é o original, o maior é o duplicado)
-- Você pode verificar antes executando:
-- SELECT id, name FROM clients WHERE name = 'Fazenda GW' ORDER BY id;

-- Passo 2: Reatribuir TODAS as tabelas dependentes do duplicado para o original

-- cargo_loads
UPDATE cargo_loads
SET client_id = (SELECT MIN(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t)
WHERE client_id = (SELECT MAX(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t);

-- equipment
UPDATE equipment
SET client_id = (SELECT MIN(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t)
WHERE client_id = (SELECT MAX(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t);

-- client_advances
UPDATE client_advances
SET client_id = (SELECT MIN(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t)
WHERE client_id = (SELECT MAX(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t);

-- buyer_payments (se existir referência)
UPDATE buyer_payments
SET client_id = (SELECT MIN(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t)
WHERE client_id = (SELECT MAX(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t);

-- cargo_weekly_closings
UPDATE cargo_weekly_closings
SET client_id = (SELECT MIN(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t)
WHERE client_id = (SELECT MAX(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t);

-- cargo_destinations
UPDATE cargo_destinations
SET client_id = (SELECT MIN(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t)
WHERE client_id = (SELECT MAX(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t);

-- buyer_clients
UPDATE buyer_clients
SET client_id = (SELECT MIN(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t)
WHERE client_id = (SELECT MAX(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t);

-- buyer_price_history
UPDATE buyer_price_history
SET client_id = (SELECT MIN(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t)
WHERE client_id = (SELECT MAX(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t);

-- Passo 3: Deletar o duplicado (maior id)
DELETE FROM clients
WHERE name = 'Fazenda GW'
AND id = (SELECT MAX(id) FROM (SELECT id FROM clients WHERE name = 'Fazenda GW') AS t);

-- ============================================================
-- PARTE 2: Corrigir duplicata "Caminhões" em sectors
-- ============================================================

-- Reatribuir equipamentos do setor duplicado para o original
UPDATE equipment
SET sector_id = (SELECT MIN(id) FROM (SELECT id FROM sectors WHERE name = 'Caminhões') AS t)
WHERE sector_id = (SELECT MAX(id) FROM (SELECT id FROM sectors WHERE name = 'Caminhões') AS t);

-- Deletar o setor duplicado (maior id)
DELETE FROM sectors
WHERE name = 'Caminhões'
AND id = (SELECT MAX(id) FROM (SELECT id FROM sectors WHERE name = 'Caminhões') AS t);

-- ============================================================
-- Reabilitar verificação de chaves estrangeiras
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT 'Setores após correção:' AS resultado;
SELECT id, name FROM sectors ORDER BY name;

SELECT 'Clientes após correção:' AS resultado;
SELECT id, name FROM clients ORDER BY name;
