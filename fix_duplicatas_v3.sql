-- ============================================================
-- SCRIPT v3: Corrigir duplicatas (versão simplificada e segura)
-- Sistema: BTREE Ambiental | Data: 2026-07-12
-- ============================================================
-- EXECUTE CADA BLOCO SEPARADAMENTE no phpMyAdmin
-- Cole um bloco de cada vez e clique em Executar
-- ============================================================

-- ── BLOCO 1: Ver os IDs duplicados (execute primeiro para confirmar) ──
SELECT 'SETORES DUPLICADOS:' AS info;
SELECT id, name FROM sectors WHERE name IN (
  SELECT name FROM sectors GROUP BY name HAVING COUNT(*) > 1
) ORDER BY name, id;

SELECT 'CLIENTES DUPLICADOS:' AS info;
SELECT id, name FROM clients WHERE name IN (
  SELECT name FROM clients GROUP BY name HAVING COUNT(*) > 1
) ORDER BY name, id;

-- ============================================================
-- ── BLOCO 2: Corrigir "Caminhões" em sectors ──
-- (Execute separadamente após confirmar os IDs acima)
-- ============================================================

-- Desabilitar FK checks
SET FOREIGN_KEY_CHECKS = 0;

-- Reatribuir equipamentos do setor duplicado (maior id) para o original (menor id)
UPDATE equipment e
JOIN (
  SELECT MIN(id) AS keep_id, MAX(id) AS del_id
  FROM sectors WHERE name = 'Caminhões'
) ids ON e.sector_id = ids.del_id
SET e.sector_id = ids.keep_id;

-- Deletar o setor duplicado
DELETE s FROM sectors s
JOIN (
  SELECT MAX(id) AS del_id FROM sectors WHERE name = 'Caminhões'
) ids ON s.id = ids.del_id;

-- Reabilitar FK checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- ── BLOCO 3: Corrigir "Fazenda GW" em clients ──
-- (Execute separadamente após o bloco 2)
-- ============================================================

-- Desabilitar FK checks
SET FOREIGN_KEY_CHECKS = 0;

-- Reatribuir cargo_loads
UPDATE cargo_loads cl
JOIN (
  SELECT MIN(id) AS keep_id, MAX(id) AS del_id
  FROM clients WHERE name = 'Fazenda GW'
) ids ON cl.client_id = ids.del_id
SET cl.client_id = ids.keep_id;

-- Reatribuir equipment
UPDATE equipment e
JOIN (
  SELECT MIN(id) AS keep_id, MAX(id) AS del_id
  FROM clients WHERE name = 'Fazenda GW'
) ids ON e.client_id = ids.del_id
SET e.client_id = ids.keep_id;

-- Reatribuir client_advances
UPDATE client_advances ca
JOIN (
  SELECT MIN(id) AS keep_id, MAX(id) AS del_id
  FROM clients WHERE name = 'Fazenda GW'
) ids ON ca.client_id = ids.del_id
SET ca.client_id = ids.keep_id;

-- Reatribuir cargo_weekly_closings
UPDATE cargo_weekly_closings cwc
JOIN (
  SELECT MIN(id) AS keep_id, MAX(id) AS del_id
  FROM clients WHERE name = 'Fazenda GW'
) ids ON cwc.client_id = ids.del_id
SET cwc.client_id = ids.keep_id;

-- Reatribuir cargo_destinations
UPDATE cargo_destinations cd
JOIN (
  SELECT MIN(id) AS keep_id, MAX(id) AS del_id
  FROM clients WHERE name = 'Fazenda GW'
) ids ON cd.client_id = ids.del_id
SET cd.client_id = ids.keep_id;

-- Deletar o cliente duplicado (maior id)
DELETE c FROM clients c
JOIN (
  SELECT MAX(id) AS del_id FROM clients WHERE name = 'Fazenda GW'
) ids ON c.id = ids.del_id;

-- Reabilitar FK checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- ── BLOCO 4: Verificação final ──
-- ============================================================
SELECT 'Setores após correção:' AS resultado;
SELECT id, name FROM sectors ORDER BY name;

SELECT 'Clientes após correção:' AS resultado;
SELECT id, name FROM clients ORDER BY name;
