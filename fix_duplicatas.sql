-- ============================================================
-- SCRIPT: Corrigir duplicatas de Setores e Clientes
-- Sistema: BTREE Ambiental
-- Data: 2026-07-12
-- ============================================================
-- INSTRUÇÕES:
-- 1. Acesse o phpMyAdmin ou terminal MySQL da Hostinger
-- 2. Selecione o banco de dados do sistema BTREE
-- 3. Execute este script completo
-- ============================================================

-- ── PASSO 1: Ver duplicatas de Setores ──────────────────────
-- Execute para identificar os IDs duplicados antes de deletar:
-- SELECT id, name FROM sectors WHERE name IN (
--   SELECT name FROM sectors GROUP BY name HAVING COUNT(*) > 1
-- ) ORDER BY name, id;

-- ── PASSO 2: Corrigir duplicata "Caminhões" ─────────────────
-- Mantém o registro com MENOR id (mais antigo) e deleta o duplicado
-- Primeiro, reatribui equipamentos do id duplicado para o original:
UPDATE equipment
SET sector_id = (SELECT MIN(id) FROM sectors WHERE name = 'Caminhões')
WHERE sector_id = (SELECT MAX(id) FROM sectors WHERE name = 'Caminhões');

-- Agora deleta o duplicado (o de maior id):
DELETE FROM sectors
WHERE name = 'Caminhões'
AND id = (SELECT max_id FROM (SELECT MAX(id) AS max_id FROM sectors WHERE name = 'Caminhões') AS t);

-- ── PASSO 3: Corrigir duplicata "Fazenda GW" em clients ─────
-- Verifica se a duplicata está na tabela clients:
-- SELECT id, name FROM clients WHERE name = 'Fazenda GW' ORDER BY id;

-- Reatribui cargas/equipamentos do duplicado para o original:
UPDATE equipment
SET client_id = (SELECT MIN(id) FROM clients WHERE name = 'Fazenda GW')
WHERE client_id = (SELECT MAX(id) FROM clients WHERE name = 'Fazenda GW');

UPDATE cargo_loads
SET client_id = (SELECT MIN(id) FROM clients WHERE name = 'Fazenda GW')
WHERE client_id = (SELECT MAX(id) FROM clients WHERE name = 'Fazenda GW');

-- Deleta o duplicado (o de maior id):
DELETE FROM clients
WHERE name = 'Fazenda GW'
AND id = (SELECT max_id FROM (SELECT MAX(id) AS max_id FROM clients WHERE name = 'Fazenda GW') AS t);

-- ── PASSO 4: Verificar resultado ────────────────────────────
SELECT 'Setores após correção:' AS info;
SELECT id, name FROM sectors ORDER BY name;

SELECT 'Clientes após correção:' AS info;
SELECT id, name FROM clients ORDER BY name;
