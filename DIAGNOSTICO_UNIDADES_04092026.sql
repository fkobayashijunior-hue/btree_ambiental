-- ============================================================
-- BTREE Ambiental — Diagnóstico de unidades no Controle de Notas
-- Execute os SELECTs no phpMyAdmin para identificar a origem do erro
-- ============================================================

-- 1) Ver o price_type de TODOS os destinos cadastrados
--    (o Controle de Notas usa este campo quando a ação não tem quantity_type)
SELECT id, name, nickname, price_type, unit, is_buyer
FROM cargo_destinations
ORDER BY name;

-- 2) Ver as últimas ações com a unidade gravada e o price_type do destino da carga
SELECT fn.id, fn.action_code, fn.invoice_number, fn.quantity_type, fn.quantity,
       cl.id AS cargo_id, cl.destination AS destino_texto, cl.destination_id,
       cd.name AS destino_cadastro, cd.price_type
FROM fiscal_notes fn
LEFT JOIN cargo_loads cl ON cl.id = fn.used_by_cargo_id
LEFT JOIN cargo_destinations cd ON cd.id = cl.destination_id
ORDER BY fn.id DESC
LIMIT 30;

-- 3) Se o destino Líder estiver com price_type errado, corrija (ajuste o ID):
-- UPDATE cargo_destinations SET price_type = 'm3', unit = 'm3' WHERE id = COLOQUE_O_ID;

-- 4) Se alguma AÇÃO específica foi gravada com quantity_type errado, corrija:
-- UPDATE fiscal_notes SET quantity_type = 'm3' WHERE action_code = 'AC-000XX';
