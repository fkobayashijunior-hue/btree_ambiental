-- ============================================================
-- FIX: Normalização de destination_id nas cargas (01/09/2026)
-- ============================================================
-- Problema: cargas gravadas com destination_id no formato antigo
-- (10000+id, da época em que compradores ficavam em tabela separada)
-- não batiam com o id real em cargo_destinations, e o relatório por
-- destino não as encontrava. Havia também cargas órfãs (sem id) e
-- 7 cargas do Jeferson Beraldo gravadas por engano com o id da SONOCO.
--
-- Este script JÁ FOI APLICADO em produção em 01/09/2026.
-- Fica aqui apenas como registro/documentação.
-- ============================================================

-- SONOCO: normalizar destination_id para 7 (id real)
UPDATE cargo_loads SET destination_id = 7 WHERE destination_id = 10007;
-- LÍDER: normalizar para 8
UPDATE cargo_loads SET destination_id = 8 WHERE destination_id = 10008;
-- REBNIC (Mauá da Serra): normalizar para 9
UPDATE cargo_loads SET destination_id = 9 WHERE destination_id = 10009;
-- ENERBIO: normalizar para 4
UPDATE cargo_loads SET destination_id = 4 WHERE destination_id = 10004;
-- BERALDO: normalizar para 13
UPDATE cargo_loads SET destination_id = 13 WHERE destination_id = 10013;
-- Jeferson Beraldo gravado com id errado da SONOCO
UPDATE cargo_loads SET destination_id = 13 WHERE destination = 'Jeferson Beraldo' AND destination_id = 7;
-- Cargas órfãs sem destination_id: vincular pelo nome
UPDATE cargo_loads SET destination_id = 4 WHERE destination_id IS NULL AND destination = 'ENERBIO Mauá';
UPDATE cargo_loads SET destination_id = 8 WHERE destination_id IS NULL AND destination = 'LÍDER';

-- Verificação:
-- SELECT destination, destination_id, COUNT(*) total FROM cargo_loads
-- WHERE destination IS NOT NULL AND destination != ''
-- GROUP BY destination, destination_id ORDER BY destination;
