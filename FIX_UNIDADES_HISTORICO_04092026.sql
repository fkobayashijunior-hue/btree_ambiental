-- ============================================================
-- BTREE Ambiental — Corrigir unidades (m³/ton) das ações já geradas
-- Data: 04/09/2026
-- Regra de negócio: LÍDER = m³; SONOCO, REBNIC e demais = tonelada.
-- Execute no phpMyAdmin. Recomendado backup antes.
-- ============================================================

-- PASSO 1 (verificação): veja como as ações estão hoje
-- SELECT fn.action_code, fn.quantity_type, fn.quantity, cl.destination
-- FROM fiscal_notes fn
-- LEFT JOIN cargo_loads cl ON cl.id = fn.used_by_cargo_id
-- ORDER BY fn.id DESC LIMIT 40;

-- PASSO 2 (correção): ajusta a unidade conforme o destino da carga
-- ou, quando não houver carga vinculada, pelo texto das observações da ação.

-- LÍDER -> m³
UPDATE fiscal_notes fn
LEFT JOIN cargo_loads cl ON cl.id = fn.used_by_cargo_id
SET fn.quantity_type = 'm3'
WHERE UPPER(COALESCE(cl.destination, '')) LIKE '%LIDER%'
   OR UPPER(COALESCE(cl.destination, '')) LIKE '%LÍDER%'
   OR UPPER(COALESCE(fn.notes, '')) LIKE '%LIDER%'
   OR UPPER(COALESCE(fn.notes, '')) LIKE '%LÍDER%';

-- SONOCO -> ton
UPDATE fiscal_notes fn
LEFT JOIN cargo_loads cl ON cl.id = fn.used_by_cargo_id
SET fn.quantity_type = 'ton'
WHERE UPPER(COALESCE(cl.destination, '')) LIKE '%SONOCO%'
   OR UPPER(COALESCE(fn.notes, '')) LIKE '%SONOCO%';

-- REBNIC -> ton
UPDATE fiscal_notes fn
LEFT JOIN cargo_loads cl ON cl.id = fn.used_by_cargo_id
SET fn.quantity_type = 'ton'
WHERE UPPER(COALESCE(cl.destination, '')) LIKE '%REBNIC%'
   OR UPPER(COALESCE(fn.notes, '')) LIKE '%REBNIC%';

-- PASSO 3 (verificação): confira o resultado
-- SELECT fn.action_code, fn.quantity_type, fn.quantity, cl.destination
-- FROM fiscal_notes fn
-- LEFT JOIN cargo_loads cl ON cl.id = fn.used_by_cargo_id
-- ORDER BY fn.id DESC LIMIT 40;
